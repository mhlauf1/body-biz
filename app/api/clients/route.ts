import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, isAdminOrManager } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for creating a client
const createClientSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().nullable().optional(),
  assigned_trainer_id: z.string().uuid('Valid trainer ID is required'),
  notes: z.string().nullable().optional(),
})

/**
 * GET /api/clients
 * List all clients (filtered by role - trainers only see their own)
 * Includes latest purchase/subscription info for each client
 * Supports pagination with limit and offset
 */
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.slice(0, 255) // Limit search length
    const trainerId = searchParams.get('trainer_id')
    const statusFilter = searchParams.get('status') // active, paused, failed, none

    // Pagination params with sensible defaults and limits
    const limit = Math.min(
      Math.max(parseInt(searchParams.get('limit') || '50', 10) || 50, 1),
      100 // Max 100 items per page
    )
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0)

    let query = supabase
      .from('clients')
      .select(`
        *,
        assigned_trainer:users!clients_assigned_trainer_id_fkey(id, name, email),
        purchases(
          id,
          amount,
          status,
          is_recurring,
          duration_months,
          stripe_subscription_id,
          created_at,
          program:programs(id, name)
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Trainers can only see their own clients
    if (!isAdminOrManager(user)) {
      query = query.eq('assigned_trainer_id', user.id)
    } else if (trainerId) {
      // Admin/manager can filter by trainer
      query = query.eq('assigned_trainer_id', trainerId)
    }

    // Search by name or email
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    const { data: clients, error } = await query

    if (error) {
      console.error('Error fetching clients:', error)
      return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 })
    }

    // Process clients to add latest_purchase and subscription_status
    const processedClients = clients?.map(client => {
      // Get all purchases sorted by created_at desc
      const purchases = client.purchases || []
      const sortedPurchases = [...purchases].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

      // Find the most relevant purchase (active > paused > failed > others)
      const activePurchase = sortedPurchases.find(p => p.status === 'active')
      const pausedPurchase = sortedPurchases.find(p => p.status === 'paused')
      const failedPurchase = sortedPurchases.find(p => p.status === 'failed')

      const latestPurchase = activePurchase || pausedPurchase || failedPurchase || sortedPurchases[0] || null

      // Determine subscription status
      let subscriptionStatus: 'active' | 'paused' | 'failed' | 'none' = 'none'
      if (activePurchase) subscriptionStatus = 'active'
      else if (pausedPurchase) subscriptionStatus = 'paused'
      else if (failedPurchase) subscriptionStatus = 'failed'

      return {
        ...client,
        purchases: undefined, // Remove full purchases array from response
        latest_purchase: latestPurchase,
        subscription_status: subscriptionStatus,
      }
    }) || []

    // Filter by subscription status if requested
    let filteredClients = processedClients
    if (statusFilter && ['active', 'paused', 'failed', 'none'].includes(statusFilter)) {
      filteredClients = processedClients.filter(c => c.subscription_status === statusFilter)
    }

    return NextResponse.json({
      clients: filteredClients,
      pagination: {
        limit,
        offset,
        count: filteredClients.length,
        hasMore: filteredClients.length === limit, // May have more if we got a full page
      },
    })
  } catch (error) {
    console.error('Error in GET /api/clients:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/clients
 * Create a new client
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = createClientSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      )
    }

    const { name, email, phone, assigned_trainer_id, notes } = validation.data

    // Trainers can only assign clients to themselves
    if (!isAdminOrManager(user) && assigned_trainer_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only create clients assigned to yourself' },
        { status: 403 }
      )
    }

    const supabase = await createClient()

    // Check if client with this email already exists
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id')
      .eq('email', email)
      .single()

    if (existingClient) {
      return NextResponse.json(
        { error: 'A client with this email already exists' },
        { status: 409 }
      )
    }

    const { data: client, error } = await supabase
      .from('clients')
      .insert({
        name,
        email,
        phone: phone || null,
        assigned_trainer_id,
        notes: notes || null,
      })
      .select(`
        *,
        assigned_trainer:users!clients_assigned_trainer_id_fkey(id, name, email)
      `)
      .single()

    if (error) {
      console.error('Error creating client:', error)
      // Handle unique constraint violation (race condition with check above)
      if (error.code === '23505' || error.message?.includes('duplicate key')) {
        return NextResponse.json(
          { error: 'A client with this email already exists' },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: 'Failed to create client' }, { status: 500 })
    }

    // Log the action
    await supabase.from('audit_log').insert({
      user_id: user.id,
      action: 'create_client',
      entity_type: 'client',
      entity_id: client.id,
      details: { name, email, assigned_trainer_id },
    })

    return NextResponse.json({ client }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/clients:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
