'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { DayPicker } from '@/components/day-picker'
import { useToast } from '@/components/ui/toast'
import { createSchedule, updateSchedule } from '@/lib/actions/recurring-schedules'
import type { RecurringSchedule } from '@/lib/types'

interface RecurringScheduleFormProps {
  schedule?: RecurringSchedule
}

export function RecurringScheduleForm({ schedule }: RecurringScheduleFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()

  const [label, setLabel] = useState(schedule?.label ?? '')
  const [days, setDays] = useState<number[]>(schedule?.days_of_week ?? [])
  const [sessionTime, setSessionTime] = useState(schedule?.session_time?.slice(0, 5) ?? '20:00')
  const [openBefore, setOpenBefore] = useState(String(schedule?.open_before_minutes ?? 120))
  const [nbCourts, setNbCourts] = useState(String(schedule?.nb_courts_planned ?? 2))
  const [teamSize, setTeamSize] = useState(String(schedule?.preferred_team_size ?? 4))
  const [sessionLabelTemplate, setSessionLabelTemplate] = useState(schedule?.session_label_template ?? '')
  const [isActive, setIsActive] = useState(schedule?.is_active ?? true)
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (days.length === 0) {
      setError('Sélectionnez au moins un jour.')
      return
    }

    const formData = new FormData()
    formData.set('label', label)
    formData.set('days_of_week', JSON.stringify(days))
    formData.set('session_time', sessionTime)
    formData.set('open_before_minutes', openBefore)
    formData.set('nb_courts_planned', nbCourts)
    formData.set('preferred_team_size', teamSize)
    formData.set('session_label_template', sessionLabelTemplate)
    formData.set('is_active', String(isActive))

    startTransition(async () => {
      const result = schedule
        ? await updateSchedule(schedule.id, formData)
        : await createSchedule(formData)

      if (!result.success) {
        setError(result.error ?? 'Erreur inconnue.')
        return
      }

      toast(schedule ? 'Planning mis à jour.' : 'Planning créé.', 'success')

      if (schedule) {
        router.push(`/staff/schedules/${schedule.id}`)
      } else if ('id' in result && result.id) {
        router.push(`/staff/schedules/${result.id}`)
      } else {
        router.push('/staff/schedules')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card className="space-y-5">
        <Input
          label="Libellé"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Ex: Entraînement semaine"
          required
        />

        <div>
          <label className="block text-sm font-medium text-(--color-text-secondary) mb-2">
            Jours de la semaine
          </label>
          <DayPicker value={days} onChange={setDays} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Heure"
            type="time"
            value={sessionTime}
            onChange={(e) => setSessionTime(e.target.value)}
            required
          />
          <Input
            label="Ouverture avant (min)"
            type="number"
            min={0}
            value={openBefore}
            onChange={(e) => setOpenBefore(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Nb terrains"
            type="number"
            min={1}
            value={nbCourts}
            onChange={(e) => setNbCourts(e.target.value)}
            required
          />
          <Input
            label="Joueurs / équipe"
            type="number"
            min={3}
            max={6}
            value={teamSize}
            onChange={(e) => setTeamSize(e.target.value)}
            required
          />
        </div>

        <Input
          label="Libellé séance (optionnel)"
          value={sessionLabelTemplate}
          onChange={(e) => setSessionLabelTemplate(e.target.value)}
          placeholder="Ex: Entraînement du mardi"
        />

        {schedule && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded border-(--color-border) text-(--color-primary) focus:ring-(--color-primary)"
            />
            Planning actif
          </label>
        )}

        {error && <p className="text-sm text-(--color-danger)">{error}</p>}

        <div className="flex gap-3">
          <Button type="submit" loading={isPending}>
            {schedule ? 'Enregistrer' : 'Créer le planning'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.back()}
          >
            Annuler
          </Button>
        </div>
      </Card>
    </form>
  )
}
