import { CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { formatCurrency, formatRelativeTime } from '@/lib/utils'

export interface ActivityItem {
  id: string
  type: 'purchase_completed' | 'subscription_renewed' | 'payment_failed'
  clientName: string
  trainerName: string
  amount: number
  programName: string | null
  createdAt: string
}

interface ActivityFeedProps {
  activities: ActivityItem[]
}

function getActivityIcon(type: ActivityItem['type']) {
  switch (type) {
    case 'purchase_completed':
      return <CheckCircle className="h-5 w-5 text-green-500" />
    case 'subscription_renewed':
      return <RefreshCw className="h-5 w-5 text-blue-500" />
    case 'payment_failed':
      return <XCircle className="h-5 w-5 text-red-500" />
  }
}

function getActivityMessage(activity: ActivityItem): string {
  const program = activity.programName || 'Custom Program'
  switch (activity.type) {
    case 'purchase_completed':
      return `${activity.clientName} completed payment for ${program}`
    case 'subscription_renewed':
      return `${activity.clientName}'s subscription renewed`
    case 'payment_failed':
      return `Payment failed for ${activity.clientName}`
  }
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <p className="text-gray-500">No recent activity yet.</p>
    )
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className="flex items-start gap-3 border-b border-gray-100 pb-3 last:border-0 last:pb-0"
        >
          <div className="mt-0.5 flex-shrink-0">
            {getActivityIcon(activity.type)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-900">
              {getActivityMessage(activity)}
            </p>
            <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
              <span>{formatCurrency(activity.amount)}</span>
              <span>&middot;</span>
              <span>{activity.trainerName}</span>
              <span>&middot;</span>
              <span>{formatRelativeTime(activity.createdAt)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
