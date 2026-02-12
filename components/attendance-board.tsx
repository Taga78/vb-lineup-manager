'use client'

import { useEffect, useState, useCallback, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getAttendance, checkIn, checkOut, registerGuest } from '@/lib/actions/attendance'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { SkillRadar } from '@/components/ui/skill-radar'
import { GuestSkillEditor } from '@/components/guest-skill-editor'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast'
import type { Player, SkillKey, GuestLevel } from '@/lib/types'
import { GUEST_LEVELS } from '@/lib/types'
import { overallSkill, skillColor } from '@/lib/utils'

/** Shape returned by Supabase for attendance with player join */
type AttendanceRow = {
  id: string
  player_id: string
  players: {
    name: string
    gender: string | null
    is_guest: boolean
    skills_verified: boolean
    skill_service: number
    skill_pass: number
    skill_attack: number
    skill_defense: number
  } | null
}

interface AttendanceWithPlayer {
  id: string
  player_id: string
  player_name: string
  gender: string | null
  is_guest: boolean
  skills_verified: boolean
  skill_service: number
  skill_pass: number
  skill_attack: number
  skill_defense: number
}

interface AttendanceBoardProps {
  sessionId: string
}

type AddTab = 'members' | 'guests'

export function AttendanceBoard({ sessionId }: AttendanceBoardProps) {
  const { toast } = useToast()
  const [attendances, setAttendances] = useState<AttendanceWithPlayer[]>([])
  const [allPlayers, setAllPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddPanel, setShowAddPanel] = useState(false)
  const [addTab, setAddTab] = useState<AddTab>('members')
  const [pendingPlayerIds, setPendingPlayerIds] = useState<Set<string>>(new Set())
  const [editingGuestId, setEditingGuestId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Guest form state
  const [showGuestForm, setShowGuestForm] = useState(false)
  const [guestName, setGuestName] = useState('')
  const [guestGender, setGuestGender] = useState<'M' | 'F'>('M')
  const [guestLevel, setGuestLevel] = useState<GuestLevel>('intermediate')
  const [guestSubmitting, setGuestSubmitting] = useState(false)

  // Fetch initial data
  useEffect(() => {
    async function init() {
      try {
        const supabase = createClient()

        const [attendanceResult, playersResult] = await Promise.all([
          getAttendance(sessionId),
          supabase
            .from('players')
            .select('id, name, gender, skill_service, skill_pass, skill_attack, skill_defense, is_active, is_guest')
            .eq('is_active', true)
            .order('name'),
        ])

        if (attendanceResult.data) {
          const rows = attendanceResult.data as AttendanceRow[]
          setAttendances(
            rows.map((a) => ({
              id: a.id,
              player_id: a.player_id,
              player_name: a.players?.name ?? 'Inconnu',
              gender: a.players?.gender ?? null,
              is_guest: a.players?.is_guest ?? false,
              skills_verified: a.players?.skills_verified ?? true,
              skill_service: a.players?.skill_service ?? 5,
              skill_pass: a.players?.skill_pass ?? 5,
              skill_attack: a.players?.skill_attack ?? 5,
              skill_defense: a.players?.skill_defense ?? 5,
            }))
          )
        }

        if (playersResult.data) {
          setAllPlayers(playersResult.data as Player[])
        }
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [sessionId])

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`staff-attendance-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendances',
          filter: `session_id=eq.${sessionId}`,
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const newRecord = payload.new as { id: string; player_id: string }

            // Look up the player details from local state
            const player = allPlayers.find((p) => p.id === newRecord.player_id)

            setAttendances((prev) => {
              if (prev.some((a) => a.player_id === newRecord.player_id)) {
                return prev
              }
              return [
                ...prev,
                {
                  id: newRecord.id,
                  player_id: newRecord.player_id,
                  player_name: player?.name ?? 'Inconnu',
                  gender: player?.gender ?? null,
                  is_guest: player?.is_guest ?? false,
                  skills_verified: false,
                  skill_service: player?.skill_service ?? 5,
                  skill_pass: player?.skill_pass ?? 5,
                  skill_attack: player?.skill_attack ?? 5,
                  skill_defense: player?.skill_defense ?? 5,
                },
              ]
            })
          } else if (payload.eventType === 'DELETE') {
            const oldRecord = payload.old as { id?: string; player_id?: string }
            setAttendances((prev) =>
              prev.filter(
                (a) => a.id !== oldRecord.id && a.player_id !== oldRecord.player_id
              )
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId, allPlayers])

  const presentPlayerIds = new Set(attendances.map((a) => a.player_id))
  const absentMembers = allPlayers.filter((p) => !presentPlayerIds.has(p.id) && !p.is_guest)
  const absentGuests = allPlayers.filter((p) => !presentPlayerIds.has(p.id) && p.is_guest)

  const handleCheckIn = useCallback(
    (playerId: string) => {
      setPendingPlayerIds((prev) => new Set(prev).add(playerId))

      startTransition(async () => {
        try {
          await checkIn(sessionId, playerId)
        } finally {
          setPendingPlayerIds((prev) => {
            const next = new Set(prev)
            next.delete(playerId)
            return next
          })
        }
      })
    },
    [sessionId]
  )

  const handleCheckOut = useCallback(
    (playerId: string) => {
      // Retrait optimiste immédiat
      setAttendances((prev) => prev.filter((a) => a.player_id !== playerId))

      setPendingPlayerIds((prev) => new Set(prev).add(playerId))

      startTransition(async () => {
        try {
          await checkOut(sessionId, playerId)
        } finally {
          setPendingPlayerIds((prev) => {
            const next = new Set(prev)
            next.delete(playerId)
            return next
          })
        }
      })
    },
    [sessionId]
  )

  const handleGuestSkillsSaved = useCallback(
    (playerId: string, skills: Record<SkillKey, number>) => {
      setAttendances((prev) =>
        prev.map((a) =>
          a.player_id === playerId ? { ...a, ...skills, skills_verified: true } : a
        )
      )
    },
    []
  )

  const handleGuestSubmit = async () => {
    setGuestSubmitting(true)

    try {
      const result = await registerGuest(sessionId, guestName, guestGender, guestLevel)

      if (!result.success) {
        toast(result.error ?? 'Erreur inconnue', 'error')
        return
      }

      // Ajouter l'invité à la liste locale
      if (result.player) {
        const newGuest = result.player as Player
        setAllPlayers((prev) => [...prev, newGuest].sort((a, b) => a.name.localeCompare(b.name)))
        // Attendance optimiste (realtime le confirmera)
        setAttendances((prev) => {
          if (prev.some((a) => a.player_id === newGuest.id)) return prev
          return [
            ...prev,
            {
              id: `guest-${newGuest.id}`,
              player_id: newGuest.id,
              player_name: newGuest.name,
              gender: newGuest.gender,
              is_guest: true,
              skills_verified: false,
              skill_service: newGuest.skill_service,
              skill_pass: newGuest.skill_pass,
              skill_attack: newGuest.skill_attack,
              skill_defense: newGuest.skill_defense,
            },
          ]
        })
      }

      toast('Invité ajouté.', 'success')
      setGuestName('')
      setGuestGender('M')
      setGuestLevel('intermediate')
      setShowGuestForm(false)
    } finally {
      setGuestSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner className="h-6 w-6 text-(--color-primary)" />
      </div>
    )
  }

  return (
    <div>
      {/* Header with counter */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Présences</h2>
        <Badge variant={attendances.length > 0 ? 'success' : 'default'}>
          {attendances.length} joueur{attendances.length !== 1 ? 's' : ''} présent
          {attendances.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Present players list */}
      {attendances.length === 0 ? (
        <EmptyState
          title="Aucun joueur présent"
          description="Les joueurs s'inscrivent depuis la page de présence ou vous pouvez les ajouter manuellement."
        />
      ) : (
        <div className="space-y-2 mb-4">
          {attendances
            .sort((a, b) => a.player_name.localeCompare(b.player_name))
            .map((attendance) => {
              const isPendingPlayer = pendingPlayerIds.has(attendance.player_id)
              const overall = overallSkill(attendance)
              const isEditing = editingGuestId === attendance.player_id

              return (
                <Card
                  key={attendance.player_id}
                  padding="sm"
                  className={`border-(--color-success)/30 bg-(--color-success)/5 ${isPendingPlayer ? 'opacity-70' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    {/* Green dot indicator */}
                    <div className="w-2.5 h-2.5 rounded-full bg-(--color-success) flex-shrink-0" />

                    {/* Player info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{attendance.player_name}</p>
                    </div>

                    {/* Badges */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {attendance.is_guest && (
                        <Badge variant={attendance.skills_verified ? 'default' : 'warning'}>
                          {attendance.skills_verified ? 'Invité' : 'Non vérifié'}
                        </Badge>
                      )}
                      <SkillRadar skills={attendance} size={28} />
                      {attendance.gender && (
                        <Badge variant="gender">{attendance.gender}</Badge>
                      )}
                      <Badge variant="skill" style={skillColor(Math.round(overall))}>{overall}</Badge>
                    </div>

                    {/* Edit guest skills button */}
                    {attendance.is_guest && (
                      <button
                        onClick={() =>
                          setEditingGuestId(isEditing ? null : attendance.player_id)
                        }
                        className="p-2 text-gray-400 hover:text-(--color-primary) transition-colors flex-shrink-0"
                        aria-label={`Modifier les skills de ${attendance.player_name}`}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    )}

                    {/* Remove button */}
                    <button
                      onClick={() => handleCheckOut(attendance.player_id)}
                      disabled={isPendingPlayer}
                      className="p-2 text-gray-400 hover:text-(--color-danger) transition-colors disabled:opacity-50 flex-shrink-0"
                      aria-label={`Retirer ${attendance.player_name}`}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Inline skill editor for guests */}
                  {isEditing && (
                    <GuestSkillEditor
                      playerId={attendance.player_id}
                      initialSkills={{
                        skill_service: attendance.skill_service,
                        skill_pass: attendance.skill_pass,
                        skill_attack: attendance.skill_attack,
                        skill_defense: attendance.skill_defense,
                      }}
                      onClose={() => setEditingGuestId(null)}
                      onSaved={(skills) => handleGuestSkillsSaved(attendance.player_id, skills)}
                    />
                  )}
                </Card>
              )
            })}
        </div>
      )}

      {/* Add player section */}
      {!showAddPanel ? (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowAddPanel(true)}
          className="w-full"
        >
          + Ajouter un joueur
        </Button>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-(--color-text-secondary)">
              Ajouter un joueur
            </h3>
            <button
              onClick={() => { setShowAddPanel(false); setShowGuestForm(false) }}
              className="text-sm text-(--color-primary) hover:text-(--color-primary-dark)"
            >
              Fermer
            </button>
          </div>

          {/* Tabs: Membres / Invités */}
          <div className="flex gap-1 mb-3 bg-(--color-border) rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => { setAddTab('members'); setShowGuestForm(false) }}
              className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                addTab === 'members'
                  ? 'bg-(--color-surface) text-(--color-text) shadow-sm'
                  : 'text-(--color-text-secondary) hover:text-(--color-text)'
              }`}
            >
              Membres ({absentMembers.length})
            </button>
            <button
              type="button"
              onClick={() => setAddTab('guests')}
              className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                addTab === 'guests'
                  ? 'bg-(--color-surface) text-(--color-text) shadow-sm'
                  : 'text-(--color-text-secondary) hover:text-(--color-text)'
              }`}
            >
              Invités ({absentGuests.length})
            </button>
          </div>

          {/* Tab content: Members */}
          {addTab === 'members' && (
            <>
              {absentMembers.length === 0 ? (
                <p className="text-sm text-(--color-text-secondary) text-center py-4">
                  Tous les membres sont présents
                </p>
              ) : (
                <div className="space-y-2">
                  {absentMembers.map((player) => (
                    <PlayerCheckInCard
                      key={player.id}
                      player={player}
                      isPending={pendingPlayerIds.has(player.id)}
                      onCheckIn={handleCheckIn}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* Tab content: Guests */}
          {addTab === 'guests' && (
            <div className="space-y-2">
              {/* Existing guests not present */}
              {absentGuests.map((player) => (
                <PlayerCheckInCard
                  key={player.id}
                  player={player}
                  isPending={pendingPlayerIds.has(player.id)}
                  onCheckIn={handleCheckIn}
                  isGuest
                />
              ))}

              {/* New guest form toggle */}
              {!showGuestForm ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowGuestForm(true)}
                  className="w-full"
                >
                  + Nouvel invité
                </Button>
              ) : (
                <Card>
                  <h4 className="text-sm font-semibold mb-3">Nouvel invité</h4>

                  {/* Nom */}
                  <div className="mb-3">
                    <label htmlFor="staff-guest-name" className="block text-sm font-medium mb-1">
                      Nom
                    </label>
                    <input
                      id="staff-guest-name"
                      type="text"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      maxLength={100}
                      placeholder="Prénom Nom"
                      className="w-full px-3 py-2 border border-(--color-border) rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-(--color-primary)"
                    />
                  </div>

                  {/* Genre */}
                  <div className="mb-3">
                    <label className="block text-sm font-medium mb-1">Genre</label>
                    <div className="flex gap-2">
                      {(['M', 'F'] as const).map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setGuestGender(g)}
                          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                            guestGender === g
                              ? 'bg-(--color-primary) text-white border-(--color-primary)'
                              : 'bg-(--color-surface) text-(--color-text) border-(--color-border) hover:opacity-80'
                          }`}
                        >
                          {g === 'M' ? 'Homme' : 'Femme'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Niveau */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Niveau</label>
                    <div className="flex gap-2">
                      {(Object.entries(GUEST_LEVELS) as [GuestLevel, typeof GUEST_LEVELS[GuestLevel]][]).map(
                        ([key, val]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setGuestLevel(key)}
                            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                              guestLevel === key
                                ? 'bg-(--color-primary) text-white border-(--color-primary)'
                                : 'bg-(--color-surface) text-(--color-text) border-(--color-border) hover:opacity-80'
                            }`}
                          >
                            {val.label}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowGuestForm(false)}
                      className="flex-1"
                    >
                      Annuler
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleGuestSubmit}
                      loading={guestSubmitting}
                      disabled={!guestName.trim()}
                      className="flex-1"
                    >
                      Ajouter
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/** Reusable card for checking in an absent player */
function PlayerCheckInCard({
  player,
  isPending,
  onCheckIn,
  isGuest,
}: {
  player: Player
  isPending: boolean
  onCheckIn: (id: string) => void
  isGuest?: boolean
}) {
  const overall = overallSkill(player)

  return (
    <Card
      padding="sm"
      className={`cursor-pointer hover:border-(--color-success)/50 transition-colors ${
        isPending ? 'opacity-70' : ''
      }`}
      onClick={() => onCheckIn(player.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onCheckIn(player.id)
        }
      }}
    >
      <div className="flex items-center gap-3">
        {/* Plus icon */}
        <div className="w-6 h-6 rounded-md border-2 border-dashed border-gray-300 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </div>

        {/* Player info */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{player.name}</p>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isGuest && <Badge variant="default">Invité</Badge>}
          <SkillRadar skills={player} size={28} />
          {player.gender && (
            <Badge variant="gender">{player.gender}</Badge>
          )}
          <Badge variant="skill" style={skillColor(Math.round(overall))}>{overall}</Badge>
        </div>
      </div>
    </Card>
  )
}
