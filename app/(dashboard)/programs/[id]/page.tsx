import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { ProgramForm } from '@/components/programs/ProgramForm'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

type Params = Promise<{ id: string }>

export default async function EditProgramPage({
  params,
}: {
  params: Params
}) {
  // Only admin/manager can edit programs
  await requireRole(['admin', 'manager'])

  const { id } = await params
  const supabase = await createClient()

  // Fetch the program
  const { data: program, error } = await supabase
    .from('programs')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !program) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/programs"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Programs
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Edit Program</h1>
        <p className="text-gray-600">
          Update the details for {program.name}.
        </p>
      </div>

      <ProgramForm mode="edit" program={program} />
    </div>
  )
}
