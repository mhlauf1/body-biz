'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button, Input, Select, Card, CardContent, CardFooter } from '@/components/ui'
import { AlertCircle, Info } from 'lucide-react'
import type { User, UserRole } from '@/types'

interface TeamMemberFormProps {
  member?: User
  mode: 'create' | 'edit'
}

interface FormErrors {
  name?: string
  email?: string
  phone?: string
  role?: string
  commission_rate?: string
}

const DEFAULT_COMMISSION_RATES: Record<UserRole, number> = {
  admin: 1.0,
  manager: 0.7,
  trainer: 0.7,
}

export function TeamMemberForm({ member, mode }: TeamMemberFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [serverError, setServerError] = useState<{
    message: string
    type?: 'duplicate_email' | 'error'
  } | null>(null)
  const [inviteLink, setInviteLink] = useState<string | null>(null)

  // Refs for auto-focusing error fields
  const nameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    name: member?.name || '',
    email: member?.email || '',
    phone: member?.phone || '',
    role: (member?.role as UserRole) || 'trainer',
    commission_rate: member?.commission_rate ?? 0.7,
  })

  // Auto-update commission rate when role changes (only in create mode)
  useEffect(() => {
    if (mode === 'create') {
      setFormData((prev) => ({
        ...prev,
        commission_rate: DEFAULT_COMMISSION_RATES[prev.role as UserRole],
      }))
    }
  }, [formData.role, mode])

  const roleOptions = [
    { value: 'trainer', label: 'Trainer' },
    { value: 'manager', label: 'Manager' },
    { value: 'admin', label: 'Admin' },
  ]

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

    if (!formData.role) {
      newErrors.role = 'Role is required'
    }

    if (
      formData.commission_rate < 0 ||
      formData.commission_rate > 1 ||
      isNaN(formData.commission_rate)
    ) {
      newErrors.commission_rate = 'Commission rate must be between 0% and 100%'
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
    setInviteLink(null)

    if (!validateForm()) return

    setIsLoading(true)

    try {
      const url = mode === 'create' ? '/api/team' : `/api/team/${member?.id}`
      const method = mode === 'create' ? 'POST' : 'PATCH'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim() || null,
          role: formData.role,
          commission_rate: formData.commission_rate,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle specific error types
        if (response.status === 409) {
          // Duplicate email
          setServerError({
            message: 'A team member with this email already exists.',
            type: 'duplicate_email',
          })
          setErrors((prev) => ({ ...prev, email: 'This email is already in use' }))
          emailRef.current?.focus()
        } else if (response.status === 400 && data.error?.toLowerCase().includes('email')) {
          // Email validation error
          setErrors((prev) => ({ ...prev, email: data.error }))
          emailRef.current?.focus()
        } else if (response.status === 400 && data.error?.toLowerCase().includes('name')) {
          // Name validation error
          setErrors((prev) => ({ ...prev, name: data.error }))
          nameRef.current?.focus()
        } else {
          setServerError({
            message: data.error || 'Something went wrong. Please try again.',
          })
        }
        return
      }

      // Show invite link if created
      if (mode === 'create' && data.invite_link) {
        setInviteLink(data.invite_link)
      }

      // Redirect to team member profile or list
      router.push(mode === 'create' ? `/team/${data.data.id}` : `/team/${member?.id}`)
      router.refresh()
    } catch (error) {
      console.error('Error submitting form:', error)
      setServerError({
        message: 'Unable to connect. Please check your internet connection and try again.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target

    // Handle commission_rate as a number
    if (name === 'commission_rate') {
      const numValue = parseFloat(value)
      setFormData((prev) => ({
        ...prev,
        [name]: isNaN(numValue) ? 0 : numValue / 100, // Convert percentage to decimal
      }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }

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
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5 text-red-500" />
                <div className="flex-1">
                  <p className="font-medium text-red-700">{serverError.message}</p>
                  {serverError.type === 'duplicate_email' && (
                    <p className="mt-1 text-red-600">
                      <Link
                        href={`/team?search=${encodeURIComponent(formData.email)}`}
                        className="underline hover:no-underline"
                      >
                        Search for existing team member
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
            placeholder="Jane Smith"
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
            placeholder="jane@thebody.biz"
            disabled={mode === 'edit'} // Can't change email after creation
          />

          {mode === 'edit' && (
            <p className="text-xs text-gray-500 -mt-2">
              Email cannot be changed after account creation.
            </p>
          )}

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
            label="Role *"
            id="role"
            name="role"
            options={roleOptions}
            value={formData.role}
            onChange={handleChange}
            error={errors.role}
          />

          <div className="space-y-1">
            <Input
              label="Commission Rate *"
              id="commission_rate"
              name="commission_rate"
              type="number"
              min="0"
              max="100"
              step="1"
              value={Math.round(formData.commission_rate * 100)}
              onChange={handleChange}
              error={errors.commission_rate}
            />
            <div className="flex items-start gap-2 rounded-lg bg-blue-50 p-3">
              <Info className="h-4 w-4 flex-shrink-0 mt-0.5 text-blue-500" />
              <p className="text-xs text-blue-700">
                Commission rate is the percentage the trainer keeps. The owner (Kate) receives the
                remainder. Default is 100% for admin, 70% for others.
              </p>
            </div>
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
            {mode === 'create' ? 'Add Team Member' : 'Save Changes'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
