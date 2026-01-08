import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { TeamMemberCard } from '@/components/team/TeamMemberCard'
import { TeamMemberForm } from '@/components/team/TeamMemberForm'
import { Card, CardContent, CardHeader } from '@/components/ui'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'

type PageParams = { params: Promise<{ id: string }> }

export default async function TeamMemberPage({ params }: PageParams) {
  // Only admin/manager can view team members
  await requireRole(['admin', 'manager'])
  const supabase = await createClient()
  const { id } = await params

  // Fetch team member
  const { data: member, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !member) {
    notFound()
  }

  // Fetch client count for this team member
  const { count: clientCount } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true })
    .eq('assigned_trainer_id', id)
    .eq('is_active', true)

  // Fetch recent purchases by this trainer
  const { data: recentPurchases } = await supabase
    .from('purchases')
    .select(`
      id,
      amount,
      status,
      created_at,
      client:clients(name),
      program:programs(name)
    `)
    .eq('trainer_id', id)
    .order('created_at', { ascending: false })
    .limit(5)

  // Calculate total revenue for this trainer (active purchases)
  const { data: revenuePurchases } = await supabase
    .from('purchases')
    .select('trainer_amount')
    .eq('trainer_id', id)
    .eq('status', 'active')

  const totalRevenue = revenuePurchases?.reduce(
    (sum, p) => sum + (p.trainer_amount || 0),
    0
  ) || 0

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
        href="/team"
        className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Team
      </Link>

      {/* Member Info Card */}
      <TeamMemberCard
        member={member}
        clientCount={clientCount || 0}
        totalRevenue={totalRevenue}
      />

      {/* Edit Form */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Edit Details</h2>
        <TeamMemberForm member={member} mode="edit" />
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Recent Activity</h3>
        </CardHeader>
        <CardContent>
          {!recentPurchases || recentPurchases.length === 0 ? (
            <p className="text-gray-500">No recent activity.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Customer
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
                  {recentPurchases.map((purchase) => (
                    <tr key={purchase.id}>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                        {purchase.created_at && formatDate(new Date(purchase.created_at))}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                        {(purchase.client as { name: string } | null)?.name || 'Unknown'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                        {(purchase.program as { name: string } | null)?.name || 'Custom'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                        {formatCurrency(purchase.amount)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            statusVariants[purchase.status] === 'success'
                              ? 'bg-green-100 text-green-800'
                              : statusVariants[purchase.status] === 'warning'
                              ? 'bg-yellow-100 text-yellow-800'
                              : statusVariants[purchase.status] === 'error'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {purchase.status}
                        </span>
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
