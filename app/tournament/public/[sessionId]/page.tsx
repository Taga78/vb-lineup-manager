import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDateFr } from '@/lib/utils'
import type { Match, Standing, TournamentFormat } from '@/lib/types'
import { PublicTournamentView } from './public-view'

export default async function PublicTournamentPage({
  params,
}: {
  params: Promise<{ sessionId: string }>
}) {
  const { sessionId } = await params
  const supabase = await createClient()

  // Fetch session (public read)
  const { data: session } = await supabase
    .from('sessions')
    .select('id, date, label, format, type, nb_courts_planned')
    .eq('id', sessionId)
    .single()

  if (!session || session.type !== 'TOURNAMENT') {
    notFound()
  }

  const format = session.format as unknown as TournamentFormat

  // Fetch matches
  const { data: matchesRaw } = await supabase
    .from('matches')
    .select('id, session_id, team_a_id, team_b_id, score_a, score_b, winner_id, round, court_number, status, match_order')
    .eq('session_id', sessionId)
    .order('match_order')

  const matches: Match[] = (matchesRaw ?? []).map((m) => ({
    id: m.id,
    session_id: m.session_id,
    team_a_id: m.team_a_id,
    team_b_id: m.team_b_id,
    score_a: m.score_a,
    score_b: m.score_b,
    winner_id: m.winner_id,
    round: m.round,
    court_number: m.court_number,
    status: m.status as Match['status'],
    match_order: m.match_order,
  }))

  // Fetch standings
  const { data: standingsRaw } = await supabase
    .from('standings')
    .select('id, session_id, player_id, team_id, points, matches_played, wins, losses, points_diff, rank')
    .eq('session_id', sessionId)
    .order('rank')

  const standings: Standing[] = (standingsRaw ?? []).map((s) => ({
    id: s.id,
    session_id: s.session_id,
    player_id: s.player_id,
    team_id: s.team_id,
    points: s.points,
    matches_played: s.matches_played,
    wins: s.wins,
    losses: s.losses,
    points_diff: s.points_diff,
    rank: s.rank,
  }))

  // Fetch team names
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, court_number')
    .eq('session_id', sessionId)

  const teamNames: Record<string, string> = {}
  for (const t of teams ?? []) {
    teamNames[t.id] = t.name ?? `Terrain ${t.court_number}`
  }

  // Fetch player names for KOTH
  let playerNames: Record<string, string> | undefined
  if (format.mode === 'KOTH') {
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
    <div className="min-h-dvh bg-(--color-background)">
      <div className="mx-auto max-w-lg px-4 py-6 safe-area-top safe-area-bottom">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-1">
            <h1 className="text-xl font-bold">
              {session.label ?? 'Tournoi'}
            </h1>
            <Badge variant="info">
              {format.mode === 'CLASSIC' ? 'Classique' : 'KOTH'}
            </Badge>
          </div>
          <p className="text-sm text-(--color-text-secondary) capitalize">
            {formatDateFr(session.date)}
          </p>
        </div>

        <PublicTournamentView
          matches={matches}
          standings={standings}
          teamNames={teamNames}
          playerNames={playerNames}
          format={format}
        />
      </div>
    </div>
  )
}
