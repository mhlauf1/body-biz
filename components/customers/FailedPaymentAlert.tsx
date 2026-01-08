'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui'
import { AlertTriangle, RotateCw, CreditCard } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

interface Purchase {
  id: string
  amount: number
  status: string
  created_at: string
  program?: { name: string } | null
  custom_program_name?: string | null
}

interface FailedPaymentAlertProps {
  purchase: Purchase
  clientId: string
  onRetrySuccess?: () => void
}

export function FailedPaymentAlert({
  purchase,
  clientId,
  onRetrySuccess,
}: FailedPaymentAlertProps) {
  const router = useRouter()
  const [isRetrying, setIsRetrying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (purchase.status !== 'failed') {
    return null
  }

  const programName = purchase.program?.name || purchase.custom_program_name || 'Subscription'

  const handleRetry = async () => {
    setIsRetrying(true)
    setError(null)

    try {
      const response = await fetch('/api/payments/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchase_id: purchase.id }),
      })

      const data = await response.json()

      if (response.ok) {
        router.refresh()
        onRetrySuccess?.()
      } else {
        setError(data.error || 'Failed to retry payment')
      }
    } catch (err) {
      console.error('Error retrying payment:', err)
      setError('Failed to retry payment. Please try again.')
    } finally {
      setIsRetrying(false)
    }
  }

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 flex-shrink-0">
          <AlertTriangle className="h-5 w-5 text-red-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-red-800">Payment Failed</h3>
          <p className="mt-1 text-sm text-red-700">
            The payment of {formatCurrency(purchase.amount)} for {programName} failed on{' '}
            {formatDate(new Date(purchase.created_at))}.
          </p>

          {error && (
            <p className="mt-2 text-sm text-red-600 bg-red-100 rounded px-2 py-1">
              {error}
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={handleRetry}
              isLoading={isRetrying}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <RotateCw className={`h-4 w-4 mr-1.5 ${isRetrying ? 'animate-spin' : ''}`} />
              Retry Payment
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push(`/customers/${clientId}?tab=payment`)}
            >
              <CreditCard className="h-4 w-4 mr-1.5" />
              Update Payment Method
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
