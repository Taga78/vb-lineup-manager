'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { toggleSessionOpen } from '@/lib/actions/sessions'

interface SessionToggleButtonProps {
  sessionId: string
  isOpen: boolean
}

export function SessionToggleButton({ sessionId, isOpen }: SessionToggleButtonProps) {
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  function handleToggle() {
    startTransition(async () => {
      const result = await toggleSessionOpen(sessionId)
      if (result.success) {
        toast(isOpen ? 'Séance fermée' : 'Séance ouverte')
      } else {
        toast(result.error ?? 'Erreur lors du changement de statut.', 'error')
      }
    })
  }

  return (
    <Button
      variant={isOpen ? 'secondary' : 'primary'}
      className="w-full"
      loading={isPending}
      onClick={handleToggle}
    >
      {isOpen ? 'Fermer la seance' : 'Ouvrir la seance'}
    </Button>
  )
}
