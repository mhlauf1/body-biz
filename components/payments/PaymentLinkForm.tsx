'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input, Select, SearchableSelect, Card, CardContent, CardFooter } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'
import type { User, Client, Program } from '@/types'

type ClientWithTrainer = Client & {
  assigned_trainer: Pick<User, 'id' | 'name'> | null
}

interface PaymentLinkFormProps {
  clients: ClientWithTrainer[]
  trainers: Pick<User, 'id' | 'name'>[]
  programs: Program[]
  currentUser: User
  isAdminOrManager: boolean
  preselectedClientId?: string
}

interface FormErrors {
  client_id?: string
  new_client_name?: string
  new_client_email?: string
  trainer_id?: string
  program_id?: string
  amount?: string
  duration_months?: string
}

export function PaymentLinkForm({
  clients,
  trainers,
  programs,
  currentUser,
  isAdminOrManager,
  preselectedClientId,
}: PaymentLinkFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [serverError, setServerError] = useState('')
  const [generatedLink, setGeneratedLink] = useState<{
    url: string
    expiresAt: string
    clientName?: string
  } | null>(null)

  // Client mode: existing (select from dropdown) or new (enter details)
  const [clientMode, setClientMode] = useState<'existing' | 'new'>(
    preselectedClientId ? 'existing' : 'new'
  )

  // New client fields
  const [newClient, setNewClient] = useState({
    name: '',
    email: '',
    phone: '',
  })

  const [formData, setFormData] = useState({
    client_id: preselectedClientId || '',
    trainer_id: currentUser.id,
    program_id: '',
    custom_program_name: '',
    amount: '',
    duration_months: '',
    is_recurring: true,
  })

  // Auto-fill amount and duration when program is selected
  useEffect(() => {
    if (formData.program_id) {
      const program = programs.find((p) => p.id === formData.program_id)
      if (program) {
        setFormData((prev) => ({
          ...prev,
          amount: program.default_price?.toString() || '',
          duration_months: program.default_duration_months?.toString() || '',
          is_recurring: program.is_recurring ?? true,
        }))
      }
    }
  }, [formData.program_id, programs])

  // Auto-fill trainer when client is selected (for trainers)
  useEffect(() => {
    if (formData.client_id && !isAdminOrManager) {
      const client = clients.find((c) => c.id === formData.client_id)
      if (client?.assigned_trainer_id) {
        setFormData((prev) => ({
          ...prev,
          trainer_id: client.assigned_trainer_id!,
        }))
      }
    }
  }, [formData.client_id, clients, isAdminOrManager])

  const clientOptions = clients.map((c) => ({
    value: c.id,
    label: `${c.name} (${c.email})`,
  }))

  const trainerOptions = isAdminOrManager
    ? trainers.map((t) => ({ value: t.id, label: t.name }))
    : [{ value: currentUser.id, label: currentUser.name }]

  const programOptions = [
    { value: '', label: 'Select a program...' },
    ...programs.map((p) => ({
      value: p.id,
      label: `${p.name} ${p.default_price ? `- ${formatCurrency(p.default_price)}` : ''}`,
    })),
    { value: 'custom', label: 'Custom (enter details below)' },
  ]

  const durationOptions = [
    { value: '', label: 'Ongoing (no end date)' },
    { value: '1', label: '1 month' },
    { value: '2', label: '2 months' },
    { value: '3', label: '3 months' },
    { value: '6', label: '6 months' },
    { value: '12', label: '12 months' },
  ]

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    // Validate client based on mode
    if (clientMode === 'existing') {
      if (!formData.client_id) {
        newErrors.client_id = 'Please select a client'
      }
    } else {
      if (!newClient.name.trim()) {
        newErrors.new_client_name = 'Client name is required'
      }
      if (!newClient.email.trim()) {
        newErrors.new_client_email = 'Client email is required'
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newClient.email)) {
        newErrors.new_client_email = 'Please enter a valid email'
      }
    }

    if (!formData.trainer_id) {
      newErrors.trainer_id = 'Trainer is required'
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Valid amount is required'
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
      // Build request body based on client mode
      const requestBody: Record<string, unknown> = {
        trainer_id: formData.trainer_id,
        program_id: formData.program_id && formData.program_id !== 'custom' ? formData.program_id : undefined,
        custom_program_name: formData.program_id === 'custom' ? formData.custom_program_name : undefined,
        amount: parseFloat(formData.amount),
        duration_months: formData.duration_months ? parseInt(formData.duration_months) : undefined,
        is_recurring: formData.is_recurring,
      }

      if (clientMode === 'existing') {
        requestBody.client_id = formData.client_id
      } else {
        requestBody.new_client = {
          name: newClient.name.trim(),
          email: newClient.email.trim(),
          phone: newClient.phone.trim() || undefined,
        }
      }

      const response = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()

      if (!response.ok) {
        setServerError(data.error || 'Something went wrong')
        return
      }

      // Determine client name for success message
      const clientName = clientMode === 'existing'
        ? clients.find((c) => c.id === formData.client_id)?.name
        : newClient.name

      // Show success with generated link
      setGeneratedLink({
        url: data.url,
        expiresAt: data.expires_at,
        clientName,
      })
    } catch (error) {
      console.error('Error creating payment link:', error)
      setServerError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    setFormData((prev) => ({ ...prev, [name]: newValue }))
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  const copyToClipboard = async () => {
    if (generatedLink?.url) {
      await navigator.clipboard.writeText(generatedLink.url)
    }
  }

  // Success state - show generated link
  if (generatedLink) {
    return (
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
              <svg
                className="h-6 w-6 text-emerald-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>

          <h2 className="text-center text-lg font-semibold text-gray-900">
            Payment Link Created
          </h2>

          <p className="text-center text-sm text-gray-600">
            Send this link to {generatedLink.clientName}:
          </p>

          <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-3">
            <code className="block break-all text-sm text-gray-800">
              {generatedLink.url}
            </code>
          </div>

          <div className="flex justify-center gap-3">
            <Button onClick={copyToClipboard} variant="secondary">
              Copy Link
            </Button>
            <Button
              onClick={() => {
                setGeneratedLink(null)
                setClientMode('new')
                setNewClient({ name: '', email: '', phone: '' })
                setFormData({
                  client_id: '',
                  trainer_id: currentUser.id,
                  program_id: '',
                  custom_program_name: '',
                  amount: '',
                  duration_months: '',
                  is_recurring: true,
                })
              }}
            >
              Create Another
            </Button>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-700">Details</h3>
            <dl className="mt-2 space-y-1 text-sm text-gray-600">
              <div className="flex justify-between">
                <dt>Amount:</dt>
                <dd className="font-medium">
                  {formatCurrency(parseFloat(formData.amount))}
                  {formData.is_recurring && '/mo'}
                </dd>
              </div>
              {formData.duration_months && (
                <div className="flex justify-between">
                  <dt>Duration:</dt>
                  <dd>{formData.duration_months} months</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt>Link expires:</dt>
                <dd>In 24 hours</dd>
              </div>
            </dl>
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="ghost" className="w-full" onClick={() => router.push('/transactions')}>
            View All Transactions
          </Button>
        </CardFooter>
      </Card>
    )
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

          {/* Client Mode Toggle */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-500">
              Client *
            </label>
            <div className="mb-3 flex gap-4">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="clientMode"
                  checked={clientMode === 'new'}
                  onChange={() => {
                    setClientMode('new')
                    setFormData((prev) => ({ ...prev, client_id: '' }))
                    setErrors((prev) => ({ ...prev, client_id: undefined }))
                  }}
                  className="h-4 w-4 border-gray-300 text-gray-900 focus:ring-gray-900/20"
                />
                <span className="text-sm text-gray-700">New Client</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="clientMode"
                  checked={clientMode === 'existing'}
                  onChange={() => {
                    setClientMode('existing')
                    setNewClient({ name: '', email: '', phone: '' })
                    setErrors((prev) => ({
                      ...prev,
                      new_client_name: undefined,
                      new_client_email: undefined,
                    }))
                  }}
                  className="h-4 w-4 border-gray-300 text-gray-900 focus:ring-gray-900/20"
                />
                <span className="text-sm text-gray-700">Existing Client</span>
              </label>
            </div>

            {/* Existing Client - Searchable Select */}
            {clientMode === 'existing' && (
              <SearchableSelect
                id="client_id"
                name="client_id"
                options={clientOptions}
                value={formData.client_id}
                onChange={(value) => {
                  setFormData((prev) => ({ ...prev, client_id: value }))
                  if (errors.client_id) {
                    setErrors((prev) => ({ ...prev, client_id: undefined }))
                  }
                }}
                placeholder="Search clients..."
                error={errors.client_id}
                noResultsText="No clients found"
              />
            )}

            {/* New Client - Input Fields */}
            {clientMode === 'new' && (
              <div className="grid gap-3 sm:grid-cols-3">
                <Input
                  label="Name"
                  id="new_client_name"
                  name="new_client_name"
                  value={newClient.name}
                  onChange={(e) => {
                    setNewClient((prev) => ({ ...prev, name: e.target.value }))
                    if (errors.new_client_name) {
                      setErrors((prev) => ({ ...prev, new_client_name: undefined }))
                    }
                  }}
                  error={errors.new_client_name}
                  placeholder="John Smith"
                />
                <Input
                  label="Email"
                  id="new_client_email"
                  name="new_client_email"
                  type="email"
                  value={newClient.email}
                  onChange={(e) => {
                    setNewClient((prev) => ({ ...prev, email: e.target.value }))
                    if (errors.new_client_email) {
                      setErrors((prev) => ({ ...prev, new_client_email: undefined }))
                    }
                  }}
                  error={errors.new_client_email}
                  placeholder="john@email.com"
                />
                <Input
                  label="Phone"
                  id="new_client_phone"
                  name="new_client_phone"
                  type="tel"
                  value={newClient.phone}
                  onChange={(e) => {
                    setNewClient((prev) => ({ ...prev, phone: e.target.value }))
                  }}
                  placeholder="(555) 555-5555"
                />
              </div>
            )}
          </div>

          {isAdminOrManager && (
            <Select
              label="Trainer *"
              id="trainer_id"
              name="trainer_id"
              options={trainerOptions}
              value={formData.trainer_id}
              onChange={handleChange}
              error={errors.trainer_id}
            />
          )}

          <Select
            label="Program"
            id="program_id"
            name="program_id"
            options={programOptions}
            value={formData.program_id}
            onChange={handleChange}
            error={errors.program_id}
          />

          {formData.program_id === 'custom' && (
            <Input
              label="Program Name"
              id="custom_program_name"
              name="custom_program_name"
              value={formData.custom_program_name}
              onChange={handleChange}
              placeholder="e.g., Custom Training Package"
            />
          )}

          <Input
            label="Amount (per month) *"
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0"
            value={formData.amount}
            onChange={handleChange}
            error={errors.amount}
            placeholder="700.00"
          />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_recurring"
              name="is_recurring"
              checked={formData.is_recurring}
              onChange={handleChange}
              className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900/20"
            />
            <label htmlFor="is_recurring" className="text-sm text-gray-700">
              Recurring monthly subscription
            </label>
          </div>

          {formData.is_recurring && (
            <Select
              label="Duration"
              id="duration_months"
              name="duration_months"
              options={durationOptions}
              value={formData.duration_months}
              onChange={handleChange}
            />
          )}

          {formData.amount && (
            <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
              <h4 className="text-sm font-medium text-gray-500">Summary</h4>
              <p className="mt-1 text-lg font-bold text-gray-900">
                {formatCurrency(parseFloat(formData.amount) || 0)}
                {formData.is_recurring && '/month'}
              </p>
              {formData.duration_months && formData.is_recurring && (
                <p className="text-sm text-gray-500">
                  Total: {formatCurrency((parseFloat(formData.amount) || 0) * parseInt(formData.duration_months))} over{' '}
                  {formData.duration_months} months
                </p>
              )}
            </div>
          )}
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
            Generate Payment Link
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
