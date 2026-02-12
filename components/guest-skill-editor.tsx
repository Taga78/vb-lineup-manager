'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { SKILL_KEYS, SKILL_LABELS, type SkillKey } from '@/lib/types'
import { updateGuestSkills } from '@/lib/actions/players'

interface GuestSkillEditorProps {
  playerId: string
  initialSkills: Record<SkillKey, number>
  onClose: () => void
  onSaved: (skills: Record<SkillKey, number>) => void
}

export function GuestSkillEditor({ playerId, initialSkills, onClose, onSaved }: GuestSkillEditorProps) {
  const [skills, setSkills] = useState(initialSkills)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const handleSave = () => {
    setError(null)
    startTransition(async () => {
      const result = await updateGuestSkills(playerId, skills)
      if (!result.success) {
        setError(result.error ?? 'Erreur inconnue')
        toast(result.error ?? 'Erreur inconnue', 'error')
        return
      }
      toast('Compétences mises à jour')
      onSaved(skills)
      onClose()
    })
  }

  return (
    <div className="mt-2 p-3 bg-[var(--color-background)] rounded-lg border border-[var(--color-border)]">
      {error && (
        <p className="text-xs text-[var(--color-danger)] mb-2">{error}</p>
      )}

      <div className="space-y-2">
        {SKILL_KEYS.map((key) => (
          <div key={key} className="flex items-center gap-2">
            <span className="text-xs font-medium w-16 text-[var(--color-text-secondary)]">
              {SKILL_LABELS[key]}
            </span>
            <input
              type="range"
              min={1}
              max={10}
              value={skills[key]}
              onChange={(e) =>
                setSkills((prev) => ({ ...prev, [key]: Number(e.target.value) }))
              }
              className="flex-1 h-1.5 accent-[var(--color-primary)]"
            />
            <span className="text-xs font-bold w-5 text-center">{skills[key]}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mt-3">
        <Button variant="ghost" size="sm" onClick={onClose} className="flex-1">
          Annuler
        </Button>
        <Button variant="primary" size="sm" onClick={handleSave} loading={isPending} className="flex-1">
          Enregistrer
        </Button>
      </div>
    </div>
  )
}
