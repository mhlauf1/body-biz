import { requireAuth, isAdminOrManager } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'
import { getThisMonth } from '@/lib/dateRanges'
import { ActivityFeed, type ActivityItem } from '@/components/dashboard/ActivityFeed'

export default async function DashboardPage() {
  const user = await requireAuth()
  const supabase = await createClient()
  const userIsAdminOrManager = isAdminOrManager(user)

  // Get date range for this month
  const { start: monthStart, end: monthEnd } = getThisMonth()

  // Query 1: Total Revenue (This Month)
  let revenueQuery = supabase
    .from('purchases')
    .select('amount')
    .in('status', ['active', 'completed'])
    .gte('created_at', monthStart.toISOString())
    .lte('created_at', monthEnd.toISOString())

  if (!userIsAdminOrManager) {
    revenueQuery = revenueQuery.eq('trainer_id', user.id)
  }

  const { data: revenueData } = await revenueQuery
  const totalRevenue = revenueData?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0

  // Query 2: Active Clients Count
  let clientsQuery = supabase
    .from('clients')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)

  if (!userIsAdminOrManager) {
    clientsQuery = clientsQuery.eq('assigned_trainer_id', user.id)
  }

  const { count: activeClientsCount } = await clientsQuery

  // Query 3: Pending Payment Links Count
  const { data: pendingLinksData } = await supabase
    .from('payment_links')
    .select('id, purchase:purchases!fk_payment_links_purchase(trainer_id)')
    .eq('status', 'active')

  // Filter pending links by trainer if not admin/manager
  let pendingLinksCount = pendingLinksData?.length || 0
  if (!userIsAdminOrManager && pendingLinksData) {
    pendingLinksCount = pendingLinksData.filter(
      (link) => {
        const purchase = link.purchase as { trainer_id: string } | null
        return purchase?.trainer_id === user.id
      }
    ).length
  }

  // Query 4: Recent Activity (purchases)
  let activityQuery = supabase
    .from('purchases')
    .select(`
      id,
      status,
      amount,
      updated_at,
      client:clients!purchases_client_id_fkey(name),
      trainer:users!purchases_trainer_id_fkey(name),
      program:programs!purchases_program_id_fkey(name)
    `)
    .in('status', ['active', 'completed', 'failed'])
    .order('updated_at', { ascending: false })
    .limit(10)

  if (!userIsAdminOrManager) {
    activityQuery = activityQuery.eq('trainer_id', user.id)
  }

  const { data: activityData } = await activityQuery

  // Transform to ActivityItem format
  const activities: ActivityItem[] = (activityData || []).map((purchase) => {
    // Determine activity type based on status
    let type: ActivityItem['type'] = 'purchase_completed'
    if (purchase.status === 'failed') {
      type = 'payment_failed'
    }
    // Note: For subscription renewals, we'd need to check audit_log
    // For MVP, we treat all active/completed as new purchases

    return {
      id: purchase.id,
      type,
      clientName: (purchase.client as { name: string } | null)?.name || 'Unknown Client',
      trainerName: (purchase.trainer as { name: string } | null)?.name || 'Unknown Trainer',
      amount: purchase.amount || 0,
      programName: (purchase.program as { name: string } | null)?.name || null,
      createdAt: purchase.updated_at || new Date().toISOString(),
    }
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Overview
        </h1>
      </div>

      {/* Borderless Stats */}
      <div className="grid gap-8 md:grid-cols-3">
        <div>
          <p className="text-sm font-medium text-gray-500">
            Revenue <span className="text-gray-400">· This month</span>
          </p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
          <p className="mt-1 text-sm text-gray-400">$0.00 previous period</p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">Active Customers</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{activeClientsCount || 0}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">Pending Links</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{pendingLinksCount}</p>
        </div>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        </CardHeader>
        <CardContent>
          <ActivityFeed activities={activities} />
        </CardContent>
      </Card>
    </div>
  )
}
