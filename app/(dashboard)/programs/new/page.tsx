import { requireRole } from '@/lib/auth'
import { ProgramForm } from '@/components/programs/ProgramForm'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default async function NewProgramPage() {
  // Only admin/manager can create programs
  await requireRole(['admin', 'manager'])

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
        <h1 className="text-2xl font-bold text-gray-900">Add Program</h1>
        <p className="text-gray-600">
          Create a new service offering or pricing template.
        </p>
      </div>

      <ProgramForm mode="create" />
    </div>
  )
}
