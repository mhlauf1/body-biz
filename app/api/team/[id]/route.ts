import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getCurrentUser, isAdminOrManager } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { Database } from '@/types/database'

// Admin client for operations that need to bypass RLS
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Validation schema for updating a team member
const updateTeamMemberSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255).optional(),
  email: z.string().email('Valid email is required').optional(),
  phone: z.string().nullable().optional(),
  role: z.enum(['admin', 'manager', 'trainer']).optional(),
  commission_rate: z.number().min(0).max(1).optional(),
  is_active: z.boolean().optional(),
})

type Params = Promise<{ id: string }>

/**
 * GET /api/team/[id]
 * Get a single team member by ID
 */
export async function GET(
  request: Request,
  { params }: { params: Params }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admin/manager can view team members
    if (!isAdminOrManager(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const supabase = await createServerClient()

    const { data: member, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !member) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
    }

    return NextResponse.json({ data: member })
  } catch (error) {
    console.error('Error in GET /api/team/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/team/[id]
 * Update a team member
 */
export async function PATCH(
  request: Request,
  { params }: { params: Params }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admin/manager can update team members
    if (!isAdminOrManager(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const validation = updateTeamMemberSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      )
    }

    const updates = validation.data

    // Check if team member exists
    const { data: existingMember, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existingMember) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
    }

    // If email is being changed, check for duplicates
    if (updates.email && updates.email !== existingMember.email) {
      const { data: emailConflict } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', updates.email)
        .neq('id', id)
        .single()

      if (emailConflict) {
        return NextResponse.json(
          { error: 'A team member with this email already exists' },
          { status: 409 }
        )
      }

      // Also update auth user email
      const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
        id,
        { email: updates.email }
      )

      if (authUpdateError) {
        console.error('Error updating auth email:', authUpdateError)
        return NextResponse.json(
          { error: 'Failed to update email' },
          { status: 500 }
        )
      }
    }

    // Update the user record
    const { data: updatedMember, error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating team member:', updateError)
      return NextResponse.json(
        { error: 'Failed to update team member' },
        { status: 500 }
      )
    }

    // Log the action
    await supabaseAdmin.from('audit_log').insert({
      user_id: user.id,
      action: 'update_team_member',
      entity_type: 'user',
      entity_id: id,
      details: { updates, previous: existingMember },
    })

    return NextResponse.json({ data: updatedMember })
  } catch (error) {
    console.error('Error in PATCH /api/team/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/team/[id]
 * Soft delete a team member (sets is_active to false)
 */
export async function DELETE(
  request: Request,
  { params }: { params: Params }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admin/manager can deactivate team members
    if (!isAdminOrManager(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    // Prevent self-deactivation
    if (id === user.id) {
      return NextResponse.json(
        { error: 'You cannot deactivate your own account' },
        { status: 400 }
      )
    }

    // Check if team member exists
    const { data: existingMember, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existingMember) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
    }

    // Soft delete: set is_active to false
    const { data: deactivatedMember, error: deleteError } = await supabaseAdmin
      .from('users')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (deleteError) {
      console.error('Error deactivating team member:', deleteError)
      return NextResponse.json(
        { error: 'Failed to deactivate team member' },
        { status: 500 }
      )
    }

    // Log the action
    await supabaseAdmin.from('audit_log').insert({
      user_id: user.id,
      action: 'deactivate_team_member',
      entity_type: 'user',
      entity_id: id,
      details: { name: existingMember.name, email: existingMember.email },
    })

    return NextResponse.json({ data: deactivatedMember })
  } catch (error) {
    console.error('Error in DELETE /api/team/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
