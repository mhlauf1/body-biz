import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, isAdminOrManager } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const retrySchema = z.object({
  purchase_id: z.string().uuid('Valid purchase ID is required'),
})

/**
 * POST /api/payments/retry
 * Retry a failed payment for a subscription
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = retrySchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      )
    }

    const { purchase_id } = validation.data
    const supabase = await createClient()

    // Fetch the purchase with client info
    const { data: purchase, error: fetchError } = await supabase
      .from('purchases')
      .select(`
        *,
        client:clients(id, name, stripe_customer_id, assigned_trainer_id)
      `)
      .eq('id', purchase_id)
      .single()

    if (fetchError || !purchase) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 })
    }

    // Check access: trainers can only manage their own clients
    if (!isAdminOrManager(user) && purchase.client?.assigned_trainer_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if purchase has a subscription
    if (!purchase.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'This purchase does not have a subscription' },
        { status: 400 }
      )
    }

    // Check if purchase is actually in failed status
    if (purchase.status !== 'failed') {
      return NextResponse.json(
        { error: 'This purchase does not have a failed payment' },
        { status: 400 }
      )
    }

    // Get the subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(
      purchase.stripe_subscription_id,
      { expand: ['latest_invoice'] }
    )

    // Check if subscription has an unpaid invoice
    const latestInvoice = subscription.latest_invoice as {
      id: string
      status: string
      payment_intent?: { id: string; status: string } | string
    } | null

    if (!latestInvoice) {
      return NextResponse.json(
        { error: 'No invoice found for this subscription' },
        { status: 400 }
      )
    }

    // Try to pay the invoice if it's open or past_due
    if (latestInvoice.status === 'open' || latestInvoice.status === 'past_due') {
      try {
        const paidInvoice = await stripe.invoices.pay(latestInvoice.id)

        if (paidInvoice.status === 'paid') {
          // Update purchase status in database
          const { error: updateError } = await supabase
            .from('purchases')
            .update({
              status: 'active',
              updated_at: new Date().toISOString(),
            })
            .eq('id', purchase_id)

          if (updateError) {
            console.error('Error updating purchase status:', updateError)
          }

          // Log the action
          await supabase.from('audit_log').insert({
            user_id: user.id,
            action: 'retry_payment_success',
            entity_type: 'purchase',
            entity_id: purchase_id,
            details: {
              client_name: purchase.client?.name,
              invoice_id: paidInvoice.id,
              amount_paid: paidInvoice.amount_paid / 100,
            },
          })

          return NextResponse.json({
            success: true,
            message: 'Payment successful',
            invoice: {
              id: paidInvoice.id,
              status: paidInvoice.status,
              amount_paid: paidInvoice.amount_paid / 100,
            },
          })
        }
      } catch (stripeError: unknown) {
        const error = stripeError as { type?: string; code?: string; message?: string }
        console.error('Stripe payment retry error:', error)

        // Log the failed attempt
        await supabase.from('audit_log').insert({
          user_id: user.id,
          action: 'retry_payment_failed',
          entity_type: 'purchase',
          entity_id: purchase_id,
          details: {
            client_name: purchase.client?.name,
            error_code: error.code,
            error_message: error.message,
          },
        })

        if (error.type === 'StripeCardError') {
          return NextResponse.json(
            { error: error.message || 'Card was declined. Please update the payment method.' },
            { status: 400 }
          )
        }

        return NextResponse.json(
          { error: 'Payment failed. Please try again or update the payment method.' },
          { status: 400 }
        )
      }
    }

    // If invoice is already paid or in another state
    if (latestInvoice.status === 'paid') {
      // Update purchase status if it was incorrectly marked as failed
      await supabase
        .from('purchases')
        .update({
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', purchase_id)

      return NextResponse.json({
        success: true,
        message: 'Invoice was already paid. Status updated.',
      })
    }

    return NextResponse.json(
      { error: `Cannot retry payment. Invoice status: ${latestInvoice.status}` },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error in POST /api/payments/retry:', error)
    return NextResponse.json({ error: 'Failed to retry payment' }, { status: 500 })
  }
}
