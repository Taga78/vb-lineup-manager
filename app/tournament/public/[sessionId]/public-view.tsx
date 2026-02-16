'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Match, Standing, TournamentFormat } from '@/lib/types'

interface PublicTournamentViewProps {
  matches: Match[]
  standings: Standing[]
  teamNames: Record<string, string>
  playerNames?: Record<string, string>
  format: TournamentFormat
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

export function PublicTournamentView({
  matches,
  standings,
  teamNames,
  playerNames,
  format,
}: PublicTournamentViewProps) {
  const [activeTab, setActiveTab] = useState<'live' | 'standings' | 'search'>(
    matches.some((m) => m.status === 'IN_PROGRESS') ? 'live' : 'standings'
  )
  const [searchQuery, setSearchQuery] = useState('')

  // Live matches (in progress + recently finished)
  const liveMatches = matches.filter((m) => m.status === 'IN_PROGRESS')
  const recentFinished = matches
    .filter((m) => m.status === 'FINISHED')
    .slice(-4)

  // Search results
  const filteredMatches = searchQuery.trim()
    ? matches.filter((m) => {
        const query = searchQuery.toLowerCase()
        const teamA = m.team_a_id ? (teamNames[m.team_a_id] ?? '').toLowerCase() : ''
        const teamB = m.team_b_id ? (teamNames[m.team_b_id] ?? '').toLowerCase() : ''
        return teamA.includes(query) || teamB.includes(query)
      })
    : []

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-(--color-border) rounded-lg p-1">
        <button
          className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors ${
            activeTab === 'live'
              ? 'bg-(--color-surface) text-(--color-text) shadow-sm'
              : 'text-(--color-text-secondary)'
          }`}
          onClick={() => setActiveTab('live')}
        >
          Scores en direct
        </button>
        <button
          className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors ${
            activeTab === 'standings'
              ? 'bg-(--color-surface) text-(--color-text) shadow-sm'
              : 'text-(--color-text-secondary)'
          }`}
          onClick={() => setActiveTab('standings')}
        >
          Classement
        </button>
        <button
          className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors ${
            activeTab === 'search'
              ? 'bg-(--color-surface) text-(--color-text) shadow-sm'
              : 'text-(--color-text-secondary)'
          }`}
          onClick={() => setActiveTab('search')}
        >
          Mon parcours
        </button>
      </div>

      {/* Live Tab */}
      {activeTab === 'live' && (
        <div className="space-y-3">
          {liveMatches.length > 0 && (
            <>
              <h3 className="text-xs font-semibold text-(--color-text-secondary) uppercase tracking-wide">
                En cours
              </h3>
              {liveMatches.map((match) => (
                <PublicMatchCard key={match.id} match={match} teamNames={teamNames} />
              ))}
            </>
          )}

          {liveMatches.length === 0 && (
            <Card>
              <p className="text-center text-(--color-text-secondary) text-sm py-4">
                Aucun match en cours.
              </p>
            </Card>
          )}

          {recentFinished.length > 0 && (
            <>
              <h3 className="text-xs font-semibold text-(--color-text-secondary) uppercase tracking-wide mt-4">
                Derniers résultats
              </h3>
              {recentFinished.map((match) => (
                <PublicMatchCard key={match.id} match={match} teamNames={teamNames} />
              ))}
            </>
          )}
        </div>
      )}

      {/* Standings Tab */}
      {activeTab === 'standings' && (
        <PublicStandingsTable
          standings={standings}
          teamNames={teamNames}
          playerNames={playerNames}
          isKoth={format.mode === 'KOTH'}
        />
      )}

      {/* Search Tab */}
      {activeTab === 'search' && (
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Rechercher une équipe..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-(--color-primary)"
          />

          {searchQuery.trim() && filteredMatches.length === 0 && (
            <Card>
              <p className="text-center text-(--color-text-secondary) text-sm py-4">
                Aucun match trouvé.
              </p>
            </Card>
          )}

          {filteredMatches.map((match) => (
            <PublicMatchCard key={match.id} match={match} teamNames={teamNames} />
          ))}
        </div>
      )}
    </div>
  )
}

function PublicMatchCard({
  match,
  teamNames,
}: {
  match: Match
  teamNames: Record<string, string>
}) {
  const teamA = match.team_a_id ? teamNames[match.team_a_id] ?? 'Équipe A' : 'TBD'
  const teamB = match.team_b_id ? teamNames[match.team_b_id] ?? 'Équipe B' : 'TBD'

  return (
    <Card padding="sm">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-(--color-text-secondary)">
          {formatRoundName(match.round)} · Terrain {match.court_number}
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
        <span className="text-lg font-bold px-2">
          {match.status === 'SCHEDULED' ? 'vs' : `${match.score_a} - ${match.score_b}`}
        </span>
        <div className="flex-1">
          <span className={`text-sm font-medium ${match.winner_id === match.team_b_id ? 'text-(--color-success) font-bold' : ''}`}>
            {teamB}
          </span>
        </div>
      </div>
    </Card>
  )
}

function PublicStandingsTable({
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
          Le classement sera disponible après les premiers matchs.
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
              <th className="py-2 px-2 text-center">V/D</th>
              <th className="py-2 px-2 text-center">Diff</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s, i) => {
              const name = isKoth
                ? (s.player_id && playerNames ? playerNames[s.player_id] : '?')
                : (s.team_id ? teamNames[s.team_id] ?? '?' : '?')

              return (
                <tr
                  key={s.id}
                  className={`border-t border-(--color-border) ${i < 3 ? 'font-semibold' : ''}`}
                >
                  <td className="py-2 px-2">
                    {i === 0 ? '1' : i === 1 ? '2' : i === 2 ? '3' : s.rank ?? '-'}
                  </td>
                  <td className="py-2 px-2">{name}</td>
                  <td className="py-2 px-2 text-center font-bold">{s.points}</td>
                  <td className="py-2 px-2 text-center">{s.wins}/{s.losses}</td>
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

function formatRoundName(round: string): string {
  const labels: Record<string, string> = {
    FINAL: 'Finale',
    SEMI_FINAL: 'Demi-finales',
    QUARTER_FINAL: 'Quarts',
    ROUND_16: '8èmes',
  }

  if (round.startsWith('POOL_')) return `Poule ${round.replace('POOL_', '')}`
  if (round.startsWith('ROUND_')) return `R${round.replace('ROUND_', '')}`
  return labels[round] ?? round
}
