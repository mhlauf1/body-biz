import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, isAdminOrManager } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { formatPeriodLabel } from '@/lib/dateRanges'

// Validation schema for query params
const querySchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (use YYYY-MM-DD)'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (use YYYY-MM-DD)'),
})

export interface TrainerCommission {
  id: string
  name: string
  role: 'admin' | 'manager' | 'trainer'
  clientCount: number
  revenue: number
  trainerAmount: number
  ownerAmount: number
  commissionRate: number
}

export interface CommissionReportSummary {
  totalRevenue: number
  totalTrainerPayout: number
  totalOwnerCut: number
  periodLabel: string
}

export interface CommissionReport {
  summary: CommissionReportSummary
  trainers: TrainerCommission[]
}

/**
 * GET /api/reports/commissions
 * Get commission breakdown by trainer for a date range
 * Admin/Manager only
 */
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Admin/Manager only
    if (!isAdminOrManager(user)) {
      return NextResponse.json(
        { error: 'Access denied. Admin or Manager role required.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    // Validate query params
    const validation = querySchema.safeParse({
      start_date: startDate,
      end_date: endDate,
    })

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Parse dates and set proper times for full day coverage
    const startDateTime = new Date(validation.data.start_date)
    startDateTime.setHours(0, 0, 0, 0)
    const endDateTime = new Date(validation.data.end_date)
    endDateTime.setHours(23, 59, 59, 999)

    // Get all purchases in date range with status active or completed
    const { data: purchases, error: purchasesError } = await supabase
      .from('purchases')
      .select(`
        id,
        client_id,
        trainer_id,
        amount,
        trainer_amount,
        owner_amount,
        trainer_commission_rate,
        trainer:users!purchases_trainer_id_fkey(id, name, role)
      `)
      .gte('created_at', startDateTime.toISOString())
      .lte('created_at', endDateTime.toISOString())
      .in('status', ['active', 'completed'])

    if (purchasesError) {
      console.error('Error fetching purchases:', purchasesError)
      return NextResponse.json({ error: 'Failed to fetch purchase data' }, { status: 500 })
    }

    // Aggregate by trainer
    const trainerMap = new Map<string, {
      id: string
      name: string
      role: 'admin' | 'manager' | 'trainer'
      clients: Set<string>
      revenue: number
      trainerAmount: number
      ownerAmount: number
      commissionRate: number
    }>()

    for (const purchase of purchases || []) {
      const trainer = purchase.trainer as { id: string; name: string; role: string } | null
      if (!trainer) continue

      const existing = trainerMap.get(trainer.id)
      if (existing) {
        existing.clients.add(purchase.client_id)
        existing.revenue += purchase.amount || 0
        existing.trainerAmount += purchase.trainer_amount || 0
        existing.ownerAmount += purchase.owner_amount || 0
      } else {
        trainerMap.set(trainer.id, {
          id: trainer.id,
          name: trainer.name,
          role: trainer.role as 'admin' | 'manager' | 'trainer',
          clients: new Set([purchase.client_id]),
          revenue: purchase.amount || 0,
          trainerAmount: purchase.trainer_amount || 0,
          ownerAmount: purchase.owner_amount || 0,
          commissionRate: purchase.trainer_commission_rate || 0.7,
        })
      }
    }

    // Convert to array and calculate totals
    const trainers: TrainerCommission[] = Array.from(trainerMap.values()).map(t => ({
      id: t.id,
      name: t.name,
      role: t.role,
      clientCount: t.clients.size,
      revenue: Math.round(t.revenue * 100) / 100,
      trainerAmount: Math.round(t.trainerAmount * 100) / 100,
      ownerAmount: Math.round(t.ownerAmount * 100) / 100,
      commissionRate: t.commissionRate,
    }))

    // Sort by revenue descending
    trainers.sort((a, b) => b.revenue - a.revenue)

    // Calculate summary totals
    const summary: CommissionReportSummary = {
      totalRevenue: Math.round(trainers.reduce((sum, t) => sum + t.revenue, 0) * 100) / 100,
      totalTrainerPayout: Math.round(trainers.reduce((sum, t) => sum + t.trainerAmount, 0) * 100) / 100,
      totalOwnerCut: Math.round(trainers.reduce((sum, t) => sum + t.ownerAmount, 0) * 100) / 100,
      periodLabel: formatPeriodLabel(startDateTime, endDateTime),
    }

    const report: CommissionReport = {
      summary,
      trainers,
    }

    return NextResponse.json(report)
  } catch (error) {
    console.error('Error in GET /api/reports/commissions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
