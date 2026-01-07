import { Card, CardContent } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'
import { DollarSign, Users, TrendingUp } from 'lucide-react'

interface SummaryCardsProps {
  totalRevenue: number
  totalTrainerPayout: number
  totalOwnerCut: number
  isLoading?: boolean
}

export function SummaryCards({
  totalRevenue,
  totalTrainerPayout,
  totalOwnerCut,
  isLoading = false,
}: SummaryCardsProps) {
  const cards = [
    {
      title: 'Total Revenue',
      value: totalRevenue,
      icon: DollarSign,
      description: 'All purchases in period',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Trainer Payouts',
      value: totalTrainerPayout,
      icon: Users,
      description: 'Amount owed to trainers',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: "Kate's Income",
      value: totalOwnerCut,
      icon: TrendingUp,
      description: '30% from other trainers',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardContent className="py-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{card.title}</p>
                {isLoading ? (
                  <div className="mt-1 h-8 w-24 animate-pulse rounded bg-gray-200" />
                ) : (
                  <p className="mt-1 text-2xl font-semibold text-gray-900">
                    {formatCurrency(card.value)}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-400">{card.description}</p>
              </div>
              <div className={`rounded-full p-3 ${card.bgColor}`}>
                <card.icon className={`h-6 w-6 ${card.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
