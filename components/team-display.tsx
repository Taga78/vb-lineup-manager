'use client'

import { useState, useTransition, useMemo, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { generateAndSaveTeams, swapPlayers, type SavedTeam } from '@/lib/actions/teams'
import { getGuestsForSession } from '@/lib/actions/attendance'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { SkillRadar } from '@/components/ui/skill-radar'
import { useToast } from '@/components/ui/toast'
import { skillColor, overallSkill, computeTeamAvgSkills } from '@/lib/utils'
import { SKILL_LABELS, type SkillKey } from '@/lib/types'

interface TeamDisplayProps {
  sessionId: string
  teams: SavedTeam[]
}

export function TeamDisplay({ sessionId, teams: initialTeams }: TeamDisplayProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState<{
    playerId: string
    teamId: string
  } | null>(null)
  const [localTeams, setLocalTeams] = useState<SavedTeam[]>(initialTeams)
  const [isSwapping, setIsSwapping] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  // Sync with server data when initialTeams changes (after router.refresh)
  const teams = editMode ? localTeams : initialTeams

  // Reset local state when initialTeams change from server
  useEffect(() => {
    setLocalTeams(initialTeams)
  }, [initialTeams])

  const doGenerate = () => {
    setError(null)
    startTransition(async () => {
      const result = await generateAndSaveTeams(sessionId)
      if (!result.success) {
        setError(result.error)
        toast(result.error, 'error')
      } else {
        toast('Équipes générées')
        router.refresh()
      }
    })
  }

  const handleGenerate = async () => {
    setError(null)

    try {
      const result = await getGuestsForSession(sessionId)
      const unverified = result?.data ?? []

      if (unverified.length > 0) {
        const names = unverified.map((g: { name: string }) => g.name).join(', ')
        setError(
          `Impossible de générer : ${unverified.length} invité${unverified.length > 1 ? 's' : ''} non vérifié${unverified.length > 1 ? 's' : ''} (${names}). Modifiez leurs compétences depuis la page de présence.`
        )
        return
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue'
      setError(`Erreur lors de la vérification des invités : ${message}`)
      return
    }

    doGenerate()
  }

  const handleToggleEditMode = () => {
    if (editMode) {
      // Exiting edit mode — sync with server
      setSelectedPlayer(null)
      setEditMode(false)
      router.refresh()
    } else {
      setLocalTeams(initialTeams)
      setEditMode(true)
    }
  }

  const handlePlayerTap = useCallback(async (playerId: string, teamId: string) => {
    if (!editMode || isSwapping) return

    if (!selectedPlayer) {
      // First selection
      setSelectedPlayer({ playerId, teamId })
      return
    }

    if (selectedPlayer.playerId === playerId && selectedPlayer.teamId === teamId) {
      // Tap same player — deselect
      setSelectedPlayer(null)
      return
    }

    // Second selection — perform swap
    const p1 = selectedPlayer
    const p2 = { playerId, teamId }
    setSelectedPlayer(null)
    setIsSwapping(true)

    // Optimistic update: swap players in local state
    setLocalTeams((prev) => {
      const next = prev.map((t) => ({ ...t, players: [...t.players] }))
      const team1 = next.find((t) => t.id === p1.teamId)
      const team2 = next.find((t) => t.id === p2.teamId)
      if (!team1 || !team2) return prev

      const idx1 = team1.players.findIndex((p) => p.id === p1.playerId)
      const idx2 = team2.players.findIndex((p) => p.id === p2.playerId)
      if (idx1 === -1 || idx2 === -1) return prev

      // Swap
      const temp = team1.players[idx1]
      team1.players[idx1] = team2.players[idx2]
      team2.players[idx2] = temp

      // Recalculate averages
      team1.avgSkills = computeTeamAvgSkills(team1.players)
      team2.avgSkills = computeTeamAvgSkills(team2.players)

      return next
    })

    // Server call
    const result = await swapPlayers(p1, p2)
    setIsSwapping(false)

    if (!result.success) {
      // Revert on error
      setLocalTeams(initialTeams)
      toast(result.error ?? 'Erreur lors de l\'échange', 'error')
    } else {
      toast('Joueurs échangés')
    }
  }, [editMode, isSwapping, selectedPlayer, initialTeams, toast])

  // Group teams by court
  const sortedCourts = useMemo(() => {
    const courts = new Map<number, SavedTeam[]>()
    for (const team of teams) {
      const existing = courts.get(team.court_number) ?? []
      existing.push(team)
      courts.set(team.court_number, existing)
    }
    return Array.from(courts.entries()).sort(([a], [b]) => a - b)
  }, [teams])

  const isSelected = (playerId: string, teamId: string) =>
    selectedPlayer?.playerId === playerId && selectedPlayer?.teamId === teamId

  return (
    <div>
      {/* Action buttons */}
      <div className="mb-4 print:hidden">
        <div className="flex gap-2">
          <Button
            variant="primary"
            className="flex-1"
            onClick={handleGenerate}
            loading={isPending}
          >
            {teams.length > 0 ? 'Régénérer les équipes' : 'Générer les équipes'}
          </Button>
          {teams.length > 0 && (
            <>
              <Button
                variant={editMode ? 'primary' : 'secondary'}
                onClick={handleToggleEditMode}
              >
                {editMode ? 'Terminer' : 'Ajuster'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => window.print()}
              >
                Imprimer
              </Button>
            </>
          )}
        </div>
        {editMode && (
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="info">Mode édition</Badge>
            <span className="text-xs text-(--color-text-secondary)">
              {selectedPlayer ? 'Tapez un autre joueur pour échanger' : 'Tapez un joueur pour le sélectionner'}
            </span>
          </div>
        )}
        {error && (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        )}
      </div>

      {/* Teams display */}
      {teams.length === 0 ? (
        <EmptyState
          title="Aucune équipe générée"
          description="Cliquez sur le bouton ci-dessus pour générer les équipes à partir des joueurs présents."
        />
      ) : (
        <div className="space-y-6">
          {sortedCourts.map(([courtNumber, courtTeams]) => (
            <Card key={courtNumber} padding="lg">
              <h3 className="text-base font-bold mb-4 text-center">
                Terrain {courtNumber}
              </h3>

              <div className="grid grid-cols-2 gap-3">
                {courtTeams.map((team) => (
                  <div key={team.id}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold">
                        {team.name ?? `Équipe ${team.court_number}`}
                      </span>
                      <Badge variant="skill">
                        Moy. {team.avgSkills.overall}
                      </Badge>
                    </div>

                    {/* Team radar showing averages */}
                    <div className="flex justify-center mb-2">
                      <SkillRadar skills={team.avgSkills} size={56} showLabels />
                    </div>

                    {/* Skill averages per dimension */}
                    <div className="flex gap-0.5 justify-center mb-2">
                      {(['skill_service', 'skill_pass', 'skill_attack', 'skill_defense'] as SkillKey[]).map((key) => (
                        <span
                          key={key}
                          className="text-[10px] font-medium px-1 py-0.5 rounded whitespace-nowrap"
                          style={skillColor(Math.round(team.avgSkills[key]))}
                        >
                          {SKILL_LABELS[key][0]}: {team.avgSkills[key]}
                        </span>
                      ))}
                    </div>

                    <div className="space-y-1.5">
                      {team.players.map((player) => {
                        const overall = overallSkill(player)
                        const selected = isSelected(player.id, team.id)
                        return (
                          <div
                            key={player.id}
                            className={`flex items-center justify-between text-sm rounded-md px-1.5 py-1 transition-all ${
                              editMode
                                ? `cursor-pointer hover:bg-(--color-border)/50 ${
                                    selected
                                      ? 'player-selected ring-2 ring-(--color-primary) bg-(--color-primary)/10'
                                      : ''
                                  }`
                                : ''
                            }`}
                            onClick={() => editMode && handlePlayerTap(player.id, team.id)}
                          >
                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                              <SkillRadar skills={player} size={24} />
                              <span className="truncate">{player.name}</span>
                            </div>
                            <span
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ml-1"
                              style={skillColor(Math.round(overall))}
                            >
                              {overall}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
