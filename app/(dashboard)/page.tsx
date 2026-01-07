import { requireAuth } from '@/lib/auth'
import { Card, CardContent, CardHeader } from '@/components/ui'

export default async function DashboardPage() {
  const user = await requireAuth()

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
            <p className="text-sm text-gray-500">Total Revenue (This Month)</p>
            <p className="text-3xl font-bold text-gray-900">$0.00</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Active Clients</p>
            <p className="text-3xl font-bold text-gray-900">0</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Pending Links</p>
            <p className="text-3xl font-bold text-gray-900">0</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Recent Activity</h2>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">No recent activity yet.</p>
        </CardContent>
      </Card>
    </div>
  )
}
