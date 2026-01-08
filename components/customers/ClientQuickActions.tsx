'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button, Card, CardContent, CardHeader } from '@/components/ui'
import { NewChargeModal } from '@/components/payments/NewChargeModal'
import { CreditCard, Link as LinkIcon, Copy, Check, ExternalLink } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { Client, Program, User } from '@/types'

type ClientWithTrainer = Client & {
  assigned_trainer: Pick<User, 'id' | 'name' | 'role'> | null
}

interface PendingLink {
  id: string
  url: string
  expires_at: string | null
  purchase: {
    amount: number
    program: { name: string } | null
  } | null
}

interface ClientQuickActionsProps {
  client: ClientWithTrainer
  programs: Program[]
  pendingLink?: PendingLink | null
}

export function ClientQuickActions({ client, programs, pendingLink }: ClientQuickActionsProps) {
  const router = useRouter()
  const [isChargeModalOpen, setIsChargeModalOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const hasPaymentMethod = !!client.stripe_customer_id

  const handleChargeSuccess = () => {
    // Refresh the page to show the new purchase
    router.refresh()
  }

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Quick Actions</h3>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Show pending link if exists */}
          {pendingLink && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-800">
                    Pending Payment Link
                  </p>
                  <p className="text-sm text-yellow-700">
                    {pendingLink.purchase?.program?.name || 'Custom'} –{' '}
                    {formatCurrency(pendingLink.purchase?.amount || 0)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(pendingLink.url)}
                    title="Copy link"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <a href={pendingLink.url} target="_blank" rel="noopener noreferrer">
                    <Button variant="secondary" size="sm">
                      <ExternalLink className="mr-1 h-4 w-4" />
                      Open
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {hasPaymentMethod ? (
              <Button onClick={() => setIsChargeModalOpen(true)}>
                <CreditCard className="mr-2 h-4 w-4" />
                New Charge
              </Button>
            ) : (
              <Link href={`/create-link?customer_id=${client.id}`}>
                <Button>
                  <LinkIcon className="mr-2 h-4 w-4" />
                  Send Payment Link
                </Button>
              </Link>
            )}
            <Link href={`/create-link?customer_id=${client.id}`}>
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
