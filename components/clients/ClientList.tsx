'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge, Button, Input, Select } from '@/components/ui'
import { formatRelativeTime } from '@/lib/utils'
import type { Client, User } from '@/types'
import { Mail, Phone, User as UserIcon } from 'lucide-react'

type ClientWithTrainer = Client & {
  assigned_trainer: Pick<User, 'id' | 'name' | 'email'> | null
}

interface ClientListProps {
  initialClients: ClientWithTrainer[]
  trainers: Pick<User, 'id' | 'name'>[]
  isAdminOrManager: boolean
}

export function ClientList({
  initialClients,
  trainers,
  isAdminOrManager,
}: ClientListProps) {
  const [clients, setClients] = useState(initialClients)
  const [search, setSearch] = useState('')
  const [selectedTrainer, setSelectedTrainer] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const fetchClients = async (searchTerm: string, trainerId: string) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.set('search', searchTerm)
      if (trainerId) params.set('trainer_id', trainerId)

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
    // Debounce search
    const timeoutId = setTimeout(() => {
      fetchClients(value, selectedTrainer)
    }, 300)
    return () => clearTimeout(timeoutId)
  }

  const handleTrainerFilter = (value: string) => {
    setSelectedTrainer(value)
    fetchClients(search, value)
  }

  const trainerOptions = [
    { value: '', label: 'All Trainers' },
    ...trainers.map((t) => ({ value: t.id, label: t.name })),
  ]

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-4">
          <div className="max-w-xs flex-1">
            <Input
              placeholder="Search clients..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          {isAdminOrManager && (
            <div className="w-48">
              <Select
                options={trainerOptions}
                value={selectedTrainer}
                onChange={(e) => handleTrainerFilter(e.target.value)}
                placeholder="Filter by trainer"
              />
            </div>
          )}
        </div>
        <Link href="/clients/new">
          <Button>+ Add Client</Button>
        </Link>
      </div>

      {/* Client Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Client
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Contact
              </th>
              {isAdminOrManager && (
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Trainer
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Added
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {isLoading ? (
              <tr>
                <td colSpan={isAdminOrManager ? 5 : 4} className="px-6 py-12 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : clients.length === 0 ? (
              <tr>
                <td colSpan={isAdminOrManager ? 5 : 4} className="px-6 py-12 text-center text-gray-500">
                  No clients found
                </td>
              </tr>
            ) : (
              clients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4">
                    <Link href={`/clients/${client.id}`} className="block">
                      <div className="flex items-center">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100">
                          <UserIcon className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div className="ml-4">
                          <div className="font-medium text-gray-900">
                            {client.name}
                          </div>
                          {client.stripe_customer_id && (
                            <Badge variant="success" className="mt-1">
                              Card on file
                            </Badge>
                          )}
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex flex-col gap-1 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Mail className="h-4 w-4" />
                        {client.email}
                      </div>
                      {client.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-4 w-4" />
                          {client.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  {isAdminOrManager && (
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                      {client.assigned_trainer?.name || 'Unassigned'}
                    </td>
                  )}
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {client.created_at && formatRelativeTime(new Date(client.created_at))}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <Link href={`/clients/${client.id}`}>
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-500">
        Showing {clients.length} client{clients.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}
