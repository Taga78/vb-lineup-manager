'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { createSession, updateSession } from '@/lib/actions/sessions'
import { createTournamentSession } from '@/lib/actions/tournament'
import { useToast } from '@/components/ui/toast'
import type { TournamentFormat } from '@/lib/types'

interface SessionFormProps {
  session?: {
    id: string
    date: string
    label: string | null
    nb_courts_planned: number
    preferred_team_size: number
    type?: string
  }
  initialData?: {
    date: string
    label: string | null
    nb_courts_planned: number
    preferred_team_size: number
  }
}

const teamSizeOptions = [
  { value: '3', label: '3 joueurs' },
  { value: '4', label: '4 joueurs' },
  { value: '5', label: '5 joueurs' },
  { value: '6', label: '6 joueurs' },
]

const sessionTypeOptions = [
  { value: 'TRAINING', label: 'Entraînement' },
  { value: 'TOURNAMENT', label: 'Tournoi' },
]

const tournamentModeOptions = [
  { value: 'CLASSIC', label: 'Classique (Poules + Finales)' },
  { value: 'KOTH', label: 'King of the Hill (Individuel)' },
]

function toDateInputValue(dateString: string): string {
  const date = new Date(dateString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function SessionForm({ session, initialData }: SessionFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [sessionType, setSessionType] = useState<string>(session?.type ?? 'TRAINING')
  const [tournamentMode, setTournamentMode] = useState<string>('CLASSIC')

  const isEdit = !!session
  const formData = session || initialData

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const fd = new FormData(e.currentTarget)

    startTransition(async () => {
      if (sessionType === 'TOURNAMENT' && !isEdit) {
        const format = buildTournamentFormat(fd)
        const result = await createTournamentSession({
          date: fd.get('date') as string,
          label: (fd.get('label') as string) || null,
          nbCourts: parseInt(fd.get('nb_courts_planned') as string, 10),
          preferredTeamSize: parseInt(fd.get('preferred_team_size') as string, 10),
          format,
        })

        if (result.success) {
          toast('Tournoi créé')
          router.push(`/staff/sessions/${result.sessionId}/tournament`)
        } else {
          setError(result.error)
          toast(result.error, 'error')
        }
      } else {
        const result = isEdit
          ? await updateSession(session.id, fd)
          : await createSession(fd)

        if (result.success) {
          toast(isEdit ? 'Séance modifiée' : 'Séance créée')
          router.push('/staff/sessions')
        } else {
          setError(result.error ?? 'Une erreur est survenue.')
          toast(result.error ?? 'Une erreur est survenue.', 'error')
        }
      }
    })
  }

  function buildTournamentFormat(fd: FormData): TournamentFormat {
    if (tournamentMode === 'KOTH') {
      return {
        mode: 'KOTH',
        match_config: {
          sets: 1,
          points: parseInt(fd.get('koth_points') as string, 10) || 15,
          win_by_two: fd.get('koth_win_by_two') === 'on',
        },
      }
    }

    return {
      mode: 'CLASSIC',
      num_pools: parseInt(fd.get('num_pools') as string, 10) || 2,
      qualifiers_per_pool: parseInt(fd.get('qualifiers_per_pool') as string, 10) || 2,
      pool_config: {
        sets: parseInt(fd.get('pool_sets') as string, 10) || 1,
        points: parseInt(fd.get('pool_points') as string, 10) || 21,
        win_by_two: fd.get('pool_win_by_two') === 'on',
      },
      playoff_config: {
        sets: parseInt(fd.get('playoff_sets') as string, 10) || 2,
        points: parseInt(fd.get('playoff_points') as string, 10) || 25,
        win_by_two: fd.get('playoff_win_by_two') === 'on',
        tie_break_points: parseInt(fd.get('tie_break_points') as string, 10) || 15,
      },
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Type de séance (seulement en création) */}
      {!isEdit && (
        <Select
          label="Type de séance"
          name="session_type"
          options={sessionTypeOptions}
          value={sessionType}
          onChange={(e) => setSessionType(e.target.value)}
        />
      )}

      <Input
        label="Date"
        name="date"
        type="date"
        required
        defaultValue={formData ? toDateInputValue(formData.date) : ''}
      />

      <Input
        label="Libellé (optionnel)"
        name="label"
        type="text"
        maxLength={100}
        placeholder={sessionType === 'TOURNAMENT' ? 'Ex : Tournoi de Noël' : 'Ex : Entraînement du mardi'}
        defaultValue={formData?.label ?? ''}
      />

      <Input
        label="Nombre de terrains"
        name="nb_courts_planned"
        type="number"
        min={1}
        required
        defaultValue={formData?.nb_courts_planned ?? 1}
      />

      <Select
        label="Taille d'équipe préférée"
        name="preferred_team_size"
        options={teamSizeOptions}
        defaultValue={String(formData?.preferred_team_size ?? 4)}
      />

      {/* Configuration tournoi */}
      {sessionType === 'TOURNAMENT' && !isEdit && (
        <Card className="space-y-4">
          <h3 className="text-sm font-semibold text-(--color-text-secondary) uppercase tracking-wide">
            Configuration du tournoi
          </h3>

          <Select
            label="Mode"
            name="tournament_mode"
            options={tournamentModeOptions}
            value={tournamentMode}
            onChange={(e) => setTournamentMode(e.target.value)}
          />

          {tournamentMode === 'CLASSIC' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Nombre de poules"
                  name="num_pools"
                  type="number"
                  min={2}
                  max={8}
                  defaultValue={2}
                />
                <Input
                  label="Qualifiés par poule"
                  name="qualifiers_per_pool"
                  type="number"
                  min={1}
                  max={4}
                  defaultValue={2}
                />
              </div>

              <p className="text-xs font-medium text-(--color-text-secondary) mt-2">Phase de poules</p>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Points par set" name="pool_points" type="number" min={1} defaultValue={21} />
                <Input label="Nombre de sets" name="pool_sets" type="number" min={1} max={5} defaultValue={1} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="pool_win_by_two" defaultChecked className="rounded" />
                Écart de 2 points obligatoire
              </label>

              <p className="text-xs font-medium text-(--color-text-secondary) mt-2">Phase finale</p>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Points par set" name="playoff_points" type="number" min={1} defaultValue={25} />
                <Input label="Nombre de sets" name="playoff_sets" type="number" min={1} max={5} defaultValue={2} />
              </div>
              <Input label="Points tie-break" name="tie_break_points" type="number" min={1} defaultValue={15} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="playoff_win_by_two" defaultChecked className="rounded" />
                Écart de 2 points obligatoire
              </label>
            </>
          )}

          {tournamentMode === 'KOTH' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Points par match" name="koth_points" type="number" min={1} defaultValue={15} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="koth_win_by_two" className="rounded" />
                Écart de 2 points obligatoire
              </label>
            </>
          )}
        </Card>
      )}

      <div className="pt-2">
        <Button type="submit" loading={isPending} className="w-full">
          {isEdit ? 'Enregistrer' : sessionType === 'TOURNAMENT' ? 'Créer le tournoi' : 'Créer'}
        </Button>
      </div>
    </form>
  )
}
