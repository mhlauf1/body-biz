'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge, Button, Input } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'
import { Package, RefreshCw, PlusCircle } from 'lucide-react'

interface Program {
  id: string
  name: string
  description: string | null
  default_price: number | null
  default_duration_months: number | null
  is_addon: boolean
  is_recurring: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

interface ProgramListProps {
  initialPrograms: Program[]
}

export function ProgramList({ initialPrograms }: ProgramListProps) {
  const [programs, setPrograms] = useState(initialPrograms)
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showInactive, setShowInactive] = useState(false)

  const fetchPrograms = async (searchTerm: string, includeInactive: boolean) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.set('search', searchTerm)
      if (includeInactive) params.set('include_inactive', 'true')

      const response = await fetch(`/api/programs?${params.toString()}`)
      const data = await response.json()

      if (response.ok) {
        setPrograms(data.programs)
      }
    } catch (error) {
      console.error('Error fetching programs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = (value: string) => {
    setSearch(value)
    // Debounce search
    const timeoutId = setTimeout(() => {
      fetchPrograms(value, showInactive)
    }, 300)
    return () => clearTimeout(timeoutId)
  }

  const handleToggleInactive = () => {
    const newValue = !showInactive
    setShowInactive(newValue)
    fetchPrograms(search, newValue)
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-4 items-center">
          <div className="max-w-xs flex-1">
            <Input
              placeholder="Search programs..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={handleToggleInactive}
              className="rounded border-gray-300 text-gray-900 focus:ring-gray-900"
            />
            Show inactive
          </label>
        </div>
        <Link href="/programs/new">
          <Button>
            <PlusCircle className="h-4 w-4 mr-1.5" />
            Add Program
          </Button>
        </Link>
      </div>

      {/* Programs Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                Price
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                Recurring
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">

              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : programs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                  No programs found
                </td>
              </tr>
            ) : (
              programs.map((program, index) => (
                <tr
                  key={program.id}
                  className={`hover:bg-gray-50 transition-colors ${
                    index !== programs.length - 1 ? 'border-b border-gray-100' : ''
                  } ${!program.is_active ? 'opacity-60' : ''}`}
                >
                  <td className="whitespace-nowrap px-4 py-4">
                    <Link href={`/programs/${program.id}`} className="block">
                      <div className="flex items-center">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                          <Package className="h-5 w-5 text-gray-500" />
                        </div>
                        <div className="ml-4">
                          <div className="font-medium text-gray-900">
                            {program.name}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4">
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(program.default_price ?? 0)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4">
                    <Badge variant={program.is_addon ? 'warning' : 'info'}>
                      {program.is_addon ? 'Add-on' : 'Main'}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4">
                    {program.is_recurring ? (
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <RefreshCw className="h-4 w-4 text-green-500" />
                        Monthly
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">One-time</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4">
                    <Badge variant={program.is_active ? 'success' : 'default'}>
                      {program.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-right">
                    <Link href={`/programs/${program.id}`}>
                      <Button variant="ghost" size="sm">
                        Edit
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
        Showing {programs.length} program{programs.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}
