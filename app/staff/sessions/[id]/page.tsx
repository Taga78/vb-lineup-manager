import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSession } from '@/lib/actions/sessions'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SessionToggleButton } from '@/components/session-toggle-button'
import { SessionDeleteButton } from '@/components/session-delete-button'
import { AttendanceBoard } from '@/components/attendance-board'
import { AttendanceLinkCard } from '@/components/attendance-link-card'
import { GenerateTeamsButton } from '@/components/generate-teams-button'
import { formatDateFr } from '@/lib/utils'

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { data: session, error } = await getSession(id)

  if (error || !session) {
    notFound()
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/staff/sessions"
          className="inline-flex items-center gap-1 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors min-h-[44px]"
        >
          &larr; Retour aux seances
        </Link>
      </div>

      {/* Session header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold capitalize">
            {formatDateFr(session.date)}
          </h1>
          {session.label && (
            <p className="mt-1 text-[var(--color-text-secondary)]">
              {session.label}
            </p>
          )}
        </div>
        <Badge variant={session.is_open ? 'success' : 'default'} className="mt-1">
          {session.is_open ? 'Ouverte' : 'Fermee'}
        </Badge>
      </div>

      {/* Session info card */}
      <Card className="mb-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wide">
              Terrains
            </p>
            <p className="text-lg font-semibold">{session.nb_courts_planned}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wide">
              Taille equipe
            </p>
            <p className="text-lg font-semibold">{session.preferred_team_size}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wide">
              Presents
            </p>
            <p className="text-lg font-semibold">{session.attendance_count}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wide">
              Statut
            </p>
            <p className="text-lg font-semibold">
              {session.is_open ? 'Ouverte' : 'Fermee'}
            </p>
          </div>
        </div>
      </Card>

      {/* Attendance link */}
      {session.is_open && (
        <AttendanceLinkCard />
      )}

      {/* Actions */}
      <div className="space-y-3 mb-6">
        <SessionToggleButton sessionId={session.id} isOpen={session.is_open} />

        <div className="grid grid-cols-2 gap-3">
          <Link href={`/staff/sessions/${session.id}/edit`}>
            <Button variant="secondary" className="w-full">
              Modifier
            </Button>
          </Link>
          <GenerateTeamsButton sessionId={session.id} />
        </div>

        <SessionDeleteButton sessionId={session.id} />
      </div>

      {/* Attendance board (realtime) */}
      <AttendanceBoard sessionId={session.id} />
    </div>
  )
}
