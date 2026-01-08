'use client'

import { useState } from 'react'
import { Button, Card, CardContent, CardHeader } from '@/components/ui'
import { formatCurrency, formatRelativeTime } from '@/lib/utils'
import { Copy, ExternalLink, Check } from 'lucide-react'

interface PendingLink {
  id: string
  url: string
  expires_at: string | null
  purchase: {
    amount: number
    client: { id: string; name: string } | null
    program: { name: string } | null
  } | null
}

interface PendingLinksListProps {
  links: PendingLink[]
}

export function PendingLinksList({ links }: PendingLinksListProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const copyToClipboard = async (id: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  if (!links || links.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">
          Pending Links ({links.length})
        </h2>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {links.map((link) => (
            <div
              key={link.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4"
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-amber-400" />
                <div>
                  <p className="font-medium text-gray-900">
                    {link.purchase?.client?.name || 'Unknown Client'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {link.purchase?.program?.name || 'Custom'} –{' '}
                    {formatCurrency(link.purchase?.amount || 0)}
                  </p>
                  {link.expires_at && (
                    <p className="text-xs text-gray-500">
                      Expires {formatRelativeTime(new Date(link.expires_at))}
                    </p>
                  )}
                </div>
              </div>
              <div className="ml-4 flex shrink-0 gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(link.id, link.url)}
                  title="Copy link"
                >
                  {copiedId === link.id ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <a href={link.url} target="_blank" rel="noopener noreferrer">
                  <Button variant="secondary" size="sm">
                    <ExternalLink className="mr-1 h-4 w-4" />
                    Open
                  </Button>
                </a>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
