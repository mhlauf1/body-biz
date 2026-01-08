import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, isAdminOrManager } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for updating a program
const updateProgramSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255).optional(),
  default_price: z.number().min(0, 'Price must be non-negative').optional(),
  is_addon: z.boolean().optional(),
  is_recurring: z.boolean().optional(),
  is_active: z.boolean().optional(),
})

type Params = Promise<{ id: string }>

/**
 * GET /api/programs/[id]
 * Get a single program by ID
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

    const { id } = await params
    const supabase = await createClient()

    const { data: program, error } = await supabase
      .from('programs')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 })
    }

    return NextResponse.json({ program })
  } catch (error) {
    console.error('Error in GET /api/programs/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/programs/[id]
 * Update a program (admin/manager only)
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

    // Only admin/manager can update programs
    if (!isAdminOrManager(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const validation = updateProgramSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      )
    }

    const updates = validation.data
    const supabase = await createClient()

    // Check if program exists
    const { data: existingProgram, error: fetchError } = await supabase
      .from('programs')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existingProgram) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 })
    }

    // If name is being changed, check for duplicates
    if (updates.name && updates.name.toLowerCase() !== existingProgram.name.toLowerCase()) {
      const { data: nameConflict } = await supabase
        .from('programs')
        .select('id')
        .ilike('name', updates.name)
        .neq('id', id)
        .single()

      if (nameConflict) {
        return NextResponse.json(
          { error: 'A program with this name already exists' },
          { status: 409 }
        )
      }
    }

    // Update the program
    const { data: updatedProgram, error: updateError } = await supabase
      .from('programs')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating program:', updateError)
      return NextResponse.json(
        { error: 'Failed to update program' },
        { status: 500 }
      )
    }

    // Log the action
    await supabase.from('audit_log').insert({
      user_id: user.id,
      action: 'update_program',
      entity_type: 'program',
      entity_id: id,
      details: { updates, previous: existingProgram },
    })

    return NextResponse.json({ program: updatedProgram })
  } catch (error) {
    console.error('Error in PATCH /api/programs/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/programs/[id]
 * Soft delete a program (sets is_active to false)
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

    // Only admin/manager can deactivate programs
    if (!isAdminOrManager(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const supabase = await createClient()

    // Check if program exists
    const { data: existingProgram, error: fetchError } = await supabase
      .from('programs')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existingProgram) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 })
    }

    // Soft delete: set is_active to false
    const { data: deactivatedProgram, error: deleteError } = await supabase
      .from('programs')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (deleteError) {
      console.error('Error deactivating program:', deleteError)
      return NextResponse.json(
        { error: 'Failed to deactivate program' },
        { status: 500 }
      )
    }

    // Log the action
    await supabase.from('audit_log').insert({
      user_id: user.id,
      action: 'deactivate_program',
      entity_type: 'program',
      entity_id: id,
      details: { name: existingProgram.name },
    })

    return NextResponse.json({ program: deactivatedProgram })
  } catch (error) {
    console.error('Error in DELETE /api/programs/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
