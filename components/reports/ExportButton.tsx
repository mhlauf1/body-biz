'use client'

import { Button } from '@/components/ui'
import { Download } from 'lucide-react'

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

interface ExportButtonProps {
  data: TrainerCommission[]
  periodLabel: string
  disabled?: boolean
}

export function ExportButton({ data, periodLabel, disabled }: ExportButtonProps) {
  const handleExport = () => {
    // Build CSV content
    const headers = ['Trainer', 'Role', 'Clients', 'Revenue', 'Commission', 'Owner Cut']

    const rows = data.map((t) => [
      t.name,
      t.role,
      t.clientCount.toString(),
      t.revenue.toFixed(2),
      t.trainerAmount.toFixed(2),
      t.ownerAmount.toFixed(2),
    ])

    // Add totals row
    const totals = data.reduce(
      (acc, t) => ({
        clients: acc.clients + t.clientCount,
        revenue: acc.revenue + t.revenue,
        commission: acc.commission + t.trainerAmount,
        ownerCut: acc.ownerCut + t.ownerAmount,
      }),
      { clients: 0, revenue: 0, commission: 0, ownerCut: 0 }
    )

    rows.push([
      'TOTAL',
      '',
      totals.clients.toString(),
      totals.revenue.toFixed(2),
      totals.commission.toFixed(2),
      totals.ownerCut.toFixed(2),
    ])

    // Build CSV string
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n')

    // Create download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    // Create filename from period label
    const filename = `commissions-${periodLabel.toLowerCase().replace(/[^a-z0-9]/g, '-')}.csv`

    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <Button
      variant="secondary"
      onClick={handleExport}
      disabled={disabled}
    >
      <Download className="mr-2 h-4 w-4" />
      Export CSV
    </Button>
  )
}
