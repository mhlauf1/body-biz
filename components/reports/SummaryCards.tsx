import { formatCurrency } from '@/lib/utils'

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
      description: 'All purchases in period',
    },
    {
      title: 'Trainer Payouts',
      value: totalTrainerPayout,
      description: 'Amount owed to trainers',
    },
    {
      title: "Kate's Income",
      value: totalOwnerCut,
      description: '30% from other trainers',
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
      {cards.map((card) => (
        <div key={card.title} className="space-y-2">
          <p className="text-sm font-medium text-gray-500">{card.title}</p>
          {isLoading ? (
            <div className="h-8 w-32 animate-pulse rounded bg-gray-100" />
          ) : (
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(card.value)}
            </p>
          )}
          <p className="text-xs text-gray-400">{card.description}</p>
        </div>
      ))}
    </div>
  )
}
