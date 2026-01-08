import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { Database } from '@/types/database'
import { sendWelcomeReceiptEmail } from '@/lib/email'

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
 *
 * CRITICAL: This handler throws on critical failures so webhook returns 500
 * and Stripe will retry. Non-critical failures (email, audit) are logged but don't throw.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleCheckoutSessionCompleted(session: any) {
  const purchaseId = session.metadata?.purchase_id
  const clientId = session.metadata?.client_id

  if (!purchaseId || !clientId) {
    console.error('Missing metadata in checkout session:', session.id)
    // Throw so Stripe retries - we can't process without metadata
    throw new Error(`Missing metadata in checkout session: ${session.id}`)
  }

  console.log(`Processing completed checkout for purchase ${purchaseId}`)

  // Get or create Stripe customer ID
  const stripeCustomerId = session.customer as string | null

  // If subscription mode, get subscription ID
  const subscriptionId = session.subscription as string | null

  // CRITICAL: Update purchase status to active
  // This MUST succeed - throw if it fails so Stripe retries
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
    console.error('CRITICAL: Error updating purchase:', purchaseError)
    throw new Error(`Failed to update purchase ${purchaseId}: ${purchaseError.message}`)
  }

  // CRITICAL: Mark payment link as used
  // This MUST succeed to prevent double-use of links
  const { error: linkError } = await supabaseAdmin
    .from('payment_links')
    .update({
      status: 'used',
      used_at: new Date().toISOString(),
    })
    .eq('stripe_checkout_session_id', session.id)

  if (linkError) {
    console.error('CRITICAL: Error updating payment link:', linkError)
    throw new Error(`Failed to mark payment link as used for session ${session.id}: ${linkError.message}`)
  }

  // NON-CRITICAL: Store Stripe customer ID on client record
  // Nice to have for future charges, but not essential for this transaction
  if (stripeCustomerId && clientId) {
    const { error: clientError } = await supabaseAdmin
      .from('clients')
      .update({
        stripe_customer_id: stripeCustomerId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', clientId)

    if (clientError) {
      // Log but don't throw - customer ID can be set on next transaction
      console.error('Non-critical: Error updating client stripe_customer_id:', clientError)
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

  // Send welcome email to client
  try {
    // Fetch purchase details with joins
    const { data: purchaseDetails } = await supabaseAdmin
      .from('purchases')
      .select(`
        id,
        amount,
        duration_months,
        start_date,
        custom_program_name,
        client:clients!purchases_client_id_fkey(id, name, email),
        trainer:users!purchases_trainer_id_fkey(id, name),
        program:programs!purchases_program_id_fkey(id, name)
      `)
      .eq('id', purchaseId)
      .single()

    if (purchaseDetails) {
      // Get card last 4 from Stripe (if customer exists)
      let cardLast4: string | null = null
      if (stripeCustomerId) {
        try {
          const paymentMethods = await stripe.paymentMethods.list({
            customer: stripeCustomerId,
            type: 'card',
            limit: 1,
          })
          cardLast4 = paymentMethods.data[0]?.card?.last4 || null
        } catch (err) {
          console.error('Could not fetch card details:', err)
        }
      }

      const client = purchaseDetails.client as { id: string; name: string; email: string } | null
      const trainer = purchaseDetails.trainer as { id: string; name: string } | null
      const program = purchaseDetails.program as { id: string; name: string } | null

      if (client?.email) {
        const emailResult = await sendWelcomeReceiptEmail({
          clientName: client.name || 'Valued Client',
          clientEmail: client.email,
          programName: program?.name || purchaseDetails.custom_program_name || 'Personal Training',
          trainerName: trainer?.name || 'Your Trainer',
          amount: purchaseDetails.amount || 0,
          durationMonths: purchaseDetails.duration_months,
          startDate: purchaseDetails.start_date ? new Date(purchaseDetails.start_date) : new Date(),
          cardLast4,
        })

        if (!emailResult.success) {
          // Log email failure to audit_log (but don't fail the webhook)
          await supabaseAdmin.from('audit_log').insert({
            action: 'email_failed',
            entity_type: 'purchase',
            entity_id: purchaseId,
            details: {
              email_type: 'welcome_receipt',
              error: emailResult.error,
              client_email: client.email,
            },
          })
        }
      }
    }
  } catch (emailError) {
    // Email failure should not fail the webhook
    console.error('Failed to send welcome email:', emailError)
    await supabaseAdmin.from('audit_log').insert({
      action: 'email_failed',
      entity_type: 'purchase',
      entity_id: purchaseId,
      details: {
        email_type: 'welcome_receipt',
        error: emailError instanceof Error ? emailError.message : 'Unknown error',
      },
    })
  }

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
 *
 * CRITICAL: Throws on failure so Stripe retries
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
    // This is OK - might be a subscription we don't track
    console.log(`No purchase found for subscription ${subscriptionId}`)
    return
  }

  // CRITICAL: Update purchase status
  const { error: updateError } = await supabaseAdmin
    .from('purchases')
    .update({
      status: 'failed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', purchase.id)

  if (updateError) {
    console.error('CRITICAL: Error updating purchase status to failed:', updateError)
    throw new Error(`Failed to update purchase ${purchase.id} status: ${updateError.message}`)
  }

  // Log the failure (non-critical)
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
 *
 * CRITICAL: Throws on failure so Stripe retries
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
    // This is OK - might be a subscription we don't track
    console.log(`No purchase found for subscription ${subscription.id}`)
    return
  }

  // CRITICAL: Update purchase status
  const { error: updateError } = await supabaseAdmin
    .from('purchases')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', purchase.id)

  if (updateError) {
    console.error('CRITICAL: Error updating purchase status to cancelled:', updateError)
    throw new Error(`Failed to update purchase ${purchase.id} to cancelled: ${updateError.message}`)
  }

  // Log the cancellation (non-critical)
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
