'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Badge, Card, CardContent, Modal } from '@/components/ui'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { User, UserRole } from '@/types'
import { Mail, Phone, UserCog, Calendar, Users, DollarSign, Trash2, RefreshCw } from 'lucide-react'

interface TeamMemberCardProps {
  member: User
  clientCount: number
  totalRevenue: number
}

export function TeamMemberCard({
  member,
  clientCount,
  totalRevenue,
}: TeamMemberCardProps) {
  const router = useRouter()
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false)
  const [isReactivating, setIsReactivating] = useState(false)
  const [isDeactivating, setIsDeactivating] = useState(false)

  const handleDeactivate = async () => {
    setIsDeactivating(true)
    try {
      const response = await fetch(`/api/team/${member.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        router.push('/team')
        router.refresh()
      }
    } catch (error) {
      console.error('Error deactivating team member:', error)
    } finally {
      setIsDeactivating(false)
      setIsDeactivateModalOpen(false)
    }
  }

  const handleReactivate = async () => {
    setIsReactivating(true)
    try {
      const response = await fetch(`/api/team/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: true }),
      })

      if (response.ok) {
        router.refresh()
      }
    } catch (error) {
      console.error('Error reactivating team member:', error)
    } finally {
      setIsReactivating(false)
    }
  }

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'info'
      case 'manager':
        return 'warning'
      case 'trainer':
        return 'default'
      default:
        return 'default'
    }
  }

  const formatCommissionRate = (rate: number) => {
    return `${Math.round(rate * 100)}%`
  }

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                <UserCog className="h-8 w-8 text-gray-600" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-gray-900">{member.name}</h2>
                  <Badge variant={getRoleBadgeVariant(member.role as UserRole)}>
                    {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                  </Badge>
                  {!member.is_active && (
                    <Badge variant="error">Inactive</Badge>
                  )}
                </div>
                <div className="mt-2 space-y-1 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <a href={`mailto:${member.email}`} className="hover:text-gray-900">
                      {member.email}
                    </a>
                  </div>
                  {member.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <a href={`tel:${member.phone}`} className="hover:text-gray-900">
                        {member.phone}
                      </a>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Team member since{' '}
                      {member.created_at && formatDate(new Date(member.created_at))}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="mt-4 flex gap-6">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">
                      <span className="font-medium text-gray-900">{clientCount}</span>{' '}
                      <span className="text-gray-500">
                        {clientCount === 1 ? 'customer' : 'customers'}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">
                      <span className="font-medium text-gray-900">
                        {formatCurrency(totalRevenue)}
                      </span>{' '}
                      <span className="text-gray-500">active revenue</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">Commission:</span>
                    <span className="font-medium text-gray-900">
                      {formatCommissionRate(member.commission_rate)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              {!member.is_active ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleReactivate}
                  isLoading={isReactivating}
                >
                  <RefreshCw className="mr-1 h-4 w-4" />
                  Reactivate
                </Button>
              ) : (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setIsDeactivateModalOpen(true)}
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  Deactivate
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deactivate Confirmation Modal */}
      <Modal
        isOpen={isDeactivateModalOpen}
        onClose={() => setIsDeactivateModalOpen(false)}
        title="Deactivate Team Member"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to deactivate <strong>{member.name}</strong>?
          </p>
          <p className="text-sm text-gray-500">
            They will no longer be able to log in. Their clients and purchase history will be
            preserved. You can reactivate them later.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setIsDeactivateModalOpen(false)}
              disabled={isDeactivating}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeactivate}
              isLoading={isDeactivating}
            >
              Deactivate
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
