'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge, Button, Input, Select } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'
import type { Client, User } from '@/types'
import { User as UserIcon } from 'lucide-react'

interface Purchase {
  id: string
  amount: number
  status: string
  is_recurring: boolean
  duration_months: number | null
  stripe_subscription_id: string | null
  created_at: string
  program: { id: string; name: string } | null
}

type ClientWithDetails = Client & {
  assigned_trainer: Pick<User, 'id' | 'name' | 'email'> | null
  latest_purchase: Purchase | null
  subscription_status: 'active' | 'paused' | 'failed' | 'none'
}

interface ClientListProps {
  initialClients: ClientWithDetails[]
  trainers: Pick<User, 'id' | 'name'>[]
  isAdminOrManager: boolean
}

type SubscriptionStatus = 'all' | 'active' | 'paused' | 'failed' | 'none'

export function ClientList({
  initialClients,
  trainers,
  isAdminOrManager,
}: ClientListProps) {
  const [clients, setClients] = useState(initialClients)
  const [search, setSearch] = useState('')
  const [selectedTrainer, setSelectedTrainer] = useState('')
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatus>('all')
  const [isLoading, setIsLoading] = useState(false)

  const fetchClients = async (searchTerm: string, trainerId: string, status: SubscriptionStatus) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.set('search', searchTerm)
      if (trainerId) params.set('trainer_id', trainerId)
      if (status !== 'all') params.set('status', status)

      const response = await fetch(`/api/clients?${params.toString()}`)
      const data = await response.json()

      if (response.ok) {
        setClients(data.clients)
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = (value: string) => {
    setSearch(value)
    const timeoutId = setTimeout(() => {
      fetchClients(value, selectedTrainer, statusFilter)
    }, 300)
    return () => clearTimeout(timeoutId)
  }

  const handleTrainerFilter = (value: string) => {
    setSelectedTrainer(value)
    fetchClients(search, value, statusFilter)
  }

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value as SubscriptionStatus)
    fetchClients(search, selectedTrainer, value as SubscriptionStatus)
  }

  const getStatusBadge = (status: 'active' | 'paused' | 'failed' | 'none') => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Active</Badge>
      case 'paused':
        return <Badge variant="warning">Paused</Badge>
      case 'failed':
        return <Badge variant="error">Failed</Badge>
      case 'none':
        return <Badge variant="default">No subscription</Badge>
    }
  }

  const getProgramDisplay = (purchase: Purchase | null) => {
    if (!purchase) return 'No active program'

    const programName = purchase.program?.name || 'Custom Program'
    const amount = formatCurrency(purchase.amount)
    const duration = purchase.duration_months
      ? `${purchase.duration_months}mo`
      : 'ongoing'

    return `${programName} • ${amount}/mo${purchase.duration_months ? ` (${duration})` : ''}`
  }

  const getRowBackground = (status: 'active' | 'paused' | 'failed' | 'none') => {
    switch (status) {
      case 'failed':
        return 'bg-red-50/50'
      case 'paused':
        return 'bg-amber-50/50'
      default:
        return ''
    }
  }

  const trainerOptions = [
    { value: '', label: 'All Trainers' },
    ...trainers.map((t) => ({ value: t.id, label: t.name })),
  ]

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'active', label: 'Active' },
    { value: 'paused', label: 'Paused' },
    { value: 'failed', label: 'Failed' },
    { value: 'none', label: 'No subscription' },
  ]

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-3 flex-wrap">
          <div className="w-64">
            <Input
              placeholder="Search customers..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <div className="w-40">
            <Select
              options={statusOptions}
              value={statusFilter}
              onChange={(e) => handleStatusFilter(e.target.value)}
            />
          </div>
          {isAdminOrManager && (
            <div className="w-40">
              <Select
                options={trainerOptions}
                value={selectedTrainer}
                onChange={(e) => handleTrainerFilter(e.target.value)}
              />
            </div>
          )}
        </div>
        <Link href="/customers/new">
          <Button>+ Add Customer</Button>
        </Link>
      </div>

      {/* Customer Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Customer
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Program
              </th>
              {isAdminOrManager && (
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trainer
                </th>
              )}
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td colSpan={isAdminOrManager ? 4 : 3} className="px-4 py-12 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : clients.length === 0 ? (
              <tr>
                <td colSpan={isAdminOrManager ? 4 : 3} className="px-4 py-12 text-center text-gray-500">
                  No customers found
                </td>
              </tr>
            ) : (
              clients.map((client) => (
                <tr
                  key={client.id}
                  className={`hover:bg-gray-50 transition-colors ${getRowBackground(client.subscription_status)}`}
                >
                  {/* Customer Column - Name + Status Badge */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 flex-shrink-0">
                        <UserIcon className="h-4 w-4 text-gray-500" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/customers/${client.id}`}
                            className="font-medium text-gray-900 hover:text-gray-600 truncate"
                          >
                            {client.name}
                          </Link>
                          {getStatusBadge(client.subscription_status)}
                        </div>
                        {client.stripe_customer_id && (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Card on file
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Program Column */}
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-700">
                      {getProgramDisplay(client.latest_purchase)}
                    </div>
                  </td>

                  {/* Trainer Column (admin/manager only) */}
                  {isAdminOrManager && (
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {client.assigned_trainer?.name || 'Unassigned'}
                    </td>
                  )}

                  {/* Actions Column */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {/* Manage Subscription - Only for active/paused subscriptions */}
                      {(client.subscription_status === 'active' || client.subscription_status === 'paused') &&
                       client.latest_purchase?.stripe_subscription_id && (
                        <Link href={`/customers/${client.id}?tab=subscription`}>
                          <Button variant="secondary" size="sm">
                            Manage Subscription
                          </Button>
                        </Link>
                      )}

                      {/* View Details - Always shown */}
                      <Link href={`/customers/${client.id}`}>
                        <Button variant="ghost" size="sm">
                          View Details
                        </Button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-500">
        Showing {clients.length} customer{clients.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}
