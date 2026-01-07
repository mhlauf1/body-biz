import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, isAdminOrManager } from '@/lib/auth'
import { stripe } from '@/lib/stripe'
import { calcCommission } from '@/lib/utils'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { UserRole } from '@/types'

const checkoutSchema = z.object({
  client_id: z.string().uuid('Valid client ID is required'),
  program_id: z.string().uuid('Valid program ID is required').optional(),
  custom_program_name: z.string().optional(),
  trainer_id: z.string().uuid('Valid trainer ID is required'),
  amount: z.number().positive('Amount must be positive'),
  duration_months: z.number().int().positive().optional(), // null for one-time or ongoing
  is_recurring: z.boolean().default(true),
  expires_days: z.number().int().min(1).max(30).default(7),
})

/**
 * POST /api/payments/checkout
 * Create a Stripe Checkout Session and payment link
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = checkoutSchema.safeParse(body)

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
      trainer_id,
      amount,
      duration_months,
      is_recurring,
      expires_days,
    } = validation.data

    const supabase = await createClient()

    // Verify client exists and user has access
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', client_id)
      .single()

    if (clientError || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Trainers can only create links for their own clients
    if (!isAdminOrManager(user) && client.assigned_trainer_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get trainer info for commission calculation
    const { data: trainer, error: trainerError } = await supabase
      .from('users')
      .select('id, name, role')
      .eq('id', trainer_id)
      .single()

    if (trainerError || !trainer) {
      return NextResponse.json({ error: 'Trainer not found' }, { status: 404 })
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
    const endDate = duration_months
      ? new Date(startDate.getTime() + duration_months * 30 * 24 * 60 * 60 * 1000)
      : null

    // Create purchase record (pending)
    const { data: purchase, error: purchaseError } = await supabase
      .from('purchases')
      .insert({
        client_id,
        trainer_id,
        program_id: program_id || null,
        custom_program_name: custom_program_name || null,
        amount,
        duration_months: duration_months || null,
        is_recurring,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate ? endDate.toISOString().split('T')[0] : null,
        status: 'pending',
        trainer_commission_rate: commission.trainerCommissionRate,
        trainer_amount: commission.trainerAmount,
        owner_amount: commission.ownerAmount,
      })
      .select()
      .single()

    if (purchaseError || !purchase) {
      console.error('Error creating purchase:', purchaseError)
      return NextResponse.json({ error: 'Failed to create purchase' }, { status: 500 })
    }

    // Build line items for Stripe
    const productName = program?.name || custom_program_name || 'Custom Program'
    const lineItems: { price_data: object; quantity: number }[] = []

    if (is_recurring) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: productName,
            description: duration_months
              ? `${duration_months} month${duration_months > 1 ? 's' : ''}`
              : 'Ongoing subscription',
          },
          unit_amount: Math.round(amount * 100), // cents
          recurring: { interval: 'month' as const },
        },
        quantity: 1,
      })
    } else {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: productName,
          },
          unit_amount: Math.round(amount * 100), // cents
        },
        quantity: 1,
      })
    }

    // Create Stripe Checkout Session
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const expiresAt = Math.floor(Date.now() / 1000) + expires_days * 24 * 60 * 60

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sessionConfig: any = {
      mode: is_recurring ? 'subscription' : 'payment',
      customer_email: client.email,
      line_items: lineItems,
      metadata: {
        purchase_id: purchase.id,
        client_id: client.id,
        trainer_id: trainer.id,
      },
      success_url: `${appUrl}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/payments/cancelled`,
      expires_at: expiresAt,
    }

    // Add subscription data for recurring payments
    if (is_recurring) {
      sessionConfig.subscription_data = {
        metadata: {
          purchase_id: purchase.id,
          client_id: client.id,
          trainer_id: trainer.id,
        },
      }
      // Cancel subscription after duration_months if specified
      if (duration_months) {
        sessionConfig.subscription_data.metadata.duration_months = String(duration_months)
      }
    } else {
      // For one-time payments, save card for future use
      sessionConfig.payment_intent_data = {
        setup_future_usage: 'off_session',
        metadata: {
          purchase_id: purchase.id,
          client_id: client.id,
          trainer_id: trainer.id,
        },
      }
    }

    const session = await stripe.checkout.sessions.create(sessionConfig)

    // Create payment link record
    const { data: paymentLink, error: linkError } = await supabase
      .from('payment_links')
      .insert({
        purchase_id: purchase.id,
        url: session.url!,
        stripe_checkout_session_id: session.id,
        status: 'active',
        expires_at: new Date(expiresAt * 1000).toISOString(),
        created_by: user.id,
      })
      .select()
      .single()

    if (linkError) {
      console.error('Error creating payment link:', linkError)
    }

    // Update purchase with link reference
    await supabase
      .from('purchases')
      .update({
        stripe_checkout_session_id: session.id,
        payment_link_id: paymentLink?.id,
      })
      .eq('id', purchase.id)

    // Log the action
    await supabase.from('audit_log').insert({
      user_id: user.id,
      action: 'create_payment_link',
      entity_type: 'payment_link',
      entity_id: paymentLink?.id,
      details: {
        client_id,
        purchase_id: purchase.id,
        amount,
        program: productName,
      },
    })

    return NextResponse.json({
      url: session.url,
      session_id: session.id,
      purchase_id: purchase.id,
      expires_at: new Date(expiresAt * 1000).toISOString(),
    })
  } catch (error) {
    console.error('Error in POST /api/payments/checkout:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
