import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSession } from '@/lib/actions/sessions'
import { SessionForm } from '@/components/session-form'

export default async function EditSessionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { data: session } = await getSession(id)

  if (!session) {
    notFound()
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/staff/sessions/${id}`}
          className="inline-flex items-center gap-1 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors min-h-[44px]"
        >
          &larr; Retour à la séance
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-6">Modifier la séance</h1>

      <SessionForm
        session={{
          id: session.id,
          date: session.date,
          label: session.label,
          nb_courts_planned: session.nb_courts_planned,
          preferred_team_size: session.preferred_team_size,
        }}
      />
    </div>
  )
}
