import { requireAuth, isAdminOrManager } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { ClientList } from '@/components/clients/ClientList'

export default async function ClientsPage() {
  const user = await requireAuth()
  const supabase = await createClient()
  const userIsAdminOrManager = isAdminOrManager(user)

  // Build query based on role
  let query = supabase
    .from('clients')
    .select(`
      *,
      assigned_trainer:users!clients_assigned_trainer_id_fkey(id, name, email)
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  // Trainers only see their own clients
  if (!userIsAdminOrManager) {
    query = query.eq('assigned_trainer_id', user.id)
  }

  const { data: clients, error } = await query

  if (error) {
    console.error('Error fetching clients:', error)
  }

  // Get trainers for filter dropdown (admin/manager only)
  let trainers: { id: string; name: string }[] = []
  if (userIsAdminOrManager) {
    const { data: trainerData } = await supabase
      .from('users')
      .select('id, name')
      .eq('is_active', true)
      .order('name')

    trainers = trainerData || []
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
        <p className="text-gray-600">
          {userIsAdminOrManager
            ? 'Manage all clients across your team.'
            : 'Manage your assigned clients.'}
        </p>
      </div>

      <ClientList
        initialClients={clients || []}
        trainers={trainers}
        isAdminOrManager={userIsAdminOrManager}
      />
    </div>
  )
}
