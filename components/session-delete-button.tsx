'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteSession } from '@/lib/actions/sessions'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'

interface SessionDeleteButtonProps {
  sessionId: string
}

export function SessionDeleteButton({ sessionId }: SessionDeleteButtonProps) {
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const { toast } = useToast()

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteSession(sessionId)
      if (result.success) {
        toast('Séance supprimée')
        router.push('/staff/sessions')
      } else {
        toast(result.error ?? 'Erreur lors de la suppression.', 'error')
      }
    })
  }

  if (!confirming) {
    return (
      <Button
        variant="danger"
        size="sm"
        className="w-full"
        onClick={() => setConfirming(true)}
      >
        Supprimer la séance
      </Button>
    )
  }

  return (
    <div className="flex gap-2">
      <Button
        variant="ghost"
        size="sm"
        className="flex-1"
        onClick={() => setConfirming(false)}
        disabled={isPending}
      >
        Annuler
      </Button>
      <Button
        variant="danger"
        size="sm"
        className="flex-1"
        onClick={handleDelete}
        loading={isPending}
      >
        Confirmer
      </Button>
    </div>
  )
}
