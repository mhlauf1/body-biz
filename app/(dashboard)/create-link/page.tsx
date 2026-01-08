import { requireAuth, isAdminOrManager } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { PaymentLinkForm } from '@/components/payments/PaymentLinkForm'

type PageProps = {
  searchParams: Promise<{ customer_id?: string }>
}

export default async function CreateLinkPage({ searchParams }: PageProps) {
  const user = await requireAuth()
  const supabase = await createClient()
  const userIsAdminOrManager = isAdminOrManager(user)
  const { customer_id } = await searchParams

  // Build client query based on role
  let clientQuery = supabase
    .from('clients')
    .select(`
      *,
      assigned_trainer:users!clients_assigned_trainer_id_fkey(id, name)
    `)
    .eq('is_active', true)
    .order('name')

  // Trainers only see their own clients
  if (!userIsAdminOrManager) {
    clientQuery = clientQuery.eq('assigned_trainer_id', user.id)
  }

  const { data: clients } = await clientQuery

  // Get trainers
  const { data: trainers } = await supabase
    .from('users')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  // Get programs
  const { data: programs } = await supabase
    .from('programs')
    .select('*')
    .eq('is_active', true)
    .order('name')

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create Payment Link</h1>
        <p className="text-gray-600">
          Generate a payment link to send to your customer.
        </p>
      </div>

      <PaymentLinkForm
        clients={clients || []}
        trainers={trainers || []}
        programs={programs || []}
        currentUser={user}
        isAdminOrManager={userIsAdminOrManager}
        preselectedClientId={customer_id}
      />
    </div>
  )
}
