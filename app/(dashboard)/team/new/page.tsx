import { requireRole } from '@/lib/auth'
import { TeamMemberForm } from '@/components/team/TeamMemberForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function NewTeamMemberPage() {
  // Only admin/manager can add team members
  await requireRole(['admin', 'manager'])

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/team"
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Team
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Add Team Member</h1>
        <p className="text-gray-600">
          Add a new trainer or staff member. They will receive an email to set up their password.
        </p>
      </div>

      <TeamMemberForm mode="create" />
    </div>
  )
}
