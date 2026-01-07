'use client'

import { useState, useEffect, useCallback } from 'react'
import { Modal, Button, Input, Select, Spinner } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'
import type { Client, Program, User, UserRole } from '@/types'

type ClientWithTrainer = Client & {
  assigned_trainer: Pick<User, 'id' | 'name' | 'role'> | null
}

interface PaymentMethod {
  id: string
  brand: string
  last4: string
  exp_month: number
  exp_year: number
}

interface NewChargeModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  client: ClientWithTrainer
  programs: Program[]
}

interface FormErrors {
  amount?: string
  payment_method_id?: string
}

export function NewChargeModal({
  isOpen,
  onClose,
  onSuccess,
  client,
  programs,
}: NewChargeModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMethods, setIsLoadingMethods] = useState(false)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [errors, setErrors] = useState<FormErrors>({})
  const [serverError, setServerError] = useState('')
  const [success, setSuccess] = useState<{ purchaseId: string; amount: number } | null>(null)

  const [formData, setFormData] = useState({
    program_id: '',
    custom_program_name: '',
    amount: '',
    duration_months: '0', // 0 = ongoing
    payment_method_id: '',
  })

  const fetchPaymentMethods = useCallback(async () => {
    setIsLoadingMethods(true)
    try {
      const response = await fetch(`/api/clients/${client.id}/payment-methods`)
      const data = await response.json()
      if (response.ok) {
        setPaymentMethods(data.payment_methods)
        // Auto-select first payment method
        if (data.payment_methods.length > 0) {
          setFormData((prev) => ({
            ...prev,
            payment_method_id: data.payment_methods[0].id,
          }))
        }
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error)
    } finally {
      setIsLoadingMethods(false)
    }
  }, [client.id])

  // Fetch payment methods when modal opens
  useEffect(() => {
    if (isOpen && client.stripe_customer_id) {
      fetchPaymentMethods()
    }
  }, [isOpen, client.stripe_customer_id, fetchPaymentMethods])

  // Auto-fill amount when program is selected
  useEffect(() => {
    if (formData.program_id && formData.program_id !== 'custom') {
      const program = programs.find((p) => p.id === formData.program_id)
      if (program) {
        setFormData((prev) => ({
          ...prev,
          amount: program.default_price?.toString() || '',
          duration_months: program.default_duration_months?.toString() || '0',
        }))
      }
    }
  }, [formData.program_id, programs])

  const programOptions = [
    { value: '', label: 'Select a program...' },
    ...programs.map((p) => ({
      value: p.id,
      label: `${p.name} ${p.default_price ? `- ${formatCurrency(p.default_price)}` : ''}`,
    })),
    { value: 'custom', label: 'Custom (enter details below)' },
  ]

  const durationOptions = [
    { value: '0', label: 'Ongoing (no end date)' },
    { value: '1', label: '1 month' },
    { value: '2', label: '2 months' },
    { value: '3', label: '3 months' },
    { value: '6', label: '6 months' },
    { value: '12', label: '12 months' },
  ]

  const paymentMethodOptions = paymentMethods.map((pm) => ({
    value: pm.id,
    label: `${pm.brand.charAt(0).toUpperCase() + pm.brand.slice(1)} •••• ${pm.last4} (exp ${pm.exp_month}/${pm.exp_year})`,
  }))

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Valid amount is required'
    }

    if (!formData.payment_method_id) {
      newErrors.payment_method_id = 'Payment method is required'
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
      const response = await fetch('/api/payments/charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: client.id,
          program_id: formData.program_id && formData.program_id !== 'custom' ? formData.program_id : undefined,
          custom_program_name: formData.program_id === 'custom' ? formData.custom_program_name : undefined,
          amount: parseFloat(formData.amount),
          duration_months: parseInt(formData.duration_months),
          payment_method_id: formData.payment_method_id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setServerError(data.error || 'Something went wrong')
        return
      }

      setSuccess({ purchaseId: data.purchase_id, amount: parseFloat(formData.amount) })
    } catch (error) {
      console.error('Error charging card:', error)
      setServerError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  const handleClose = () => {
    // Reset state
    setFormData({
      program_id: '',
      custom_program_name: '',
      amount: '',
      duration_months: '0',
      payment_method_id: paymentMethods[0]?.id || '',
    })
    setErrors({})
    setServerError('')
    setSuccess(null)
    onClose()
  }

  const handleSuccessClose = () => {
    handleClose()
    onSuccess()
  }

  // Calculate commission preview
  const getCommissionPreview = () => {
    const amount = parseFloat(formData.amount) || 0
    const trainerRole = client.assigned_trainer?.role as UserRole

    if (!amount || !trainerRole) return null

    if (trainerRole === 'admin') {
      return {
        trainerAmount: amount,
        ownerAmount: 0,
        trainerRate: '100%',
      }
    }

    return {
      trainerAmount: Math.round(amount * 0.7 * 100) / 100,
      ownerAmount: Math.round(amount * 0.3 * 100) / 100,
      trainerRate: '70%',
    }
  }

  const commission = getCommissionPreview()

  // Success state
  if (success) {
    return (
      <Modal isOpen={isOpen} onClose={handleSuccessClose} title="Payment Successful">
        <div className="space-y-4 text-center">
          <div className="flex justify-center">
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

          <h3 className="text-lg font-semibold text-gray-900">
            {formatCurrency(success.amount)} charged successfully
          </h3>

          <p className="text-sm text-gray-600">
            The payment has been processed and {client.name}&apos;s subscription is now active.
          </p>

          <Button onClick={handleSuccessClose} className="w-full">
            Done
          </Button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Charge ${client.name}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {serverError && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
            {serverError}
          </div>
        )}

        {/* Payment Method */}
        {isLoadingMethods ? (
          <div className="flex items-center justify-center py-4">
            <Spinner className="h-5 w-5 text-indigo-600" />
            <span className="ml-2 text-sm text-gray-500">Loading payment methods...</span>
          </div>
        ) : paymentMethods.length === 0 ? (
          <div className="rounded-lg bg-yellow-50 p-4 text-sm text-yellow-700">
            No saved payment methods found. Please use a payment link instead.
          </div>
        ) : (
          <Select
            label="Payment Method *"
            id="payment_method_id"
            name="payment_method_id"
            options={paymentMethodOptions}
            value={formData.payment_method_id}
            onChange={handleChange}
            error={errors.payment_method_id}
          />
        )}

        {/* Program */}
        <Select
          label="Program"
          id="program_id"
          name="program_id"
          options={programOptions}
          value={formData.program_id}
          onChange={handleChange}
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

        {/* Amount */}
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

        {/* Duration */}
        <Select
          label="Duration"
          id="duration_months"
          name="duration_months"
          options={durationOptions}
          value={formData.duration_months}
          onChange={handleChange}
        />

        {/* Summary */}
        {formData.amount && parseFloat(formData.amount) > 0 && (
          <div className="rounded-lg bg-gray-50 p-4 space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Charge Summary</h4>
            <div className="flex justify-between">
              <span className="text-gray-600">Amount:</span>
              <span className="font-semibold">
                {formatCurrency(parseFloat(formData.amount))}/month
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Duration:</span>
              <span>
                {formData.duration_months === '0'
                  ? 'Ongoing'
                  : `${formData.duration_months} month${parseInt(formData.duration_months) > 1 ? 's' : ''}`}
              </span>
            </div>
            {formData.duration_months !== '0' && (
              <div className="flex justify-between border-t pt-2">
                <span className="text-gray-600">Total:</span>
                <span className="font-semibold">
                  {formatCurrency(parseFloat(formData.amount) * parseInt(formData.duration_months))}
                </span>
              </div>
            )}

            {/* Commission breakdown */}
            {commission && (
              <div className="border-t pt-2 mt-2 space-y-1">
                <h5 className="text-xs font-medium text-gray-500 uppercase">Commission Split</h5>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {client.assigned_trainer?.name} ({commission.trainerRate}):
                  </span>
                  <span>{formatCurrency(commission.trainerAmount)}</span>
                </div>
                {commission.ownerAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Owner (30%):</span>
                    <span>{formatCurrency(commission.ownerAmount)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={isLoading}
            disabled={paymentMethods.length === 0 || isLoadingMethods}
          >
            {formData.amount && parseFloat(formData.amount) > 0
              ? `Charge ${formatCurrency(parseFloat(formData.amount))}`
              : 'Charge Card'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
