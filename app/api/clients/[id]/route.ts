import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, isAdminOrManager } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for updating a client
const updateClientSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  email: z.string().email('Valid email is required').optional(),
  phone: z.string().optional().nullable(),
  assigned_trainer_id: z.string().uuid('Valid trainer ID is required').optional(),
  notes: z.string().optional().nullable(),
})

type RouteParams = { params: Promise<{ id: string }> }

/**
 * GET /api/clients/[id]
 * Get a single client by ID
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const supabase = await createClient()

    const { data: client, error } = await supabase
      .from('clients')
      .select(`
        *,
        assigned_trainer:users!clients_assigned_trainer_id_fkey(id, name, email, role)
      `)
      .eq('id', id)
      .single()

    if (error || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Trainers can only view their own clients
    if (!isAdminOrManager(user) && client.assigned_trainer_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json({ client })
  } catch (error) {
    console.error('Error in GET /api/clients/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/clients/[id]
 * Update a client
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const validation = updateClientSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // First, check if the client exists and user has access
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id, assigned_trainer_id')
      .eq('id', id)
      .single()

    if (!existingClient) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Trainers can only update their own clients
    if (!isAdminOrManager(user) && existingClient.assigned_trainer_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Trainers cannot reassign clients to other trainers
    if (
      !isAdminOrManager(user) &&
      validation.data.assigned_trainer_id &&
      validation.data.assigned_trainer_id !== user.id
    ) {
      return NextResponse.json(
        { error: 'You cannot reassign clients to other trainers' },
        { status: 403 }
      )
    }

    // If email is being updated, check for duplicates
    if (validation.data.email) {
      const { data: duplicateClient } = await supabase
        .from('clients')
        .select('id')
        .eq('email', validation.data.email)
        .neq('id', id)
        .single()

      if (duplicateClient) {
        return NextResponse.json(
          { error: 'A client with this email already exists' },
          { status: 409 }
        )
      }
    }

    const updateData = {
      ...validation.data,
      updated_at: new Date().toISOString(),
    }

    const { data: client, error } = await supabase
      .from('clients')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        assigned_trainer:users!clients_assigned_trainer_id_fkey(id, name, email)
      `)
      .single()

    if (error) {
      console.error('Error updating client:', error)
      return NextResponse.json({ error: 'Failed to update client' }, { status: 500 })
    }

    // Log the action
    await supabase.from('audit_log').insert({
      user_id: user.id,
      action: 'update_client',
      entity_type: 'client',
      entity_id: id,
      details: { updated_fields: Object.keys(validation.data) },
    })

    return NextResponse.json({ client })
  } catch (error) {
    console.error('Error in PATCH /api/clients/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/clients/[id]
 * Soft delete a client (set is_active to false)
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admin/manager can delete clients
    if (!isAdminOrManager(user)) {
      return NextResponse.json(
        { error: 'Only administrators can delete clients' },
        { status: 403 }
      )
    }

    const { id } = await params
    const supabase = await createClient()

    // Soft delete - set is_active to false
    const { error } = await supabase
      .from('clients')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      console.error('Error deleting client:', error)
      return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 })
    }

    // Log the action
    await supabase.from('audit_log').insert({
      user_id: user.id,
      action: 'delete_client',
      entity_type: 'client',
      entity_id: id,
      details: { soft_delete: true },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/clients/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
