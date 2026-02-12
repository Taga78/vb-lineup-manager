'use client'

import { useEffect, useState, useCallback, useTransition, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getOpenSession, checkIn, checkOut, registerGuest } from '@/lib/actions/attendance'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { AlphabetSidebar } from '@/components/ui/alphabet-sidebar'
import { Spinner } from '@/components/ui/spinner'
import Link from 'next/link'
import type { Session, Player, GuestLevel } from '@/lib/types'
import { GUEST_LEVELS } from '@/lib/types'
import { formatDateFr } from '@/lib/utils'

interface AttendanceEntry {
  id: string
  player_id: string
}

export default function AttendPage() {
  const [session, setSession] = useState<Session | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [guestPlayers, setGuestPlayers] = useState<Player[]>([])
  const [attendances, setAttendances] = useState<AttendanceEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [pendingPlayerIds, setPendingPlayerIds] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()

  // Guest form state
  const [showGuestForm, setShowGuestForm] = useState(false)
  const [guestName, setGuestName] = useState('')
  const [guestGender, setGuestGender] = useState<'M' | 'F'>('M')
  const [guestLevel, setGuestLevel] = useState<GuestLevel>('intermediate')
  const [guestSubmitting, setGuestSubmitting] = useState(false)
  const [guestError, setGuestError] = useState<string | null>(null)
  const [newGuestIds, setNewGuestIds] = useState<Set<string>>(new Set())

  // Fetch open session on mount
  useEffect(() => {
    async function init() {
      try {
        const { data: rawSession } = await getOpenSession()

        if (!rawSession) {
          setLoading(false)
          return
        }

        const openSession = rawSession as Session
        setSession(openSession)

        const supabase = createClient()

        // Fetch active members (non-guests) and current attendances in parallel
        const [playersResult, guestsResult, attendancesResult] = await Promise.all([
          supabase
            .from('players')
            .select('id, name, gender, skill_service, skill_pass, skill_attack, skill_defense, is_active, is_guest')
            .eq('is_active', true)
            .eq('is_guest', false)
            .order('name'),
          supabase
            .from('players')
            .select('id, name, gender, skill_service, skill_pass, skill_attack, skill_defense, is_active, is_guest')
            .eq('is_active', true)
            .eq('is_guest', true)
            .order('name'),
          supabase
            .from('attendances')
            .select('id, player_id')
            .eq('session_id', openSession.id),
        ])

        if (playersResult.data) {
          setPlayers(playersResult.data)
        }

        if (guestsResult.data) {
          const guests = guestsResult.data
          setGuestPlayers(guests)

          // Déterminer quels invités sont "nouveaux" (une seule attendance = première venue)
          if (guests.length > 0 && attendancesResult.data) {
            const presentGuestIds = guests
              .filter((g) => attendancesResult.data!.some((a) => a.player_id === g.id))
              .map((g) => g.id)

            if (presentGuestIds.length > 0) {
              const { data: allGuestAttendances } = await supabase
                .from('attendances')
                .select('player_id')
                .in('player_id', presentGuestIds)

              if (allGuestAttendances) {
                const counts = new Map<string, number>()
                for (const a of allGuestAttendances) {
                  counts.set(a.player_id, (counts.get(a.player_id) ?? 0) + 1)
                }
                const newIds = new Set(
                  presentGuestIds.filter((id) => (counts.get(id) ?? 0) <= 1)
                )
                setNewGuestIds(newIds)
              }
            }
          }
        }

        if (attendancesResult.data) {
          setAttendances(attendancesResult.data)
        }
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [])

  // Realtime subscription
  useEffect(() => {
    if (!session) return

    const supabase = createClient()
    const channel = supabase
      .channel('attendance-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendances',
          filter: `session_id=eq.${session.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newRecord = payload.new as { id: string; player_id: string }
            setAttendances((prev) => {
              // Avoid duplicates
              if (prev.some((a) => a.player_id === newRecord.player_id)) {
                return prev
              }
              return [...prev, { id: newRecord.id, player_id: newRecord.player_id }]
            })
          } else if (payload.eventType === 'DELETE') {
            const oldRecord = payload.old as { id?: string; player_id?: string }
            setAttendances((prev) =>
              prev.filter((a) => {
                if (oldRecord.id && a.id === oldRecord.id) return false
                if (oldRecord.player_id && a.player_id === oldRecord.player_id) return false
                return true
              })
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [session])

  const presentPlayerIds = new Set(attendances.map((a) => a.player_id))

  // Alphabet index: compute available letters from player names
  const availableLetters = useMemo(() => {
    const letters = new Set<string>()
    for (const p of players) {
      const first = p.name.charAt(0).toUpperCase()
      if (first) letters.add(first)
    }
    return Array.from(letters).sort()
  }, [players])

  const handleToggle = useCallback(
    (playerId: string, isPresent: boolean) => {
      if (!session) return

      // Optimistic UI update
      if (isPresent) {
        setAttendances((prev) => prev.filter((a) => a.player_id !== playerId))
      } else {
        setAttendances((prev) => {
          if (prev.some((a) => a.player_id === playerId)) return prev
          return [...prev, { id: `optimistic-${playerId}`, player_id: playerId }]
        })
      }

      setPendingPlayerIds((prev) => new Set(prev).add(playerId))

      startTransition(async () => {
        try {
          if (isPresent) {
            await checkOut(session.id, playerId)
          } else {
            await checkIn(session.id, playerId)
          }
        } finally {
          setPendingPlayerIds((prev) => {
            const next = new Set(prev)
            next.delete(playerId)
            return next
          })
        }
      })
    },
    [session]
  )

  const handleGuestSubmit = async () => {
    if (!session) return

    setGuestError(null)
    setGuestSubmitting(true)

    try {
      const result = await registerGuest(session.id, guestName, guestGender, guestLevel)

      if (!result.success) {
        setGuestError(result.error ?? 'Erreur inconnue')
        return
      }

      // Ajouter l'invité aux listes locales
      if (result.player) {
        const newGuest = result.player as Player
        // Tracker comme nouveau (pas dans "déjà venus")
        setNewGuestIds((prev) => new Set(prev).add(newGuest.id))
        // Ajouter à guestPlayers pour l'affichage
        setGuestPlayers((prev) => [...prev, newGuest].sort((a, b) => a.name.localeCompare(b.name)))
        // Attendance optimiste
        setAttendances((prev) => {
          if (prev.some((a) => a.player_id === newGuest.id)) return prev
          return [...prev, { id: `guest-${newGuest.id}`, player_id: newGuest.id }]
        })
      }

      // Reset form
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
      <main className="min-h-dvh flex items-center justify-center px-4">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="h-8 w-8 text-[var(--color-primary)]" />
          <p className="text-sm text-[var(--color-text-secondary)]">Chargement...</p>
        </div>
      </main>
    )
  }

  if (!session) {
    return (
      <main className="min-h-dvh flex items-center justify-center px-4">
        <EmptyState
          title="Aucune séance ouverte pour le moment"
          description="Revenez plus tard ou contactez le responsable."
        />
      </main>
    )
  }

  // All players = members + guests present at this session
  const allPlayers = [...players, ...guestPlayers]
  const presentCount = allPlayers.filter((p) => presentPlayerIds.has(p.id)).length
  const totalMembers = players.length

  return (
    <main className="min-h-dvh bg-[var(--color-background)] px-4 pt-4 pb-8 safe-area-top max-w-lg md:max-w-2xl mx-auto">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text)] mb-4"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Accueil
      </Link>

      {/* Session header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold mb-1">Présence</h1>
        <p className="text-sm text-[var(--color-text-secondary)] capitalize">
          {formatDateFr(session.date)}
        </p>
        {session.label && (
          <p className="text-sm text-[var(--color-text-secondary)]">{session.label}</p>
        )}
      </div>

      {/* Counter */}
      <Card className="mb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-[var(--color-text-secondary)]">
            Joueurs présents
          </span>
          <Badge variant={presentCount > 0 ? 'success' : 'default'}>
            {presentCount} / {totalMembers}
          </Badge>
        </div>
      </Card>

      {/* Player list (members only) with alphabet sidebar */}
      {players.length === 0 ? (
        <EmptyState
          title="Aucun joueur actif"
          description="Aucun joueur n'est enregistré pour le moment."
        />
      ) : (
        <div className="relative">
          {/* Player cards */}
          <div className="space-y-2 pr-7">
            {players.map((player, index) => {
              const isPresent = presentPlayerIds.has(player.id)
              const isPendingPlayer = pendingPlayerIds.has(player.id)
              const currentLetter = player.name.charAt(0).toUpperCase()
              const prevLetter = index > 0 ? players[index - 1].name.charAt(0).toUpperCase() : null
              const isFirstOfLetter = currentLetter !== prevLetter

              return (
                <div key={player.id}>
                  {isFirstOfLetter && (
                    <div
                      id={`letter-${currentLetter}`}
                      className="text-xs font-bold text-[var(--color-text-secondary)] uppercase pt-2 pb-1 scroll-mt-4"
                    >
                      {currentLetter}
                    </div>
                  )}
                  <Card
                    padding="sm"
                    className={`transition-colors cursor-pointer ${
                      isPresent
                        ? 'border-[var(--color-success)]/50 bg-[var(--color-success)]/5'
                        : ''
                    } ${isPendingPlayer ? 'opacity-70' : ''}`}
                    onClick={() => handleToggle(player.id, isPresent)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleToggle(player.id, isPresent)
                      }
                    }}
                  >
                    <div className="flex items-center gap-3">
                      {/* Checkbox indicator */}
                      <div
                        className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          isPresent
                            ? 'bg-[var(--color-success)] border-[var(--color-success)]'
                            : 'border-[var(--color-border)] bg-[var(--color-surface)]'
                        }`}
                      >
                        {isPresent && (
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                        {isPendingPlayer && !isPresent && (
                          <Spinner className="w-4 h-4 text-gray-400" />
                        )}
                      </div>

                      {/* Player info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{player.name}</p>
                      </div>
                    </div>
                  </Card>
                </div>
              )
            })}
          </div>

          <AlphabetSidebar letters={availableLetters} idPrefix="letter-" />
        </div>
      )}

      {/* New guests just registered in this session */}
      {guestPlayers.filter((g) => newGuestIds.has(g.id) && presentPlayerIds.has(g.id)).length > 0 && (
        <div className="mt-4">
          <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-2">
            Nouveaux invités
          </h2>
          <div className="space-y-2">
            {guestPlayers
              .filter((g) => newGuestIds.has(g.id) && presentPlayerIds.has(g.id))
              .map((guest) => (
                <Card
                  key={guest.id}
                  padding="sm"
                  className="border-[var(--color-success)]/50 bg-[var(--color-success)]/5"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-md bg-[var(--color-success)] border-2 border-[var(--color-success)] flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{guest.name}</p>
                    </div>
                    <Badge variant="default">Invité</Badge>
                  </div>
                </Card>
              ))}
          </div>
        </div>
      )}

      {/* Returning guests (toggleable like members) */}
      {guestPlayers.filter((g) => !newGuestIds.has(g.id)).length > 0 && (
        <div className="mt-4">
          <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-2">
            Invités déjà venus
          </h2>
          <div className="space-y-2">
            {guestPlayers
              .filter((g) => !newGuestIds.has(g.id))
              .map((guest) => {
              const isPresent = presentPlayerIds.has(guest.id)
              const isPendingPlayer = pendingPlayerIds.has(guest.id)

              return (
                <Card
                  key={guest.id}
                  padding="sm"
                  className={`transition-colors cursor-pointer ${
                    isPresent
                      ? 'border-[var(--color-success)]/50 bg-[var(--color-success)]/5'
                      : ''
                  } ${isPendingPlayer ? 'opacity-70' : ''}`}
                  onClick={() => handleToggle(guest.id, isPresent)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleToggle(guest.id, isPresent)
                    }
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        isPresent
                          ? 'bg-[var(--color-success)] border-[var(--color-success)]'
                          : 'border-[var(--color-border)] bg-[var(--color-surface)]'
                      }`}
                    >
                      {isPresent && (
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      {isPendingPlayer && !isPresent && (
                        <Spinner className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{guest.name}</p>
                    </div>
                    <Badge variant="default">Invité</Badge>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Guest registration */}
      <div className="mt-6">
        {!showGuestForm ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowGuestForm(true)}
            className="w-full"
          >
            Je suis invité(e)
          </Button>
        ) : (
          <Card>
            <h2 className="text-sm font-semibold mb-3">Inscription invité(e)</h2>

            {guestError && (
              <p className="text-sm text-[var(--color-danger)] mb-3">{guestError}</p>
            )}

            {/* Nom */}
            <div className="mb-3">
              <label htmlFor="guest-name" className="block text-sm font-medium mb-1">
                Nom
              </label>
              <input
                id="guest-name"
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                maxLength={100}
                placeholder="Prénom Nom"
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
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
                        ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                        : 'bg-[var(--color-surface)] text-[var(--color-text)] border-[var(--color-border)] hover:opacity-80'
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
                          ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                          : 'bg-[var(--color-surface)] text-[var(--color-text)] border-[var(--color-border)] hover:opacity-80'
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
                onClick={() => {
                  setShowGuestForm(false)
                  setGuestError(null)
                }}
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
                Confirmer
              </Button>
            </div>
          </Card>
        )}
      </div>
    </main>
  )
}
