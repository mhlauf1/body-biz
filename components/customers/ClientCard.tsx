'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Badge, Card, CardContent, Modal } from '@/components/ui'
import { ClientForm } from './ClientForm'
import { formatDate } from '@/lib/utils'
import type { Client, User } from '@/types'
import { Mail, Phone, User as UserIcon, CreditCard, Calendar, Edit, Trash2 } from 'lucide-react'

type ClientWithTrainer = Client & {
  assigned_trainer: Pick<User, 'id' | 'name' | 'role'> | null
}

interface ClientCardProps {
  client: ClientWithTrainer
  trainers: Pick<User, 'id' | 'name'>[]
  currentUser: User
  isAdminOrManager: boolean
}

export function ClientCard({
  client,
  trainers,
  currentUser,
  isAdminOrManager,
}: ClientCardProps) {
  const router = useRouter()
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/clients/${client.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        router.push('/customers')
        router.refresh()
      }
    } catch (error) {
      console.error('Error deleting client:', error)
    } finally {
      setIsDeleting(false)
      setIsDeleteModalOpen(false)
    }
  }

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100">
                <UserIcon className="h-8 w-8 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{client.name}</h2>
                <div className="mt-2 space-y-1 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <a href={`mailto:${client.email}`} className="hover:text-indigo-600">
                      {client.email}
                    </a>
                  </div>
                  {client.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <a href={`tel:${client.phone}`} className="hover:text-indigo-600">
                        {client.phone}
                      </a>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4" />
                    <span>Trainer: {client.assigned_trainer?.name || 'Unassigned'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Client since {client.created_at && formatDate(new Date(client.created_at))}</span>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  {client.stripe_customer_id ? (
                    <Badge variant="success">
                      <CreditCard className="mr-1 h-3 w-3" />
                      Card on file
                    </Badge>
                  ) : (
                    <Badge variant="warning">No payment method</Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsEditModalOpen(true)}
              >
                <Edit className="mr-1 h-4 w-4" />
                Edit
              </Button>
              {isAdminOrManager && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setIsDeleteModalOpen(true)}
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  Delete
                </Button>
              )}
            </div>
          </div>

          {/* Notes Section */}
          {client.notes && (
            <div className="mt-6 border-t pt-4">
              <h3 className="text-sm font-medium text-gray-700">Notes</h3>
              <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">
                {client.notes}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Client"
      >
        <ClientForm
          trainers={trainers}
          currentUser={currentUser}
          isAdminOrManager={isAdminOrManager}
          client={client}
          mode="edit"
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Client"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete <strong>{client.name}</strong>? This action
            cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={isDeleting}
            >
              Delete Client
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
