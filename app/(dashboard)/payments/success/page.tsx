import Link from 'next/link'
import { Button, Card, CardContent } from '@/components/ui'
import { CheckCircle } from 'lucide-react'

export default function PaymentSuccessPage() {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Card>
        <CardContent className="py-12 text-center">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
          </div>

          <h1 className="mt-6 text-2xl font-bold text-gray-900">
            Payment Successful!
          </h1>

          <p className="mt-2 text-gray-600">
            Thank you for your payment. Your subscription is now active.
          </p>

          <div className="mt-8 flex justify-center gap-3">
            <Link href="/payments">
              <Button variant="secondary">View Payments</Button>
            </Link>
            <Link href="/">
              <Button>Go to Dashboard</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
