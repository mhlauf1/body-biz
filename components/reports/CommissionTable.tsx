'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, Badge, Spinner } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'
import { toISODateString } from '@/lib/dateRanges'
import { SummaryCards } from './SummaryCards'
import { DateRangeSelector } from './DateRangeSelector'
import { ExportButton } from './ExportButton'
import type { DateRange } from '@/lib/dateRanges'

interface TrainerCommission {
  id: string
  name: string
  role: 'admin' | 'manager' | 'trainer'
  clientCount: number
  revenue: number
  trainerAmount: number
  ownerAmount: number
  commissionRate: number
}

interface CommissionReportSummary {
  totalRevenue: number
  totalTrainerPayout: number
  totalOwnerCut: number
  periodLabel: string
}

interface CommissionTableProps {
  initialRange: DateRange
}

export function CommissionTable({ initialRange }: CommissionTableProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [trainers, setTrainers] = useState<TrainerCommission[]>([])
  const [summary, setSummary] = useState<CommissionReportSummary>({
    totalRevenue: 0,
    totalTrainerPayout: 0,
    totalOwnerCut: 0,
    periodLabel: initialRange.label,
  })

  const fetchData = useCallback(async (start: Date, end: Date) => {
    setIsLoading(true)
    setError('')

    try {
      const params = new URLSearchParams({
        start_date: toISODateString(start),
        end_date: toISODateString(end),
      })

      const response = await fetch(`/api/reports/commissions?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch report')
      }

      setTrainers(data.trainers)
      setSummary(data.summary)
    } catch (err) {
      console.error('Error fetching commission data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData(initialRange.start, initialRange.end)
  }, [fetchData, initialRange])

  const handleRangeChange = (start: Date, end: Date) => {
    fetchData(start, end)
  }

  const getRoleBadgeVariant = (role: string): 'success' | 'info' | 'default' => {
    switch (role) {
      case 'admin':
        return 'success'
      case 'manager':
        return 'info'
      default:
        return 'default'
    }
  }

  // Calculate totals for footer
  const totals = {
    clientCount: trainers.reduce((sum, t) => sum + t.clientCount, 0),
    revenue: trainers.reduce((sum, t) => sum + t.revenue, 0),
    trainerAmount: trainers.reduce((sum, t) => sum + t.trainerAmount, 0),
    ownerAmount: trainers.reduce((sum, t) => sum + t.ownerAmount, 0),
  }

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <Card>
        <CardContent className="py-4">
          <DateRangeSelector
            defaultRange={initialRange}
            onRangeChange={handleRangeChange}
          />
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <SummaryCards
        totalRevenue={summary.totalRevenue}
        totalTrainerPayout={summary.totalTrainerPayout}
        totalOwnerCut={summary.totalOwnerCut}
        isLoading={isLoading}
      />

      {/* Commission Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Commission Breakdown</h3>
            <ExportButton
              data={trainers}
              periodLabel={summary.periodLabel}
              disabled={isLoading || trainers.length === 0}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {error && (
            <div className="px-6 py-4 text-red-600">{error}</div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="h-8 w-8 text-indigo-600" />
            </div>
          ) : trainers.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              No purchases found for this period.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Trainer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Clients
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      Revenue
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      Their Commission
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      Kate&apos;s Cut
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {trainers.map((trainer) => (
                    <tr key={trainer.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            {trainer.name}
                          </span>
                          <Badge variant={getRoleBadgeVariant(trainer.role)}>
                            {trainer.role}
                          </Badge>
                          {trainer.role === 'admin' && (
                            <span className="text-xs text-gray-400">(100%)</span>
                          )}
                          {trainer.role !== 'admin' && (
                            <span className="text-xs text-gray-400">(70%)</span>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-gray-600">
                        {trainer.clientCount}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right font-medium text-gray-900">
                        {formatCurrency(trainer.revenue)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-green-600">
                        {formatCurrency(trainer.trainerAmount)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-indigo-600">
                        {trainer.ownerAmount > 0
                          ? formatCurrency(trainer.ownerAmount)
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr className="font-semibold">
                    <td className="whitespace-nowrap px-6 py-4 text-gray-900">
                      Total
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-gray-600">
                      {totals.clientCount}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-gray-900">
                      {formatCurrency(totals.revenue)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-green-600">
                      {formatCurrency(totals.trainerAmount)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-indigo-600">
                      {formatCurrency(totals.ownerAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
