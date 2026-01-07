import { requireAuth, isAdminOrManager } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { ClientForm } from '@/components/clients/ClientForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function NewClientPage() {
  const user = await requireAuth()
  const supabase = await createClient()
  const userIsAdminOrManager = isAdminOrManager(user)

  // Get trainers for dropdown
  const { data: trainers } = await supabase
    .from('users')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/clients"
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Clients
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Add New Client</h1>
        <p className="text-gray-600">
          Enter the client&apos;s information below.
        </p>
      </div>

      <ClientForm
        trainers={trainers || []}
        currentUser={user}
        isAdminOrManager={userIsAdminOrManager}
        mode="create"
      />
    </div>
  )
}
