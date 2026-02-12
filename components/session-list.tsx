'use client'

import Link from 'next/link'
import { useTransition } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toggleSessionOpen } from '@/lib/actions/sessions'
import type { SessionWithCount } from '@/lib/actions/sessions'
import { formatDateFr } from '@/lib/utils'

interface SessionListProps {
  sessions: SessionWithCount[]
}

function SessionCard({ session }: { session: SessionWithCount }) {
  const [isPending, startTransition] = useTransition()

  function handleToggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    startTransition(async () => {
      await toggleSessionOpen(session.id)
    })
  }

  return (
    <Link href={`/staff/sessions/${session.id}`} className="block">
      <Card
        className={`transition-colors hover:border-(--color-primary)/30 ${
          session.is_open
            ? 'border-(--color-success) bg-(--color-success)/5'
            : ''
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold capitalize text-(--color-text)">
              {formatDateFr(session.date)}
            </p>
            {session.label && (
              <p className="mt-0.5 text-sm text-(--color-text-secondary) truncate">
                {session.label}
              </p>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-2">
              {session.recurring_schedule_id && (
                <Badge variant="info">Auto</Badge>
              )}
              <Badge variant="default">
                {session.nb_courts_planned} terrain{session.nb_courts_planned > 1 ? 's' : ''}
              </Badge>
              <Badge variant="skill">
                {session.preferred_team_size} par equipe
              </Badge>
              <Badge variant="warning">
                {session.attendance_count} present{session.attendance_count > 1 ? 's' : ''}
              </Badge>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <Badge variant={session.is_open ? 'success' : 'default'}>
              {session.is_open ? 'Ouverte' : 'Fermee'}
            </Badge>
            <Button
              variant={session.is_open ? 'secondary' : 'primary'}
              size="sm"
              loading={isPending}
              onClick={handleToggle}
            >
              {session.is_open ? 'Fermer' : 'Ouvrir'}
            </Button>
          </div>
        </div>
      </Card>
    </Link>
  )
}

export function SessionList({ sessions }: SessionListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {sessions.map((session) => (
        <SessionCard key={session.id} session={session} />
      ))}
    </div>
  )
}
