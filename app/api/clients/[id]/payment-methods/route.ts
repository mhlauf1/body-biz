import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, isAdminOrManager } from '@/lib/auth'
import { stripe } from '@/lib/stripe'
import { NextResponse } from 'next/server'

type RouteParams = { params: Promise<{ id: string }> }

/**
 * GET /api/clients/[id]/payment-methods
 * Fetch saved payment methods (cards) for a client from Stripe
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const supabase = await createClient()

    // Fetch client
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, stripe_customer_id, assigned_trainer_id')
      .eq('id', id)
      .single()

    if (clientError || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Check access - trainers can only view their own clients
    if (!isAdminOrManager(user) && client.assigned_trainer_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Check if client has a Stripe customer ID
    if (!client.stripe_customer_id) {
      return NextResponse.json({ payment_methods: [] })
    }

    // Fetch payment methods from Stripe
    const paymentMethods = await stripe.paymentMethods.list({
      customer: client.stripe_customer_id,
      type: 'card',
    })

    // Transform to safe format (don't expose full card details)
    const cards = paymentMethods.data.map((pm) => ({
      id: pm.id,
      brand: pm.card?.brand || 'unknown',
      last4: pm.card?.last4 || '****',
      exp_month: pm.card?.exp_month,
      exp_year: pm.card?.exp_year,
    }))

    return NextResponse.json({ payment_methods: cards })
  } catch (error) {
    console.error('Error fetching payment methods:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
