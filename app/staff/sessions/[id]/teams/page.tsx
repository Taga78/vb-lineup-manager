import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSession } from '@/lib/actions/sessions'
import { getGeneratedTeams } from '@/lib/actions/teams'
import { TeamDisplay } from '@/components/team-display'
import { formatDateFr } from '@/lib/utils'

export default async function TeamsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { data: session } = await getSession(id)

  if (!session) {
    notFound()
  }

  const { data: teams } = await getGeneratedTeams(id)

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/staff/sessions/${id}`}
          className="inline-flex items-center gap-1 text-sm text-(--color-text-secondary) hover:text-(--color-text) transition-colors min-h-[44px]"
        >
          &larr; Retour à la séance
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">Équipes</h1>
        <p className="text-sm text-(--color-text-secondary) capitalize mt-1">
          {formatDateFr(session.date)}
          {session.label && ` — ${session.label}`}
        </p>
        <p className="text-sm text-(--color-text-secondary) mt-0.5">
          {session.nb_courts_planned} terrain{session.nb_courts_planned > 1 ? 's' : ''} · {session.attendance_count} joueur{session.attendance_count !== 1 ? 's' : ''} présent{session.attendance_count !== 1 ? 's' : ''}
        </p>
      </div>

      <TeamDisplay sessionId={id} teams={teams} />
    </div>
  )
}
