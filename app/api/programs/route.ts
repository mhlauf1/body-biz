import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, isAdminOrManager } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for creating a program
const createProgramSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  default_price: z.number().min(0, 'Price must be non-negative'),
  is_addon: z.boolean().default(false),
  is_recurring: z.boolean().default(true),
})

/**
 * GET /api/programs
 * List programs (active only by default, all for admin/manager)
 */
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('include_inactive') === 'true'
    const search = searchParams.get('search')

    let query = supabase
      .from('programs')
      .select('*')
      .order('name')

    // Only show inactive programs to admin/manager
    if (!includeInactive || !isAdminOrManager(user)) {
      query = query.eq('is_active', true)
    }

    // Search by name
    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    const { data: programs, error } = await query

    if (error) {
      console.error('Error fetching programs:', error)
      return NextResponse.json({ error: 'Failed to fetch programs' }, { status: 500 })
    }

    return NextResponse.json({ programs })
  } catch (error) {
    console.error('Error in GET /api/programs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/programs
 * Create a new program (admin/manager only)
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admin/manager can create programs
    if (!isAdminOrManager(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validation = createProgramSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      )
    }

    const { name, default_price, is_addon, is_recurring } = validation.data
    const supabase = await createClient()

    // Check for duplicate name
    const { data: existing } = await supabase
      .from('programs')
      .select('id')
      .ilike('name', name)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'A program with this name already exists' },
        { status: 409 }
      )
    }

    // Create the program
    const { data: program, error } = await supabase
      .from('programs')
      .insert({
        name,
        default_price,
        is_addon,
        is_recurring,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating program:', error)
      return NextResponse.json({ error: 'Failed to create program' }, { status: 500 })
    }

    // Log the action
    await supabase.from('audit_log').insert({
      user_id: user.id,
      action: 'create_program',
      entity_type: 'program',
      entity_id: program.id,
      details: { name, default_price, is_addon, is_recurring },
    })

    return NextResponse.json({ program }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/programs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
