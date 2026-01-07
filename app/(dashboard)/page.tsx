import { requireAuth, isAdminOrManager } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'
import { getThisMonth } from '@/lib/dateRanges'
import { DollarSign, Users, Link } from 'lucide-react'
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user.name}
        </h1>
        <p className="text-gray-600">
          Here&apos;s what&apos;s happening with your clients today.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-100 p-2">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Revenue (This Month)</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-100 p-2">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Active Clients</p>
                <p className="text-2xl font-bold text-gray-900">{activeClientsCount || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-yellow-100 p-2">
                <Link className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pending Links</p>
                <p className="text-2xl font-bold text-gray-900">{pendingLinksCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Recent Activity</h2>
        </CardHeader>
        <CardContent>
          <ActivityFeed activities={activities} />
        </CardContent>
      </Card>
    </div>
  )
}
