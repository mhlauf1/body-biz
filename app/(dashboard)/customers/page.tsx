import { requireAuth, isAdminOrManager } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { ClientList } from '@/components/customers/ClientList'

export default async function ClientsPage() {
  const user = await requireAuth()
  const supabase = await createClient()
  const userIsAdminOrManager = isAdminOrManager(user)

  // Build query based on role - include purchases with program info
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

  // Trainers only see their own clients
  if (!userIsAdminOrManager) {
    query = query.eq('assigned_trainer_id', user.id)
  }

  const { data: clients, error } = await query

  if (error) {
    console.error('Error fetching clients:', error)
  }

  // Process clients to add subscription info
  const processedClients = clients?.map(client => {
    const purchases = client.purchases || []
    const sortedPurchases = [...purchases].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    const activePurchase = sortedPurchases.find(p => p.status === 'active')
    const pausedPurchase = sortedPurchases.find(p => p.status === 'paused')
    const failedPurchase = sortedPurchases.find(p => p.status === 'failed')

    const latestPurchase = activePurchase || pausedPurchase || failedPurchase || sortedPurchases[0] || null

    let subscriptionStatus: 'active' | 'paused' | 'failed' | 'none' = 'none'
    if (activePurchase) subscriptionStatus = 'active'
    else if (pausedPurchase) subscriptionStatus = 'paused'
    else if (failedPurchase) subscriptionStatus = 'failed'

    return {
      ...client,
      purchases: undefined,
      latest_purchase: latestPurchase,
      subscription_status: subscriptionStatus,
    }
  }) || []

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
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <p className="text-gray-600">
          {userIsAdminOrManager
            ? 'Manage all customers across your team.'
            : 'Manage your assigned customers.'}
        </p>
      </div>

      <ClientList
        initialClients={processedClients}
        trainers={trainers}
        isAdminOrManager={userIsAdminOrManager}
      />
    </div>
  )
}
