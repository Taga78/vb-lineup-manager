'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import type { Match, Standing, TournamentFormat } from '@/lib/types'
import {
  updateMatchScore,
  startMatch,
  generateTournamentPoolMatches,
  generatePlayoffs,
  generateKothRound,
} from '@/lib/actions/tournament'

interface TournamentDashboardProps {
  sessionId: string
  matches: Match[]
  standings: Standing[]
  teamNames: Record<string, string>
  playerNames?: Record<string, string>
  format: TournamentFormat
  hasTeams: boolean
}

const statusLabels: Record<string, string> = {
  SCHEDULED: 'Programmé',
  IN_PROGRESS: 'En cours',
  FINISHED: 'Terminé',
}

const statusVariants: Record<string, 'default' | 'warning' | 'success'> = {
  SCHEDULED: 'default',
  IN_PROGRESS: 'warning',
  FINISHED: 'success',
}

export function TournamentDashboard({
  sessionId,
  matches,
  standings,
  teamNames,
  playerNames,
  format,
  hasTeams,
}: TournamentDashboardProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState<'matches' | 'standings'>('matches')

  const handleLaunchTournament = () => {
    startTransition(async () => {
      let result
      if (format.mode === 'CLASSIC') {
        result = await generateTournamentPoolMatches(sessionId)
      } else {
        result = await generateKothRound(sessionId)
      }

      if (result.success) {
        toast('Tournoi lancé')
        router.refresh()
      } else {
        toast(result.error ?? 'Erreur', 'error')
      }
    })
  }

  const handleGeneratePlayoffs = () => {
    startTransition(async () => {
      const result = await generatePlayoffs(sessionId)
      if (result.success) {
        toast('Play-offs générés')
        router.refresh()
      } else {
        toast(result.error ?? 'Erreur', 'error')
      }
    })
  }

  const handleNextKothRound = () => {
    startTransition(async () => {
      const result = await generateKothRound(sessionId)
      if (result.success) {
        toast('Round suivant généré')
        router.refresh()
      } else {
        toast(result.error ?? 'Erreur', 'error')
      }
    })
  }

  // Group matches by round
  const matchesByRound = new Map<string, Match[]>()
  for (const match of matches) {
    const existing = matchesByRound.get(match.round) ?? []
    existing.push(match)
    matchesByRound.set(match.round, existing)
  }

  const allPoolsFinished = matches
    .filter((m) => m.round.startsWith('POOL_'))
    .every((m) => m.status === 'FINISHED')

  const hasPoolMatches = matches.some((m) => m.round.startsWith('POOL_'))
  const hasPlayoffs = matches.some(
    (m) => !m.round.startsWith('POOL_') && !m.round.startsWith('ROUND_')
  )

  const allKothFinished = matches.length > 0 && matches.every((m) => m.status === 'FINISHED')

  return (
    <div>
      {/* Actions */}
      <div className="mb-4 space-y-2 print:hidden">
        {matches.length === 0 && hasTeams && (
          <Button onClick={handleLaunchTournament} loading={isPending} className="w-full">
            Lancer le tournoi
          </Button>
        )}

        {format.mode === 'CLASSIC' && hasPoolMatches && allPoolsFinished && !hasPlayoffs && (
          <Button onClick={handleGeneratePlayoffs} loading={isPending} className="w-full">
            Générer les play-offs
          </Button>
        )}

        {format.mode === 'KOTH' && allKothFinished && (
          <Button onClick={handleNextKothRound} loading={isPending} className="w-full">
            Générer le round suivant
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-(--color-border) rounded-lg p-1">
        <button
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'matches'
              ? 'bg-(--color-surface) text-(--color-text) shadow-sm'
              : 'text-(--color-text-secondary)'
          }`}
          onClick={() => setActiveTab('matches')}
        >
          Matchs ({matches.length})
        </button>
        <button
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'standings'
              ? 'bg-(--color-surface) text-(--color-text) shadow-sm'
              : 'text-(--color-text-secondary)'
          }`}
          onClick={() => setActiveTab('standings')}
        >
          Classement ({standings.length})
        </button>
      </div>

      {/* Matches Tab */}
      {activeTab === 'matches' && (
        <div className="space-y-4">
          {matches.length === 0 ? (
            <Card>
              <p className="text-center text-(--color-text-secondary) text-sm py-4">
                {hasTeams
                  ? 'Lancez le tournoi pour générer les matchs.'
                  : 'Créez d\'abord les équipes depuis l\'onglet Équipes.'}
              </p>
            </Card>
          ) : (
            Array.from(matchesByRound.entries()).map(([round, roundMatches]) => (
              <div key={round}>
                <h3 className="text-sm font-semibold text-(--color-text-secondary) uppercase tracking-wide mb-2">
                  {formatRoundName(round)}
                </h3>
                <div className="space-y-2">
                  {roundMatches.map((match) => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      teamNames={teamNames}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Standings Tab */}
      {activeTab === 'standings' && (
        <StandingsTable
          standings={standings}
          teamNames={teamNames}
          playerNames={playerNames}
          isKoth={format.mode === 'KOTH'}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Match Card
// ---------------------------------------------------------------------------

function MatchCard({
  match,
  teamNames,
}: {
  match: Match
  teamNames: Record<string, string>
}) {
  const { toast } = useToast()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [scoreA, setScoreA] = useState(match.score_a ?? 0)
  const [scoreB, setScoreB] = useState(match.score_b ?? 0)

  const teamA = match.team_a_id ? teamNames[match.team_a_id] ?? 'Équipe A' : 'TBD'
  const teamB = match.team_b_id ? teamNames[match.team_b_id] ?? 'Équipe B' : 'TBD'

  const handleStart = () => {
    startTransition(async () => {
      const result = await startMatch(match.id)
      if (result.success) {
        toast('Match démarré')
        router.refresh()
      } else {
        toast(result.error ?? 'Erreur', 'error')
      }
    })
  }

  const handleFinish = () => {
    if (scoreA === scoreB) {
      toast('Le score ne peut pas être à égalité', 'error')
      return
    }
    startTransition(async () => {
      const result = await updateMatchScore(match.id, scoreA, scoreB, true)
      if (result.success) {
        toast('Match terminé')
        router.refresh()
      } else {
        toast(result.error ?? 'Erreur', 'error')
      }
    })
  }

  const handleSaveScore = () => {
    startTransition(async () => {
      const result = await updateMatchScore(match.id, scoreA, scoreB, false)
      if (result.success) {
        router.refresh()
      } else {
        toast(result.error ?? 'Erreur', 'error')
      }
    })
  }

  return (
    <Card padding="sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-(--color-text-secondary)">
          Terrain {match.court_number}
        </span>
        <Badge variant={statusVariants[match.status]}>
          {statusLabels[match.status]}
        </Badge>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 text-right">
          <span className={`text-sm font-medium ${match.winner_id === match.team_a_id ? 'text-(--color-success) font-bold' : ''}`}>
            {teamA}
          </span>
        </div>

        {match.status === 'SCHEDULED' ? (
          <span className="text-lg font-bold text-(--color-text-secondary) px-2">vs</span>
        ) : (
          <div className="flex items-center gap-1 px-2">
            {match.status === 'IN_PROGRESS' ? (
              <>
                <input
                  type="number"
                  min={0}
                  value={scoreA}
                  onChange={(e) => setScoreA(parseInt(e.target.value, 10) || 0)}
                  className="w-12 text-center text-lg font-bold rounded border border-(--color-border) bg-(--color-surface) py-0.5"
                />
                <span className="text-lg font-bold text-(--color-text-secondary)">-</span>
                <input
                  type="number"
                  min={0}
                  value={scoreB}
                  onChange={(e) => setScoreB(parseInt(e.target.value, 10) || 0)}
                  className="w-12 text-center text-lg font-bold rounded border border-(--color-border) bg-(--color-surface) py-0.5"
                />
              </>
            ) : (
              <span className="text-lg font-bold">
                {match.score_a} - {match.score_b}
              </span>
            )}
          </div>
        )}

        <div className="flex-1">
          <span className={`text-sm font-medium ${match.winner_id === match.team_b_id ? 'text-(--color-success) font-bold' : ''}`}>
            {teamB}
          </span>
        </div>
      </div>

      {/* Actions */}
      {match.status !== 'FINISHED' && (
        <div className="flex gap-2 mt-2 print:hidden">
          {match.status === 'SCHEDULED' && (
            <Button size="sm" variant="secondary" onClick={handleStart} loading={isPending} className="flex-1">
              Démarrer
            </Button>
          )}
          {match.status === 'IN_PROGRESS' && (
            <>
              <Button size="sm" variant="secondary" onClick={handleSaveScore} loading={isPending} className="flex-1">
                Sauver
              </Button>
              <Button size="sm" variant="primary" onClick={handleFinish} loading={isPending} className="flex-1">
                Terminer
              </Button>
            </>
          )}
        </div>
      )}
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Standings Table
// ---------------------------------------------------------------------------

function StandingsTable({
  standings,
  teamNames,
  playerNames,
  isKoth,
}: {
  standings: Standing[]
  teamNames: Record<string, string>
  playerNames?: Record<string, string>
  isKoth: boolean
}) {
  if (standings.length === 0) {
    return (
      <Card>
        <p className="text-center text-(--color-text-secondary) text-sm py-4">
          Aucun classement disponible. Terminez des matchs pour voir le classement.
        </p>
      </Card>
    )
  }

  return (
    <Card padding="sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-(--color-text-secondary) text-xs uppercase tracking-wide">
              <th className="py-2 px-2">#</th>
              <th className="py-2 px-2">{isKoth ? 'Joueur' : 'Équipe'}</th>
              <th className="py-2 px-2 text-center">Pts</th>
              <th className="py-2 px-2 text-center">V</th>
              <th className="py-2 px-2 text-center">D</th>
              <th className="py-2 px-2 text-center">Diff</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s) => {
              const name = isKoth
                ? (s.player_id && playerNames ? playerNames[s.player_id] : '?')
                : (s.team_id ? teamNames[s.team_id] ?? '?' : '?')

              return (
                <tr key={s.id} className="border-t border-(--color-border)">
                  <td className="py-2 px-2 font-bold">{s.rank ?? '-'}</td>
                  <td className="py-2 px-2 font-medium">{name}</td>
                  <td className="py-2 px-2 text-center font-bold">{s.points}</td>
                  <td className="py-2 px-2 text-center text-(--color-success)">{s.wins}</td>
                  <td className="py-2 px-2 text-center text-(--color-danger)">{s.losses}</td>
                  <td className="py-2 px-2 text-center">
                    <span className={s.points_diff > 0 ? 'text-(--color-success)' : s.points_diff < 0 ? 'text-(--color-danger)' : ''}>
                      {s.points_diff > 0 ? '+' : ''}{s.points_diff}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRoundName(round: string): string {
  const labels: Record<string, string> = {
    FINAL: 'Finale',
    SEMI_FINAL: 'Demi-finales',
    QUARTER_FINAL: 'Quarts de finale',
    ROUND_16: 'Huitièmes de finale',
  }

  if (round.startsWith('POOL_')) {
    return `Poule ${round.replace('POOL_', '')}`
  }

  if (round.startsWith('ROUND_')) {
    return `Round ${round.replace('ROUND_', '')}`
  }

  return labels[round] ?? round
}
