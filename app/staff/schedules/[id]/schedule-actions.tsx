'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { toggleScheduleActive, deleteSchedule } from '@/lib/actions/recurring-schedules'

interface ScheduleActionsProps {
  scheduleId: string
  isActive: boolean
}

export function ScheduleActions({ scheduleId, isActive }: ScheduleActionsProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)

  function handleToggle() {
    startTransition(async () => {
      const result = await toggleScheduleActive(scheduleId)
      if (!result.success) {
        toast(result.error ?? 'Erreur.', 'error')
        return
      }
      toast(isActive ? 'Planning désactivé.' : 'Planning activé.', 'success')
    })
  }

  function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    startTransition(async () => {
      const result = await deleteSchedule(scheduleId)
      if (!result.success) {
        toast(result.error ?? 'Erreur.', 'error')
        return
      }
      toast('Planning supprimé.', 'success')
      router.push('/staff/schedules')
    })
  }

  return (
    <div className="flex gap-3">
      <Button
        variant="secondary"
        size="sm"
        loading={isPending}
        onClick={handleToggle}
      >
        {isActive ? 'Désactiver' : 'Activer'}
      </Button>
      <Button
        variant={confirmDelete ? 'danger' : 'ghost'}
        size="sm"
        loading={isPending}
        onClick={handleDelete}
      >
        {confirmDelete ? 'Confirmer la suppression' : 'Supprimer'}
      </Button>
    </div>
  )
}
