'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input, Select, Card, CardContent, CardFooter } from '@/components/ui'
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
  } | null>(null)

  const [formData, setFormData] = useState({
    client_id: preselectedClientId || '',
    trainer_id: currentUser.id,
    program_id: '',
    custom_program_name: '',
    amount: '',
    duration_months: '',
    is_recurring: true,
    expires_days: '7',
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

  const expiresOptions = [
    { value: '1', label: '1 day' },
    { value: '3', label: '3 days' },
    { value: '7', label: '7 days' },
    { value: '14', label: '14 days' },
    { value: '30', label: '30 days' },
  ]

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.client_id) {
      newErrors.client_id = 'Client is required'
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
      const response = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: formData.client_id,
          trainer_id: formData.trainer_id,
          program_id: formData.program_id && formData.program_id !== 'custom' ? formData.program_id : undefined,
          custom_program_name: formData.program_id === 'custom' ? formData.custom_program_name : undefined,
          amount: parseFloat(formData.amount),
          duration_months: formData.duration_months ? parseInt(formData.duration_months) : undefined,
          is_recurring: formData.is_recurring,
          expires_days: parseInt(formData.expires_days),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setServerError(data.error || 'Something went wrong')
        return
      }

      // Show success with generated link
      setGeneratedLink({
        url: data.url,
        expiresAt: data.expires_at,
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
    const selectedClient = clients.find((c) => c.id === formData.client_id)
    return (
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <svg
                className="h-6 w-6 text-green-600"
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
            Send this link to {selectedClient?.name}:
          </p>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
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
                setFormData({
                  client_id: '',
                  trainer_id: currentUser.id,
                  program_id: '',
                  custom_program_name: '',
                  amount: '',
                  duration_months: '',
                  is_recurring: true,
                  expires_days: '7',
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
                <dt>Expires:</dt>
                <dd>{new Date(generatedLink.expiresAt).toLocaleDateString()}</dd>
              </div>
            </dl>
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="ghost" className="w-full" onClick={() => router.push('/payments')}>
            View All Payments
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

          <Select
            label="Client *"
            id="client_id"
            name="client_id"
            options={clientOptions}
            value={formData.client_id}
            onChange={handleChange}
            error={errors.client_id}
            placeholder="Select a client..."
          />

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
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
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

          <Select
            label="Link Expires After"
            id="expires_days"
            name="expires_days"
            options={expiresOptions}
            value={formData.expires_days}
            onChange={handleChange}
          />

          {formData.amount && (
            <div className="rounded-lg bg-gray-50 p-4">
              <h4 className="text-sm font-medium text-gray-700">Summary</h4>
              <p className="mt-1 text-lg font-bold text-gray-900">
                {formatCurrency(parseFloat(formData.amount) || 0)}
                {formData.is_recurring && '/month'}
              </p>
              {formData.duration_months && formData.is_recurring && (
                <p className="text-sm text-gray-600">
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
