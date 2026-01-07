import { Card, CardContent } from '@/components/ui'
import { XCircle } from 'lucide-react'

export default function PaymentCancelledPage() {
  return (
    <div className="mx-auto max-w-lg px-4">
      <Card>
        <CardContent className="py-12 text-center">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <XCircle className="h-10 w-10 text-gray-600" />
            </div>
          </div>

          <h1 className="mt-6 text-2xl font-bold text-gray-900">
            Payment Cancelled
          </h1>

          <p className="mt-2 text-gray-600">
            Your payment was not completed. No charges have been made.
          </p>

          <p className="mt-4 text-sm text-gray-500">
            If you&apos;d like to try again, please request a new payment link from your trainer.
          </p>

          <p className="mt-6 text-sm text-gray-500">
            You can safely close this window.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
