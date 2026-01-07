import { format, formatDistanceToNow } from 'date-fns'

/**
 * Format a number as USD currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

/**
 * Calculate commission split based on trainer role
 * Admin (Kate): 100% to trainer, 0% to owner
 * Others: 70% to trainer, 30% to owner (Kate)
 */
export function calcCommission(
  amount: number,
  trainerRole: 'admin' | 'manager' | 'trainer'
): {
  trainerCommissionRate: number
  trainerAmount: number
  ownerAmount: number
} {
  if (trainerRole === 'admin') {
    return {
      trainerCommissionRate: 1.0,
      trainerAmount: amount,
      ownerAmount: 0,
    }
  }

  // Manager and trainer both get 70%
  const trainerCommissionRate = 0.7
  const trainerAmount = amount * trainerCommissionRate
  const ownerAmount = amount * 0.3

  return {
    trainerCommissionRate,
    trainerAmount: Math.round(trainerAmount * 100) / 100,
    ownerAmount: Math.round(ownerAmount * 100) / 100,
  }
}

/**
 * Format a date for display
 */
export function formatDate(
  date: Date | string,
  formatStr: string = 'MMM d, yyyy'
): string {
  return format(new Date(date), formatStr)
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

/**
 * Merge class names (simple version)
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

/**
 * Generate initials from a name
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
