import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { Database } from '@/types/database'

// Use service role key for webhook handler (bypasses RLS)
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events
 */
export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    console.error('Missing stripe-signature header')
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let event: any

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object)
        break

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

/**
 * Handle checkout.session.completed
 * Updates purchase status, marks payment link as used, stores Stripe customer ID
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleCheckoutSessionCompleted(session: any) {
  const purchaseId = session.metadata?.purchase_id
  const clientId = session.metadata?.client_id

  if (!purchaseId || !clientId) {
    console.error('Missing metadata in checkout session:', session.id)
    return
  }

  console.log(`Processing completed checkout for purchase ${purchaseId}`)

  // Get or create Stripe customer ID
  const stripeCustomerId = session.customer as string | null

  // If subscription mode, get subscription ID
  const subscriptionId = session.subscription as string | null

  // Update purchase status to active
  const { error: purchaseError } = await supabaseAdmin
    .from('purchases')
    .update({
      status: 'active',
      stripe_subscription_id: subscriptionId,
      stripe_payment_intent_id: session.payment_intent as string | null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', purchaseId)

  if (purchaseError) {
    console.error('Error updating purchase:', purchaseError)
  }

  // Mark payment link as used
  const { error: linkError } = await supabaseAdmin
    .from('payment_links')
    .update({
      status: 'used',
      used_at: new Date().toISOString(),
    })
    .eq('stripe_checkout_session_id', session.id)

  if (linkError) {
    console.error('Error updating payment link:', linkError)
  }

  // Store Stripe customer ID on client record
  if (stripeCustomerId && clientId) {
    const { error: clientError } = await supabaseAdmin
      .from('clients')
      .update({
        stripe_customer_id: stripeCustomerId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', clientId)

    if (clientError) {
      console.error('Error updating client:', clientError)
    }
  }

  // Log the event
  await supabaseAdmin.from('audit_log').insert({
    action: 'checkout_completed',
    entity_type: 'purchase',
    entity_id: purchaseId,
    details: {
      session_id: session.id,
      customer_id: stripeCustomerId,
      subscription_id: subscriptionId,
      amount_total: session.amount_total,
    },
  })

  console.log(`Checkout completed for purchase ${purchaseId}`)
}

/**
 * Handle invoice.paid
 * Logs successful subscription renewal payments
 * Note: First invoice (subscription_create) is handled by checkout.session.completed
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleInvoicePaid(invoice: any) {
  const subscriptionId = invoice.subscription as string | null
  const billingReason = invoice.billing_reason as string | null

  if (!subscriptionId) return

  // Skip first invoice - it's handled by checkout.session.completed
  // Only process subscription renewals (subscription_cycle) and updates
  if (billingReason === 'subscription_create') {
    console.log(`Skipping first invoice for subscription ${subscriptionId} (handled by checkout.session.completed)`)
    return
  }

  // Find purchase by subscription ID
  const { data: purchase } = await supabaseAdmin
    .from('purchases')
    .select('id, client_id, trainer_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single()

  if (!purchase) {
    console.log(`No purchase found for subscription ${subscriptionId}`)
    return
  }

  // Get client info for logging
  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('name, email')
    .eq('id', purchase.client_id)
    .single()

  // Log the successful renewal payment
  await supabaseAdmin.from('audit_log').insert({
    action: 'subscription_renewed',
    entity_type: 'purchase',
    entity_id: purchase.id,
    details: {
      invoice_id: invoice.id,
      subscription_id: subscriptionId,
      billing_reason: billingReason,
      amount_paid: invoice.amount_paid,
      period_start: invoice.period_start,
      period_end: invoice.period_end,
      client_name: client?.name,
      client_email: client?.email,
    },
  })

  console.log(`Subscription renewal processed for ${client?.name || purchase.client_id} - ${subscriptionId}`)
}

/**
 * Handle invoice.payment_failed
 * Updates purchase status to failed
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleInvoicePaymentFailed(invoice: any) {
  const subscriptionId = invoice.subscription as string | null

  if (!subscriptionId) return

  // Find and update purchase
  const { data: purchase, error: fetchError } = await supabaseAdmin
    .from('purchases')
    .select('id')
    .eq('stripe_subscription_id', subscriptionId)
    .single()

  if (fetchError || !purchase) {
    console.log(`No purchase found for subscription ${subscriptionId}`)
    return
  }

  const { error: updateError } = await supabaseAdmin
    .from('purchases')
    .update({
      status: 'failed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', purchase.id)

  if (updateError) {
    console.error('Error updating purchase status:', updateError)
  }

  // Log the failure
  await supabaseAdmin.from('audit_log').insert({
    action: 'payment_failed',
    entity_type: 'purchase',
    entity_id: purchase.id,
    details: {
      invoice_id: invoice.id,
      subscription_id: subscriptionId,
      attempt_count: invoice.attempt_count,
    },
  })

  console.log(`Payment failed for subscription ${subscriptionId}`)
}

/**
 * Handle customer.subscription.deleted
 * Updates purchase status when subscription is cancelled
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleSubscriptionDeleted(subscription: any) {
  // Find and update purchase
  const { data: purchase, error: fetchError } = await supabaseAdmin
    .from('purchases')
    .select('id')
    .eq('stripe_subscription_id', subscription.id)
    .single()

  if (fetchError || !purchase) {
    console.log(`No purchase found for subscription ${subscription.id}`)
    return
  }

  const { error: updateError } = await supabaseAdmin
    .from('purchases')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', purchase.id)

  if (updateError) {
    console.error('Error updating purchase status:', updateError)
  }

  // Log the cancellation
  await supabaseAdmin.from('audit_log').insert({
    action: 'subscription_cancelled',
    entity_type: 'purchase',
    entity_id: purchase.id,
    details: {
      subscription_id: subscription.id,
      canceled_at: subscription.canceled_at,
    },
  })

  console.log(`Subscription ${subscription.id} cancelled`)
}
