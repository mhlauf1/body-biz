'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input, Card, CardContent, CardFooter } from '@/components/ui'
import { AlertCircle } from 'lucide-react'

interface Program {
  id: string
  name: string
  default_price: number
  is_addon: boolean
  is_recurring: boolean
  is_active: boolean
}

interface ProgramFormProps {
  program?: Program
  mode: 'create' | 'edit'
}

interface FormErrors {
  name?: string
  default_price?: string
}

export function ProgramForm({ program, mode }: ProgramFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [serverError, setServerError] = useState<string | null>(null)

  const nameRef = useRef<HTMLInputElement>(null)
  const priceRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    name: program?.name || '',
    default_price: program?.default_price ?? 0,
    is_addon: program?.is_addon ?? false,
    is_recurring: program?.is_recurring ?? true,
  })

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (formData.default_price < 0 || isNaN(formData.default_price)) {
      newErrors.default_price = 'Price must be a valid non-negative number'
    }

    setErrors(newErrors)

    if (newErrors.name) {
      nameRef.current?.focus()
    } else if (newErrors.default_price) {
      priceRef.current?.focus()
    }

    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setServerError(null)

    if (!validateForm()) return

    setIsLoading(true)

    try {
      const url = mode === 'create' ? '/api/programs' : `/api/programs/${program?.id}`
      const method = mode === 'create' ? 'POST' : 'PATCH'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          default_price: formData.default_price,
          is_addon: formData.is_addon,
          is_recurring: formData.is_recurring,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 409) {
          setServerError('A program with this name already exists.')
          setErrors((prev) => ({ ...prev, name: 'This name is already in use' }))
          nameRef.current?.focus()
        } else {
          setServerError(data.error || 'Something went wrong. Please try again.')
        }
        return
      }

      router.push('/programs')
      router.refresh()
    } catch (error) {
      console.error('Error submitting form:', error)
      setServerError('Unable to connect. Please check your internet connection and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked

    if (type === 'checkbox') {
      setFormData((prev) => ({ ...prev, [name]: checked }))
    } else if (name === 'default_price') {
      const numValue = parseFloat(value)
      setFormData((prev) => ({
        ...prev,
        [name]: isNaN(numValue) ? 0 : numValue,
      }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }

    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
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
                <p className="font-medium text-red-700">{serverError}</p>
              </div>
            </div>
          )}

          <Input
            ref={nameRef}
            label="Program Name *"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            error={errors.name}
            placeholder="e.g., 3 Month Coaching, Testing Fee"
          />

          <Input
            ref={priceRef}
            label="Default Price *"
            id="default_price"
            name="default_price"
            type="number"
            min="0"
            step="0.01"
            value={formData.default_price}
            onChange={handleChange}
            error={errors.default_price}
            placeholder="0.00"
          />

          <div className="space-y-3 pt-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="is_recurring"
                checked={formData.is_recurring}
                onChange={handleChange}
                className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">Recurring (Monthly)</span>
                <p className="text-xs text-gray-500">Customer will be charged monthly</p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="is_addon"
                checked={formData.is_addon}
                onChange={handleChange}
                className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">Add-on Service</span>
                <p className="text-xs text-gray-500">This is an additional service, not a main program</p>
              </div>
            </label>
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
            {mode === 'create' ? 'Create Program' : 'Save Changes'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
