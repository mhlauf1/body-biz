'use client'

import Link from 'next/link'
import { Zap, Link as LinkIcon, AlertCircle, Users, FileText } from 'lucide-react'

interface QuickAction {
  label: string
  description: string
  href: string
  icon: React.ReactNode
  variant?: 'default' | 'warning'
}

interface QuickActionsProps {
  failedPaymentsCount?: number
}

export function QuickActions({ failedPaymentsCount = 0 }: QuickActionsProps) {
  const actions: QuickAction[] = [
    {
      label: 'Charge Customer',
      description: 'Charge a saved payment method',
      href: '/customers',
      icon: <Zap className="h-5 w-5" />,
    },
    {
      label: 'Create Payment Link',
      description: 'Send a checkout link to a customer',
      href: '/create-link',
      icon: <LinkIcon className="h-5 w-5" />,
    },
    {
      label: 'View Failed Payments',
      description: failedPaymentsCount > 0 ? `${failedPaymentsCount} failed` : 'No failed payments',
      href: '/customers?status=failed',
      icon: <AlertCircle className="h-5 w-5" />,
      variant: failedPaymentsCount > 0 ? 'warning' : 'default',
    },
    {
      label: 'Add Customer',
      description: 'Create a new customer record',
      href: '/customers/new',
      icon: <Users className="h-5 w-5" />,
    },
    {
      label: 'View Reports',
      description: 'Commission and revenue reports',
      href: '/reports',
      icon: <FileText className="h-5 w-5" />,
    },
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {actions.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className={`
            flex items-center gap-3 rounded-lg border p-4 transition-all hover:shadow-sm
            ${action.variant === 'warning'
              ? 'border-amber-200 bg-amber-50 hover:border-amber-300'
              : 'border-gray-200 bg-white hover:border-gray-300'
            }
          `}
        >
          <div className={`
            flex h-10 w-10 items-center justify-center rounded-lg
            ${action.variant === 'warning'
              ? 'bg-amber-100 text-amber-600'
              : 'bg-gray-100 text-gray-600'
            }
          `}>
            {action.icon}
          </div>
          <div className="min-w-0">
            <p className={`font-medium ${action.variant === 'warning' ? 'text-amber-900' : 'text-gray-900'}`}>
              {action.label}
            </p>
            <p className={`text-sm truncate ${action.variant === 'warning' ? 'text-amber-600' : 'text-gray-500'}`}>
              {action.description}
            </p>
          </div>
        </Link>
      ))}
    </div>
  )
}
