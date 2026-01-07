'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input, Select, Card, CardContent, CardFooter } from '@/components/ui'
import type { User, Client } from '@/types'

interface ClientFormProps {
  trainers: Pick<User, 'id' | 'name'>[]
  currentUser: User
  isAdminOrManager: boolean
  client?: Client & { assigned_trainer: Pick<User, 'id' | 'name'> | null }
  mode: 'create' | 'edit'
}

interface FormErrors {
  name?: string
  email?: string
  phone?: string
  assigned_trainer_id?: string
  notes?: string
}

export function ClientForm({
  trainers,
  currentUser,
  isAdminOrManager,
  client,
  mode,
}: ClientFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [serverError, setServerError] = useState('')

  const [formData, setFormData] = useState({
    name: client?.name || '',
    email: client?.email || '',
    phone: client?.phone || '',
    assigned_trainer_id: client?.assigned_trainer_id || currentUser.id,
    notes: client?.notes || '',
  })

  const trainerOptions = isAdminOrManager
    ? trainers.map((t) => ({ value: t.id, label: t.name }))
    : [{ value: currentUser.id, label: currentUser.name }]

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }

    if (!formData.assigned_trainer_id) {
      newErrors.assigned_trainer_id = 'Trainer is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setServerError('')

    if (!validateForm()) return

    setIsLoading(true)

    try {
      const url = mode === 'create' ? '/api/clients' : `/api/clients/${client?.id}`
      const method = mode === 'create' ? 'POST' : 'PATCH'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim() || null,
          assigned_trainer_id: formData.assigned_trainer_id,
          notes: formData.notes.trim() || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setServerError(data.error || 'Something went wrong')
        return
      }

      // Redirect to client profile or list
      router.push(mode === 'create' ? `/clients/${data.client.id}` : `/clients/${client?.id}`)
      router.refresh()
    } catch (error) {
      console.error('Error submitting form:', error)
      setServerError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Clear error when user types
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardContent className="space-y-4 pt-6">
          {serverError && (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
              {serverError}
            </div>
          )}

          <Input
            label="Name *"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            error={errors.name}
            placeholder="John Doe"
          />

          <Input
            label="Email *"
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            error={errors.email}
            placeholder="john@example.com"
          />

          <Input
            label="Phone"
            id="phone"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleChange}
            error={errors.phone}
            placeholder="(614) 555-1234"
          />

          <Select
            label="Assigned Trainer *"
            id="assigned_trainer_id"
            name="assigned_trainer_id"
            options={trainerOptions}
            value={formData.assigned_trainer_id}
            onChange={handleChange}
            error={errors.assigned_trainer_id}
            disabled={!isAdminOrManager}
          />

          <div className="space-y-1">
            <label
              htmlFor="notes"
              className="block text-sm font-medium text-gray-700"
            >
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              value={formData.notes}
              onChange={handleChange}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Any additional notes about this client..."
            />
          </div>
        </CardContent>

        <CardFooter className="flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.back()}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            {mode === 'create' ? 'Create Client' : 'Save Changes'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
