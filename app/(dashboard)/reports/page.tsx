import { requireRole } from '@/lib/auth'
import { getCurrentPayPeriod } from '@/lib/dateRanges'
import { CommissionTable } from '@/components/reports/CommissionTable'

export default async function ReportsPage() {
  // Admin/Manager only - redirects if not authorized
  await requireRole(['admin', 'manager'])

  // Get default date range (current pay period)
  const initialRange = getCurrentPayPeriod()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Commission Reports</h1>
        <p className="text-gray-600">
          Track revenue and commissions by trainer. Select a pay period to view the breakdown.
        </p>
      </div>

      <CommissionTable initialRange={initialRange} />
    </div>
  )
}
