'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { SkillRadar } from '@/components/ui/skill-radar'
import { EmptyState } from '@/components/ui/empty-state'
import { AlphabetSidebar } from '@/components/ui/alphabet-sidebar'
import { skillColor, skillTier, overallSkill } from '@/lib/utils'
import type { PlayerRow } from '@/lib/actions/players'

interface PlayerListProps {
  players: PlayerRow[]
  attendanceCounts?: Record<string, { attended: number; total: number }>
}

function genderLabel(gender: string | null): string {
  switch (gender) {
    case 'M': return 'Homme'
    case 'F': return 'Femme'
    default: return 'N/S'
  }
}


export function PlayerList({ players, attendanceCounts }: PlayerListProps) {
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  const filtered = players.filter((p) => {
    if (!showInactive && !p.is_active) return false
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const availableLetters = useMemo(() => {
    const letters = new Set<string>()
    for (const p of filtered) {
      const first = p.name.charAt(0).toUpperCase()
      if (first) letters.add(first)
    }
    return Array.from(letters).sort()
  }, [filtered])

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="space-y-3">
        <Input
          placeholder="Rechercher un joueur..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] cursor-pointer">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded border-gray-300"
          />
          Afficher les joueurs inactifs
        </label>
      </div>

      {/* Player cards */}
      {filtered.length === 0 ? (
        <EmptyState
          title="Aucun joueur trouvé"
          description={search ? 'Essayez avec un autre terme de recherche.' : 'Ajoutez votre premier joueur pour commencer.'}
        />
      ) : (
        <div className="relative">
          <div className="space-y-2 pr-7">
            {filtered.map((player, index) => {
              const overall = overallSkill(player)
              const tier = skillTier(Math.round(overall))
              const currentLetter = player.name.charAt(0).toUpperCase()
              const prevLetter = index > 0 ? filtered[index - 1].name.charAt(0).toUpperCase() : null
              const isFirstOfLetter = currentLetter !== prevLetter

              return (
                <div key={player.id}>
                  {isFirstOfLetter && (
                    <div
                      id={`players-letter-${currentLetter}`}
                      className="text-xs font-bold text-[var(--color-text-secondary)] uppercase pt-2 pb-1 scroll-mt-4"
                    >
                      {currentLetter}
                    </div>
                  )}
                  <Link href={`/staff/players/${player.id}`}>
                    <Card padding="sm" className={!player.is_active ? 'opacity-60' : ''}>
                      <div className="flex items-center gap-3">
                        {/* Radar */}
                        <div className="flex-shrink-0">
                          <SkillRadar skills={player} size={32} />
                        </div>

                        {/* Main info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium truncate">{player.name}</span>
                            {!player.is_active && (
                              <Badge variant="warning">Inactif</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="gender">{genderLabel(player.gender)}</Badge>
                            <span
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold"
                              style={skillColor(Math.round(overall))}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: `var(--skill-${tier})` }}
                              />
                              {overall} · {skillTier(Math.round(overall)) && `T${tier}`}
                            </span>
                            {attendanceCounts && attendanceCounts[player.id] && (
                              <Badge variant="default">
                                {attendanceCounts[player.id].attended}/{attendanceCounts[player.id].total}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </Link>
                </div>
              )
            })}
          </div>

          <AlphabetSidebar letters={availableLetters} idPrefix="players-letter-" />
        </div>
      )}
    </div>
  )
}
