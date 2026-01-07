import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Database } from '@/types/database'

type User = Database['public']['Tables']['users']['Row']

/**
 * Get the currently authenticated user with their profile data
 * Returns null if not authenticated
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) return null

  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()

  return user
}

/**
 * Require authentication - redirects to login if not authenticated
 * Use this in server components/pages that require auth
 */
export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return user
}

/**
 * Require specific role(s) - redirects if user doesn't have required role
 * Use this to protect admin/manager only pages
 */
export async function requireRole(
  allowedRoles: ('admin' | 'manager' | 'trainer')[]
): Promise<User> {
  const user = await requireAuth()

  if (!allowedRoles.includes(user.role as 'admin' | 'manager' | 'trainer')) {
    redirect('/')
  }

  return user
}

/**
 * Check if user is admin or manager
 */
export function isAdminOrManager(user: User): boolean {
  return user.role === 'admin' || user.role === 'manager'
}
