import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { ProgramList } from '@/components/programs/ProgramList'

export default async function ProgramsPage() {
  // Only admin/manager can access program management
  await requireRole(['admin', 'manager'])
  const supabase = await createClient()

  // Fetch all active programs
  const { data: programs, error } = await supabase
    .from('programs')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching programs:', error)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Programs</h1>
        <p className="text-gray-600">
          Manage your service offerings and pricing templates.
        </p>
      </div>

      <ProgramList initialPrograms={programs || []} />
    </div>
  )
}
