'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button, Card, CardContent, CardHeader } from '@/components/ui'
import { NewChargeModal } from '@/components/payments/NewChargeModal'
import { CreditCard, Link as LinkIcon } from 'lucide-react'
import type { Client, Program, User } from '@/types'

type ClientWithTrainer = Client & {
  assigned_trainer: Pick<User, 'id' | 'name' | 'role'> | null
}

interface ClientQuickActionsProps {
  client: ClientWithTrainer
  programs: Program[]
}

export function ClientQuickActions({ client, programs }: ClientQuickActionsProps) {
  const router = useRouter()
  const [isChargeModalOpen, setIsChargeModalOpen] = useState(false)

  const hasPaymentMethod = !!client.stripe_customer_id

  const handleChargeSuccess = () => {
    // Refresh the page to show the new purchase
    router.refresh()
  }

  return (
    <>
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Quick Actions</h3>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {hasPaymentMethod ? (
              <Button onClick={() => setIsChargeModalOpen(true)}>
                <CreditCard className="mr-2 h-4 w-4" />
                New Charge
              </Button>
            ) : (
              <Link href={`/payments/new?client_id=${client.id}`}>
                <Button>
                  <LinkIcon className="mr-2 h-4 w-4" />
                  Send Payment Link
                </Button>
              </Link>
            )}
            <Link href={`/payments/new?client_id=${client.id}`}>
              <Button variant="secondary">
                <LinkIcon className="mr-2 h-4 w-4" />
                Create Payment Link
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {hasPaymentMethod && (
        <NewChargeModal
          isOpen={isChargeModalOpen}
          onClose={() => setIsChargeModalOpen(false)}
          onSuccess={handleChargeSuccess}
          client={client}
          programs={programs}
        />
      )}
    </>
  )
}
