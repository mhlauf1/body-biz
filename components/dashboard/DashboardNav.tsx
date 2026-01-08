'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
  Users,
  CreditCard,
  BarChart3,
  Package,
  UserCog,
  Settings,
  LogOut,
  LayoutDashboard,
  Link as LinkIcon,
} from 'lucide-react'
import type { User } from '@/types'

interface DashboardNavProps {
  user: User
}

export function DashboardNav({ user }: DashboardNavProps) {
  const pathname = usePathname()
  const supabase = createClient()

  const isAdminOrManager = user.role === 'admin' || user.role === 'manager'

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Transactions', href: '/transactions', icon: CreditCard },
    { name: 'Customers', href: '/customers', icon: Users },
    { name: 'Create Link', href: '/create-link', icon: LinkIcon },
    ...(isAdminOrManager
      ? [
          { name: 'Reports', href: '/reports', icon: BarChart3 },
          { name: 'Programs', href: '/programs', icon: Package },
          { name: 'Team', href: '/team', icon: UserCog },
        ]
      : []),
    { name: 'Settings', href: '/settings', icon: Settings },
  ]

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <nav className="flex w-64 flex-col bg-white shadow-sm">
      <div className="flex h-16 items-center border-b border-gray-100 px-6">
        <span className="text-lg font-semibold tracking-tight text-gray-900">Body Biz</span>
      </div>

      <div className="flex flex-1 flex-col justify-between p-4">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href))
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              </li>
            )
          })}
        </ul>

        <div className="border-t border-gray-100 pt-4">
          <div className="mb-3 px-3">
            <p className="text-sm font-medium text-gray-900">{user.name}</p>
            <p className="text-xs capitalize text-gray-500">{user.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 hover:bg-gray-50"
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  )
}
