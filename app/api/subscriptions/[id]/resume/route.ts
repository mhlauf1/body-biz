import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, isAdminOrManager } from '@/lib/auth'
import { NextResponse } from 'next/server'

type Params = Promise<{ id: string }>

/**
 * POST /api/subscriptions/[id]/resume
 * Resume a paused Stripe subscription
 */
export async function POST(
  request: Request,
  { params }: { params: Params }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: purchaseId } = await params
    const supabase = await createClient()

    // Fetch the purchase to get stripe_subscription_id
    const { data: purchase, error: fetchError } = await supabase
      .from('purchases')
      .select(`
        *,
        client:clients(id, name, assigned_trainer_id)
      `)
      .eq('id', purchaseId)
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

    // Check if actually paused
    if (purchase.status !== 'paused') {
      return NextResponse.json(
        { error: 'Subscription is not paused' },
        { status: 400 }
      )
    }

    // Resume subscription in Stripe (remove pause_collection)
    const subscription = await stripe.subscriptions.update(
      purchase.stripe_subscription_id,
      {
        pause_collection: null,
      }
    )

    // Update purchase status in database
    const { error: updateError } = await supabase
      .from('purchases')
      .update({
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', purchaseId)

    if (updateError) {
      console.error('Error updating purchase status:', updateError)
      // Don't fail - Stripe was already updated
    }

    // Log the action
    await supabase.from('audit_log').insert({
      user_id: user.id,
      action: 'resume_subscription',
      entity_type: 'purchase',
      entity_id: purchaseId,
      details: {
        client_name: purchase.client?.name,
        stripe_subscription_id: purchase.stripe_subscription_id,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Subscription resumed successfully',
      subscription: {
        id: subscription.id,
        status: subscription.status,
        current_period_end: (subscription as { current_period_end?: number }).current_period_end,
      },
    })
  } catch (error) {
    console.error('Error in POST /api/subscriptions/[id]/resume:', error)
    return NextResponse.json({ error: 'Failed to resume subscription' }, { status: 500 })
  }
}
