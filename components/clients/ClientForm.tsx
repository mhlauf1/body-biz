'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button, Input, Select, Card, CardContent, CardFooter } from '@/components/ui'
import { AlertCircle } from 'lucide-react'
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
  const [serverError, setServerError] = useState<{ message: string; type?: 'duplicate_email' | 'error' } | null>(null)

  // Refs for auto-focusing error fields
  const nameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)

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

    // Focus on first error field
    if (newErrors.name) {
      nameRef.current?.focus()
    } else if (newErrors.email) {
      emailRef.current?.focus()
    }

    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setServerError(null)

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
        // Handle specific error types
        if (response.status === 409) {
          // Duplicate email
          setServerError({ message: 'A client with this email already exists.', type: 'duplicate_email' })
          setErrors((prev) => ({ ...prev, email: 'This email is already in use' }))
          emailRef.current?.focus()
        } else if (response.status === 400 && data.error?.includes('email')) {
          // Email validation error
          setErrors((prev) => ({ ...prev, email: data.error }))
          emailRef.current?.focus()
        } else if (response.status === 400 && data.error?.includes('Name')) {
          // Name validation error
          setErrors((prev) => ({ ...prev, name: data.error }))
          nameRef.current?.focus()
        } else {
          setServerError({ message: data.error || 'Something went wrong. Please try again.' })
        }
        return
      }

      // Redirect to client profile or list
      router.push(mode === 'create' ? `/clients/${data.client.id}` : `/clients/${client?.id}`)
      router.refresh()
    } catch (error) {
      console.error('Error submitting form:', error)
      setServerError({ message: 'Unable to connect. Please check your internet connection and try again.' })
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
    // Clear server error when user makes changes
    if (serverError) {
      setServerError(null)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardContent className="space-y-4 pt-6">
          {serverError && (
            <div className="rounded-lg bg-red-50 p-4 text-sm">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-red-700 font-medium">{serverError.message}</p>
                  {serverError.type === 'duplicate_email' && (
                    <p className="mt-1 text-red-600">
                      <Link href={`/clients?search=${encodeURIComponent(formData.email)}`} className="underline hover:no-underline">
                        Search for existing client
                      </Link>
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <Input
            ref={nameRef}
            label="Name *"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            error={errors.name}
            placeholder="John Doe"
          />

          <Input
            ref={emailRef}
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
