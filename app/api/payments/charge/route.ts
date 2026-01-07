import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, isAdminOrManager } from '@/lib/auth'
import { stripe } from '@/lib/stripe'
import { calcCommission } from '@/lib/utils'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { UserRole } from '@/types'

const chargeSchema = z.object({
  client_id: z.string().uuid('Valid client ID is required'),
  program_id: z.string().uuid('Valid program ID is required').optional(),
  custom_program_name: z.string().optional(),
  amount: z.number().positive('Amount must be positive'),
  duration_months: z.number().int().min(0).max(12), // 0 = ongoing
  payment_method_id: z.string().min(1, 'Payment method is required'),
})

/**
 * POST /api/payments/charge
 * Charge a saved payment method for an existing client
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = chargeSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      )
    }

    const {
      client_id,
      program_id,
      custom_program_name,
      amount,
      duration_months,
      payment_method_id,
    } = validation.data

    const supabase = await createClient()

    // Fetch client with trainer info
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*, assigned_trainer:users!clients_assigned_trainer_id_fkey(id, name, role)')
      .eq('id', client_id)
      .single()

    if (clientError || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Trainers can only charge their own clients
    if (!isAdminOrManager(user) && client.assigned_trainer_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Client must have a Stripe customer ID
    if (!client.stripe_customer_id) {
      return NextResponse.json(
        { error: 'Client does not have a saved payment method. Use a payment link instead.' },
        { status: 400 }
      )
    }

    // Get trainer info for commission calculation
    const trainer = client.assigned_trainer
    if (!trainer) {
      return NextResponse.json({ error: 'Client has no assigned trainer' }, { status: 400 })
    }

    // Get program info if provided
    let program = null
    if (program_id) {
      const { data: programData } = await supabase
        .from('programs')
        .select('*')
        .eq('id', program_id)
        .single()
      program = programData
    }

    // Calculate commission
    const commission = calcCommission(amount, trainer.role as UserRole)

    // Calculate dates
    const startDate = new Date()
    const isOngoing = duration_months === 0
    const endDate = isOngoing
      ? null
      : new Date(startDate.getTime() + duration_months * 30 * 24 * 60 * 60 * 1000)

    // Build product name
    const productName = program?.name || custom_program_name || 'Custom Program'

    // Create Stripe Price for the subscription
    const price = await stripe.prices.create({
      currency: 'usd',
      unit_amount: Math.round(amount * 100), // cents
      recurring: { interval: 'month' },
      product_data: {
        name: productName,
        metadata: {
          client_id: client.id,
          trainer_id: trainer.id,
        },
      },
    })

    // Build subscription config
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subscriptionConfig: any = {
      customer: client.stripe_customer_id,
      items: [{ price: price.id }],
      default_payment_method: payment_method_id,
      metadata: {
        client_id: client.id,
        trainer_id: trainer.id,
        duration_months: String(duration_months),
      },
    }

    // For fixed-term, set cancel_at date
    if (!isOngoing && endDate) {
      subscriptionConfig.cancel_at = Math.floor(endDate.getTime() / 1000)
    }

    // Create Stripe Subscription
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let subscription: any
    try {
      subscription = await stripe.subscriptions.create(subscriptionConfig)
    } catch (stripeError: unknown) {
      // Handle Stripe-specific errors
      const error = stripeError as { type?: string; code?: string; message?: string }
      console.error('Stripe error:', error)

      if (error.type === 'StripeCardError') {
        // Card was declined
        const message = error.code === 'card_declined'
          ? 'The card was declined. Please try a different payment method.'
          : error.message || 'Payment failed. Please try again.'
        return NextResponse.json({ error: message }, { status: 400 })
      }

      if (error.code === 'insufficient_funds') {
        return NextResponse.json(
          { error: 'Insufficient funds. Please try a different payment method.' },
          { status: 400 }
        )
      }

      throw stripeError // Re-throw unexpected errors
    }

    // Create purchase record
    const { data: purchase, error: purchaseError } = await supabase
      .from('purchases')
      .insert({
        client_id,
        trainer_id: trainer.id,
        program_id: program_id || null,
        custom_program_name: custom_program_name || null,
        amount,
        duration_months: isOngoing ? null : duration_months,
        is_recurring: true,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate ? endDate.toISOString().split('T')[0] : null,
        status: 'active',
        stripe_subscription_id: subscription.id,
        trainer_commission_rate: commission.trainerCommissionRate,
        trainer_amount: commission.trainerAmount,
        owner_amount: commission.ownerAmount,
      })
      .select()
      .single()

    if (purchaseError || !purchase) {
      console.error('Error creating purchase:', purchaseError)
      // Try to cancel the subscription since we couldn't record it
      await stripe.subscriptions.cancel(subscription.id)
      return NextResponse.json({ error: 'Failed to create purchase record' }, { status: 500 })
    }

    // Log the action
    await supabase.from('audit_log').insert({
      user_id: user.id,
      action: 'charge_saved_card',
      entity_type: 'purchase',
      entity_id: purchase.id,
      details: {
        client_id,
        subscription_id: subscription.id,
        amount,
        program: productName,
        duration_months,
        trainer_amount: commission.trainerAmount,
        owner_amount: commission.ownerAmount,
      },
    })

    return NextResponse.json({
      success: true,
      purchase_id: purchase.id,
      subscription_id: subscription.id,
      amount,
      duration_months: isOngoing ? 'ongoing' : duration_months,
      next_billing_date: new Date(subscription.current_period_end * 1000).toISOString(),
    })
  } catch (error) {
    console.error('Error in POST /api/payments/charge:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
