'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Modal } from '@/components/ui'
import { Pause, Play, X, AlertCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface Purchase {
  id: string
  amount: number
  status: string
  stripe_subscription_id: string | null
  program?: { name: string } | null
  custom_program_name?: string | null
}

interface SubscriptionActionsProps {
  purchase: Purchase
  clientName: string
  onActionComplete?: () => void
}

export function SubscriptionActions({
  purchase,
  clientName,
  onActionComplete,
}: SubscriptionActionsProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const [cancelModal, setCancelModal] = useState(false)

  const hasSubscription = !!purchase.stripe_subscription_id
  const isActive = purchase.status === 'active'
  const isPaused = purchase.status === 'paused'
  const canManage = hasSubscription && (isActive || isPaused)

  const programName = purchase.program?.name || purchase.custom_program_name || 'Subscription'

  const handlePause = async () => {
    setIsLoading('pause')
    try {
      const response = await fetch(`/api/subscriptions/${purchase.id}/pause`, {
        method: 'POST',
      })

      if (response.ok) {
        router.refresh()
        onActionComplete?.()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to pause subscription')
      }
    } catch (error) {
      console.error('Error pausing subscription:', error)
      alert('Failed to pause subscription')
    } finally {
      setIsLoading(null)
    }
  }

  const handleResume = async () => {
    setIsLoading('resume')
    try {
      const response = await fetch(`/api/subscriptions/${purchase.id}/resume`, {
        method: 'POST',
      })

      if (response.ok) {
        router.refresh()
        onActionComplete?.()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to resume subscription')
      }
    } catch (error) {
      console.error('Error resuming subscription:', error)
      alert('Failed to resume subscription')
    } finally {
      setIsLoading(null)
    }
  }

  const handleCancel = async () => {
    setIsLoading('cancel')
    try {
      const response = await fetch(`/api/subscriptions/${purchase.id}/cancel`, {
        method: 'POST',
      })

      if (response.ok) {
        setCancelModal(false)
        router.refresh()
        onActionComplete?.()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to cancel subscription')
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error)
      alert('Failed to cancel subscription')
    } finally {
      setIsLoading(null)
    }
  }

  if (!canManage) {
    return null
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {isActive && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handlePause}
            isLoading={isLoading === 'pause'}
            disabled={!!isLoading}
          >
            <Pause className="h-4 w-4 mr-1.5" />
            Pause Subscription
          </Button>
        )}

        {isPaused && (
          <Button
            variant="primary"
            size="sm"
            onClick={handleResume}
            isLoading={isLoading === 'resume'}
            disabled={!!isLoading}
          >
            <Play className="h-4 w-4 mr-1.5" />
            Resume Subscription
          </Button>
        )}

        <Button
          variant="danger"
          size="sm"
          onClick={() => setCancelModal(true)}
          disabled={!!isLoading}
        >
          <X className="h-4 w-4 mr-1.5" />
          Cancel Subscription
        </Button>
      </div>

      {/* Cancel Confirmation Modal */}
      <Modal
        isOpen={cancelModal}
        onClose={() => setCancelModal(false)}
        title="Cancel Subscription"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-gray-600">
                Are you sure you want to cancel the subscription for{' '}
                <span className="font-medium text-gray-900">{clientName}</span>?
              </p>
              <p className="mt-1 text-sm text-gray-500">This action cannot be undone.</p>
            </div>
          </div>

          <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
            <p className="font-medium text-gray-700">Current subscription:</p>
            <p>{programName} • {formatCurrency(purchase.amount)}/mo</p>
          </div>

          <p className="text-sm text-gray-500">
            The customer will not be charged again and their access will end at the current billing period.
          </p>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => setCancelModal(false)}
              disabled={isLoading === 'cancel'}
            >
              Keep Subscription
            </Button>
            <Button
              variant="danger"
              onClick={handleCancel}
              isLoading={isLoading === 'cancel'}
            >
              Cancel Subscription
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
