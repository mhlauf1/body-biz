import { requireAuth, isAdminOrManager } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ClientCard } from '@/components/clients/ClientCard'
import { ClientQuickActions } from '@/components/clients/ClientQuickActions'
import { Card, CardContent, CardHeader, Badge } from '@/components/ui'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'

type PageParams = { params: Promise<{ id: string }> }

export default async function ClientProfilePage({ params }: PageParams) {
  const user = await requireAuth()
  const supabase = await createClient()
  const userIsAdminOrManager = isAdminOrManager(user)
  const { id } = await params

  // Fetch client with trainer info
  const { data: client, error } = await supabase
    .from('clients')
    .select(`
      *,
      assigned_trainer:users!clients_assigned_trainer_id_fkey(id, name, email, role)
    `)
    .eq('id', id)
    .single()

  if (error || !client) {
    notFound()
  }

  // Check access - trainers can only view their own clients
  if (!userIsAdminOrManager && client.assigned_trainer_id !== user.id) {
    notFound()
  }

  // Fetch purchase history
  const { data: purchases } = await supabase
    .from('purchases')
    .select(`
      *,
      program:programs(name)
    `)
    .eq('client_id', id)
    .order('created_at', { ascending: false })

  // Get trainers for edit form
  const { data: trainers } = await supabase
    .from('users')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  // Get programs for charge modal
  const { data: programs } = await supabase
    .from('programs')
    .select('*')
    .eq('is_active', true)
    .order('name')

  // Check for any pending payment links for this client
  const { data: pendingLinks } = await supabase
    .from('payment_links')
    .select(`
      id,
      url,
      expires_at,
      purchase:purchases!inner(client_id, amount, program:programs(name))
    `)
    .eq('status', 'active')
    .eq('purchase.client_id', id)
    .order('created_at', { ascending: false })
    .limit(1)

  const pendingLink = pendingLinks?.[0] || null

  const statusVariants: Record<string, 'success' | 'warning' | 'error' | 'default' | 'info'> = {
    active: 'success',
    pending: 'warning',
    paused: 'info',
    cancelled: 'default',
    completed: 'success',
    failed: 'error',
  }

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/clients"
        className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Clients
      </Link>

      {/* Client Info Card */}
      <ClientCard
        client={client}
        trainers={trainers || []}
        currentUser={user}
        isAdminOrManager={userIsAdminOrManager}
      />

      {/* Quick Actions */}
      <ClientQuickActions
        client={client}
        programs={programs || []}
        pendingLink={pendingLink}
      />

      {/* Purchase History */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Purchase History</h3>
        </CardHeader>
        <CardContent>
          {!purchases || purchases.length === 0 ? (
            <p className="text-gray-500">No purchases yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Program
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {purchases.map((purchase) => (
                    <tr key={purchase.id}>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                        {purchase.created_at && formatDate(new Date(purchase.created_at))}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                        {purchase.program?.name || purchase.custom_program_name || 'Custom'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                        {formatCurrency(purchase.amount)}
                        {purchase.is_recurring && '/mo'}
                        {purchase.duration_months && (
                          <span className="text-gray-500">
                            {' '}
                            ({purchase.duration_months} mo)
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        <Badge variant={statusVariants[purchase.status] || 'default'}>
                          {purchase.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
