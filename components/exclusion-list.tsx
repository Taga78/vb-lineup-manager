'use client'

import { useState, useTransition } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { addExclusion, deleteExclusion } from '@/lib/actions/recurring-schedules'
import type { ScheduleExclusion } from '@/lib/types'
import { formatDateFr } from '@/lib/utils'

interface ExclusionListProps {
  scheduleId: string
  exclusions: ScheduleExclusion[]
}

export function ExclusionList({ scheduleId, exclusions }: ExclusionListProps) {
  const { toast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const formData = new FormData()
    formData.set('schedule_id', scheduleId)
    formData.set('start_date', startDate)
    formData.set('end_date', endDate)
    formData.set('reason', reason)

    startTransition(async () => {
      const result = await addExclusion(formData)
      if (!result.success) {
        setError(result.error ?? 'Erreur.')
        return
      }
      toast('Exclusion ajoutée.', 'success')
      setStartDate('')
      setEndDate('')
      setReason('')
      setShowForm(false)
    })
  }

  function handleDelete(exclusionId: string) {
    startTransition(async () => {
      const result = await deleteExclusion(exclusionId, scheduleId)
      if (!result.success) {
        toast(result.error ?? 'Erreur.', 'error')
        return
      }
      toast('Exclusion supprimée.', 'success')
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Exclusions</h2>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Annuler' : '+ Ajouter'}
        </Button>
      </div>

      {showForm && (
        <Card padding="sm">
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Début"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
              <Input
                label="Fin"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
            <Input
              label="Motif (optionnel)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Vacances de Noël"
            />
            {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
            <Button type="submit" size="sm" loading={isPending}>
              Ajouter
            </Button>
          </form>
        </Card>
      )}

      {exclusions.length === 0 && !showForm && (
        <p className="text-sm text-[var(--color-text-secondary)]">
          Aucune exclusion définie.
        </p>
      )}

      {exclusions.map((exc) => (
        <Card key={exc.id} padding="sm">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {formatDateFr(exc.start_date + 'T00:00:00')}
                {exc.start_date !== exc.end_date && (
                  <> — {formatDateFr(exc.end_date + 'T00:00:00')}</>
                )}
              </p>
              {exc.reason && (
                <p className="text-xs text-[var(--color-text-secondary)] truncate">
                  {exc.reason}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => handleDelete(exc.id)}
              disabled={isPending}
              className="text-[var(--color-danger)] hover:text-red-700 transition-colors p-1 shrink-0"
              title="Supprimer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </Card>
      ))}
    </div>
  )
}
