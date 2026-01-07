import { requireAuth, isAdminOrManager } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button, Card, CardContent, CardHeader, Badge } from '@/components/ui'
import { PendingLinksList } from '@/components/payments/PendingLinksList'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus } from 'lucide-react'

export default async function PaymentsPage() {
  const user = await requireAuth()
  const supabase = await createClient()
  const userIsAdminOrManager = isAdminOrManager(user)

  // Fetch recent purchases
  let purchaseQuery = supabase
    .from('purchases')
    .select(`
      *,
      client:clients(id, name, email),
      trainer:users!purchases_trainer_id_fkey(id, name),
      program:programs(name)
    `)
    .order('created_at', { ascending: false })
    .limit(20)

  // Trainers only see their own purchases
  if (!userIsAdminOrManager) {
    purchaseQuery = purchaseQuery.eq('trainer_id', user.id)
  }

  const { data: purchases } = await purchaseQuery

  // Fetch pending payment links
  const linkQuery = supabase
    .from('payment_links')
    .select(`
      *,
      purchase:purchases(
        id,
        amount,
        client:clients(id, name, email),
        trainer:users!purchases_trainer_id_fkey(id, name),
        program:programs(name)
      )
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  const { data: pendingLinks } = await linkQuery

  // Filter pending links for trainers (through purchase -> trainer relationship)
  const filteredLinks = userIsAdminOrManager
    ? pendingLinks
    : pendingLinks?.filter((link) => link.purchase?.trainer?.id === user.id)

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-600">
            {userIsAdminOrManager
              ? 'View all transactions and manage payment links.'
              : 'View your transactions and payment links.'}
          </p>
        </div>
        <Link href="/payments/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Payment Link
          </Button>
        </Link>
      </div>

      {/* Pending Links */}
      <PendingLinksList links={filteredLinks || []} />

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Recent Transactions</h2>
        </CardHeader>
        <CardContent>
          {!purchases || purchases.length === 0 ? (
            <p className="text-gray-500">No transactions yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Client
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Program
                    </th>
                    {userIsAdminOrManager && (
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Trainer
                      </th>
                    )}
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
                    <tr key={purchase.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                        {purchase.created_at && formatDate(new Date(purchase.created_at))}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <Link
                          href={`/clients/${purchase.client?.id}`}
                          className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                        >
                          {purchase.client?.name || 'Unknown'}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                        {purchase.program?.name || purchase.custom_program_name || 'Custom'}
                      </td>
                      {userIsAdminOrManager && (
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                          {purchase.trainer?.name || 'Unknown'}
                        </td>
                      )}
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                        {formatCurrency(purchase.amount)}
                        {purchase.is_recurring && '/mo'}
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
