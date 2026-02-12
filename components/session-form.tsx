'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { createSession, updateSession } from '@/lib/actions/sessions'
import { useToast } from '@/components/ui/toast'

interface SessionFormProps {
  session?: {
    id: string
    date: string
    label: string | null
    nb_courts_planned: number
    preferred_team_size: number
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

function toDateInputValue(dateString: string): string {
  const date = new Date(dateString)
  // Format as YYYY-MM-DD for input[type="date"]
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

  const isEdit = !!session
  const formData = session || initialData

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = isEdit
        ? await updateSession(session.id, formData)
        : await createSession(formData)

      if (result.success) {
        toast(isEdit ? 'Séance modifiée' : 'Séance créée')
        router.push('/staff/sessions')
      } else {
        setError(result.error ?? 'Une erreur est survenue.')
        toast(result.error ?? 'Une erreur est survenue.', 'error')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Input
        label="Date"
        name="date"
        type="date"
        required
        defaultValue={formData ? toDateInputValue(formData.date) : ''}
      />

      <Input
        label="Libelle (optionnel)"
        name="label"
        type="text"
        maxLength={100}
        placeholder="Ex : Entrainement du mardi"
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
        label="Taille d'equipe preferee"
        name="preferred_team_size"
        options={teamSizeOptions}
        defaultValue={String(formData?.preferred_team_size ?? 4)}
      />

      <div className="pt-2">
        <Button type="submit" loading={isPending} className="w-full">
          {isEdit ? 'Enregistrer' : 'Creer'}
        </Button>
      </div>
    </form>
  )
}
