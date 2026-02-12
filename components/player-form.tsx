'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { ConfirmButton } from '@/components/ui/confirm-button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { SkillRadar } from '@/components/ui/skill-radar'
import { createPlayer, updatePlayer, deletePlayer, permanentDeletePlayer, toggleGuestStatus } from '@/lib/actions/players'
import type { AttendanceHistory, PlayerRow } from '@/lib/actions/players'
import { useToast } from '@/components/ui/toast'
import { skillLabel, skillTier, overallSkill, formatDateFr } from '@/lib/utils'
import { SKILL_KEYS, SKILL_LABELS } from '@/lib/types'

interface PlayerFormProps {
  player?: PlayerRow
  attendance?: AttendanceHistory
}

const genderOptions = [
  { value: 'M', label: 'Homme' },
  { value: 'F', label: 'Femme' },
]

export function PlayerForm({ player, attendance }: PlayerFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const isEdit = !!player
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showAllSessions, setShowAllSessions] = useState(false)
  const [skills, setSkills] = useState({
    skill_service: player?.skill_service ?? 5,
    skill_pass: player?.skill_pass ?? 5,
    skill_attack: player?.skill_attack ?? 5,
    skill_defense: player?.skill_defense ?? 5,
  })

  const overall = overallSkill(skills)
  const overallTier = skillTier(Math.round(overall))

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = isEdit
        ? await updatePlayer(player.id, formData)
        : await createPlayer(formData)

      if (result.success) {
        toast(isEdit ? 'Joueur modifié' : 'Joueur créé')
        router.push('/staff/players')
      } else {
        setError(result.error ?? 'Une erreur est survenue.')
        toast(result.error ?? 'Une erreur est survenue.', 'error')
      }
    })
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <Input
          label="Nom"
          name="name"
          required
          maxLength={100}
          placeholder="Nom du joueur"
          defaultValue={player?.name ?? ''}
          autoComplete="off"
        />

        <Select
          label="Genre"
          name="gender"
          options={genderOptions}
          defaultValue={player?.gender ?? 'M'}
        />

        {/* Radar preview + overall score */}
        <div className="flex items-center justify-center gap-4 py-2">
          <SkillRadar skills={skills} size={80} showLabels />
          <div className="flex flex-col items-center">
            <span
              className="inline-flex items-center justify-center w-12 h-12 rounded-xl text-xl font-black tabular-nums transition-colors"
              style={{
                backgroundColor: `color-mix(in srgb, var(--skill-${overallTier}) 15%, white)`,
                color: `var(--skill-${overallTier})`,
              }}
            >
              {overall}
            </span>
            <span
              className="text-xs font-bold mt-1 transition-colors"
              style={{ color: `var(--skill-${overallTier})` }}
            >
              {skillLabel(Math.round(overall))}
            </span>
            <span className="text-[10px] text-[var(--color-text-secondary)]">
              Moy. /10
            </span>
          </div>
        </div>

        {/* 4 skill sliders */}
        <div className="space-y-4">
          {SKILL_KEYS.map((key) => {
            const val = skills[key]
            const tier = skillTier(val)
            return (
              <div key={key} className="w-full">
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor={key} className="text-sm font-medium text-[var(--color-text-secondary)]">
                    {SKILL_LABELS[key]}
                  </label>
                  <span
                    className="text-sm font-bold tabular-nums"
                    style={{ color: `var(--skill-${tier})` }}
                  >
                    {val}
                  </span>
                </div>
                <div className="rounded-xl bg-[var(--color-background)] border border-[var(--color-border)] px-3 py-3">
                  <input
                    type="range"
                    id={key}
                    name={key}
                    min={1}
                    max={10}
                    step={1}
                    value={val}
                    onChange={(e) => setSkills((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
                    className="skill-slider w-full"
                    style={{ '--skill-current': `var(--skill-${tier})` } as React.CSSProperties}
                  />
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={isPending} className="flex-1">
            {isEdit ? 'Enregistrer' : 'Créer'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push('/staff/players')}
            disabled={isPending}
          >
            Annuler
          </Button>
        </div>
      </form>

      {/* Attendance history — only in edit mode */}
      {isEdit && attendance && attendance.total > 0 && (
        <div className="mt-6 pt-5 border-t border-[var(--color-border)]">
          <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-3">
            Présences
          </h3>
          <p className="text-sm mb-3">
            <span className="font-semibold">{attendance.attended}/{attendance.total}</span>
            {' '}séances
            {' '}
            <span className="text-[var(--color-text-secondary)]">
              ({attendance.total > 0 ? Math.round((attendance.attended / attendance.total) * 100) : 0}%)
            </span>
          </p>
          <div className="space-y-1.5">
            {(showAllSessions ? attendance.sessions : attendance.sessions.slice(0, 5)).map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between text-sm py-1.5 px-2 rounded-lg bg-[var(--color-background)]"
              >
                <span className="text-[var(--color-text-secondary)]">
                  {formatDateFr(session.date)}
                  {session.label && ` — ${session.label}`}
                </span>
                <Badge variant={session.present ? 'success' : 'default'}>
                  {session.present ? 'Présent' : 'Absent'}
                </Badge>
              </div>
            ))}
          </div>
          {attendance.sessions.length > 5 && !showAllSessions && (
            <button
              type="button"
              className="mt-2 text-sm text-[var(--color-primary)] hover:underline"
              onClick={() => setShowAllSessions(true)}
            >
              Tout afficher ({attendance.sessions.length} séances)
            </button>
          )}
        </div>
      )}

      {/* Danger zone — only in edit mode */}
      {isEdit && (
        <div className="mt-6 pt-5 border-t border-[var(--color-border)]">
          <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-3">
            Gestion du joueur
          </h3>
          <label className="flex items-center gap-2 text-sm cursor-pointer mb-3">
            <input
              type="checkbox"
              checked={player.is_guest}
              disabled={isPending}
              onChange={() => {
                startTransition(async () => {
                  const result = await toggleGuestStatus(player.id, !player.is_guest)
                  if (result.success) {
                    toast(!player.is_guest ? 'Marqué comme invité' : 'Statut invité retiré')
                  } else {
                    setError(result.error ?? 'Erreur lors du changement de statut.')
                    toast(result.error ?? 'Erreur lors du changement de statut.', 'error')
                  }
                })
              }}
              className="rounded border-gray-300"
            />
            Joueur invité
          </label>

          <div className="flex flex-col gap-2">
            <ConfirmButton
              variant="secondary"
              loading={isPending}
              className="w-full"
              onConfirm={() => {
                startTransition(async () => {
                  const result = await deletePlayer(player.id)
                  if (result.success) {
                    toast('Joueur désactivé')
                    router.push('/staff/players')
                  } else {
                    setError(result.error ?? 'Erreur lors de la désactivation.')
                    toast(result.error ?? 'Erreur lors de la désactivation.', 'error')
                  }
                })
              }}
            >
              Désactiver
            </ConfirmButton>
            <ConfirmButton
              variant="danger"
              loading={isPending}
              className="w-full"
              onConfirm={() => {
                startTransition(async () => {
                  const result = await permanentDeletePlayer(player.id)
                  if (result.success) {
                    toast('Joueur supprimé')
                    router.push('/staff/players')
                  } else {
                    setError(result.error ?? 'Erreur lors de la suppression.')
                    toast(result.error ?? 'Erreur lors de la suppression.', 'error')
                  }
                })
              }}
            >
              Supprimer
            </ConfirmButton>
          </div>
        </div>
      )}
    </Card>
  )
}
