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
    { name: 'Clients', href: '/clients', icon: Users },
    { name: 'Payments', href: '/payments', icon: CreditCard },
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
    <nav className="flex w-64 flex-col border-r border-gray-200 bg-white">
      <div className="flex h-16 items-center border-b border-gray-200 px-6">
        <span className="text-xl font-bold text-gray-900">Body Biz</span>
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
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              </li>
            )
          })}
        </ul>

        <div className="border-t border-gray-200 pt-4">
          <div className="mb-4 px-3">
            <p className="text-sm font-medium text-gray-900">{user.name}</p>
            <p className="text-xs capitalize text-gray-500">{user.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  )
}
