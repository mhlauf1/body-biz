'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge, Button, Input, Select } from '@/components/ui'
import { formatRelativeTime } from '@/lib/utils'
import type { User, UserRole } from '@/types'
import { Mail, Phone, UserCog } from 'lucide-react'

interface TeamListProps {
  initialMembers: User[]
}

export function TeamList({ initialMembers }: TeamListProps) {
  const [members, setMembers] = useState(initialMembers)
  const [search, setSearch] = useState('')
  const [selectedRole, setSelectedRole] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const fetchMembers = async (searchTerm: string, role: string) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.set('search', searchTerm)
      if (role) params.set('role', role)

      const response = await fetch(`/api/team?${params.toString()}`)
      const data = await response.json()

      if (response.ok) {
        setMembers(data.data)
      }
    } catch (error) {
      console.error('Error fetching team members:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = (value: string) => {
    setSearch(value)
    // Debounce search
    const timeoutId = setTimeout(() => {
      fetchMembers(value, selectedRole)
    }, 300)
    return () => clearTimeout(timeoutId)
  }

  const handleRoleFilter = (value: string) => {
    setSelectedRole(value)
    fetchMembers(search, value)
  }

  const roleOptions = [
    { value: '', label: 'All Roles' },
    { value: 'admin', label: 'Admin' },
    { value: 'manager', label: 'Manager' },
    { value: 'trainer', label: 'Trainer' },
  ]

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'info'
      case 'manager':
        return 'warning'
      case 'trainer':
        return 'default'
      default:
        return 'default'
    }
  }

  const formatCommissionRate = (rate: number) => {
    return `${Math.round(rate * 100)}%`
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-4">
          <div className="max-w-xs flex-1">
            <Input
              placeholder="Search team members..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <div className="w-40">
            <Select
              options={roleOptions}
              value={selectedRole}
              onChange={(e) => handleRoleFilter(e.target.value)}
              placeholder="Filter by role"
            />
          </div>
        </div>
        <Link href="/team/new">
          <Button>+ Add Team Member</Button>
        </Link>
      </div>

      {/* Team Members Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                Contact
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                Role
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                Commission
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                Since
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
            ) : members.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                  No team members found
                </td>
              </tr>
            ) : (
              members.map((member, index) => (
                <tr
                  key={member.id}
                  className={`hover:bg-gray-50 transition-colors ${
                    index !== members.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  <td className="whitespace-nowrap px-4 py-4">
                    <Link href={`/team/${member.id}`} className="block">
                      <div className="flex items-center">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                          <UserCog className="h-5 w-5 text-gray-500" />
                        </div>
                        <div className="ml-4">
                          <div className="font-medium text-gray-900">
                            {member.name}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4">
                    <div className="flex flex-col gap-1 text-sm text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-4 w-4 text-gray-400" />
                        {member.email}
                      </div>
                      {member.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-4 w-4 text-gray-400" />
                          {member.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4">
                    <Badge variant={getRoleBadgeVariant(member.role as UserRole)}>
                      {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-600">
                    {formatCommissionRate(member.commission_rate)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">
                    {member.created_at && formatRelativeTime(new Date(member.created_at))}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-right">
                    <Link href={`/team/${member.id}`}>
                      <Button variant="ghost" size="sm">
                        View
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
        Showing {members.length} team member{members.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}
