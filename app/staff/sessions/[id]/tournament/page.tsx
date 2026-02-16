import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSession } from '@/lib/actions/sessions'
import { hasTeamsForSession } from '@/lib/actions/teams'
import {
  getTournamentMatches,
  getTournamentStandings,
  getTeamNames,
} from '@/lib/actions/tournament'
import { TournamentDashboard } from '@/components/tournament-dashboard'
import { Badge } from '@/components/ui/badge'
import { formatDateFr } from '@/lib/utils'
import type { TournamentFormat } from '@/lib/types'

export default async function TournamentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { data: session } = await getSession(id)

  if (!session || session.type !== 'TOURNAMENT') {
    notFound()
  }

  const [
    { data: matches },
    { data: standings },
    teamNamesMap,
    hasTeams,
  ] = await Promise.all([
    getTournamentMatches(id),
    getTournamentStandings(id),
    getTeamNames(id),
    hasTeamsForSession(id),
  ])

  const teamNames = Object.fromEntries(teamNamesMap)
  const format = session.format as unknown as TournamentFormat

  // For KOTH, fetch player names from standings
  let playerNames: Record<string, string> | undefined
  if (format.mode === 'KOTH' && standings.length > 0) {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const playerIds = standings.map((s) => s.player_id).filter(Boolean) as string[]
    if (playerIds.length > 0) {
      const { data: players } = await supabase
        .from('players')
        .select('id, name')
        .in('id', playerIds)
      playerNames = Object.fromEntries((players ?? []).map((p) => [p.id, p.name]))
    }
  }

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
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-bold">Tournoi</h1>
          <Badge variant="info">
            {format.mode === 'CLASSIC' ? 'Classique' : 'King of the Hill'}
          </Badge>
        </div>
        <p className="text-sm text-(--color-text-secondary) capitalize">
          {formatDateFr(session.date)}
          {session.label && ` — ${session.label}`}
        </p>
        <p className="text-sm text-(--color-text-secondary) mt-0.5">
          {session.nb_courts_planned} terrain{session.nb_courts_planned > 1 ? 's' : ''} · {session.attendance_count} joueur{session.attendance_count !== 1 ? 's' : ''}
        </p>
      </div>

      <TournamentDashboard
        sessionId={id}
        matches={matches}
        standings={standings}
        teamNames={teamNames}
        playerNames={playerNames}
        format={format}
        hasTeams={hasTeams}
      />
    </div>
  )
}
