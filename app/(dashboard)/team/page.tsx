import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { TeamList } from '@/components/team/TeamList'

export default async function TeamPage() {
  // Only admin/manager can access team management
  await requireRole(['admin', 'manager'])
  const supabase = await createClient()

  // Fetch all team members
  const { data: members, error } = await supabase
    .from('users')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching team members:', error)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Team</h1>
        <p className="text-gray-600">
          Manage your trainers and staff members.
        </p>
      </div>

      <TeamList initialMembers={members || []} />
    </div>
  )
}
