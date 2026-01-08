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
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircle className="h-4 w-4 text-emerald-600" />
        </div>
      )
    case 'subscription_renewed':
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-50">
          <RefreshCw className="h-4 w-4 text-sky-600" />
        </div>
      )
    case 'payment_failed':
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50">
          <XCircle className="h-4 w-4 text-red-600" />
        </div>
      )
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
    <div className="space-y-1">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className="flex items-start gap-4 py-4"
        >
          <div className="flex-shrink-0">
            {getActivityIcon(activity.type)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">
              {getActivityMessage(activity)}
            </p>
            <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
              <span className="font-medium text-gray-700">{formatCurrency(activity.amount)}</span>
              <span className="text-gray-300">&middot;</span>
              <span>{activity.trainerName}</span>
              <span className="text-gray-300">&middot;</span>
              <span>{formatRelativeTime(activity.createdAt)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
