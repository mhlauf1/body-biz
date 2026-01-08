import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getCurrentUser, isAdminOrManager } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { Database } from '@/types/database'

// Admin client for creating auth users (bypasses RLS)
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Validation schema for creating a team member
const createTeamMemberSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  email: z.string().email('Valid email is required'),
  phone: z.string().nullable().optional(),
  role: z.enum(['admin', 'manager', 'trainer']),
  commission_rate: z.number().min(0).max(1).optional(),
})

/**
 * GET /api/team
 * List all team members (admin/manager only)
 */
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admin/manager can access team management
    if (!isAdminOrManager(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const role = searchParams.get('role')
    const includeInactive = searchParams.get('include_inactive') === 'true'

    let query = supabase
      .from('users')
      .select('*')
      .order('name', { ascending: true })

    // Filter by active status (default: only active)
    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    // Filter by role
    if (role && ['admin', 'manager', 'trainer'].includes(role)) {
      query = query.eq('role', role)
    }

    // Search by name or email
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    const { data: members, error } = await query

    if (error) {
      console.error('Error fetching team members:', error)
      return NextResponse.json({ error: 'Failed to fetch team members' }, { status: 500 })
    }

    return NextResponse.json({ data: members })
  } catch (error) {
    console.error('Error in GET /api/team:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/team
 * Create a new team member
 * - Creates auth user via Supabase Admin API
 * - Creates corresponding record in public.users
 * - Sends invite email for password setup
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admin/manager can create team members
    if (!isAdminOrManager(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validation = createTeamMemberSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      )
    }

    const { name, email, phone, role, commission_rate } = validation.data

    // Determine commission rate based on role if not provided
    const finalCommissionRate = commission_rate ?? (role === 'admin' ? 1.0 : 0.7)

    // Check if user with this email already exists in public.users
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'A team member with this email already exists' },
        { status: 409 }
      )
    }

    // Create auth user via Admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true, // Skip email confirmation for admin-created users
      user_metadata: { name, role },
    })

    if (authError) {
      console.error('Error creating auth user:', authError)
      // Check for specific error types
      if (authError.message.includes('already been registered')) {
        return NextResponse.json(
          { error: 'A user with this email already exists in the auth system' },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      )
    }

    // Create user record in public.users table
    const { data: newMember, error: insertError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        name,
        phone: phone || null,
        role,
        commission_rate: finalCommissionRate,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating user record:', insertError)
      // Clean up: delete auth user if record creation failed
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: 'Failed to create team member record' },
        { status: 500 }
      )
    }

    // Generate password reset link for the new user to set their password
    const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email,
    })

    if (resetError) {
      console.error('Error generating invite link:', resetError)
      // Don't fail the request, just log - user can use "forgot password" later
    }

    // Log the action
    await supabaseAdmin.from('audit_log').insert({
      user_id: user.id,
      action: 'create_team_member',
      entity_type: 'user',
      entity_id: newMember.id,
      details: { name, email, role, commission_rate: finalCommissionRate },
    })

    return NextResponse.json({
      data: newMember,
      invite_link: resetData?.properties?.action_link || null,
    }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/team:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
