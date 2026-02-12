'use client'

import { useState, useTransition } from 'react'
import { changePassword } from '@/lib/actions/auth'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (newPassword.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }

    if (newPassword !== confirm) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    startTransition(async () => {
      const result = await changePassword(newPassword)
      if (result?.error) {
        setError(result.error)
      }
    })
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-[var(--color-background)]">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-6">Nouveau mot de passe</h1>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-[var(--color-text-secondary)] text-center">
              Choisissez un nouveau mot de passe pour le compte staff.
            </p>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <Input
              label="Nouveau mot de passe"
              type="password"
              name="new-password"
              required
              placeholder="Minimum 6 caractères"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />

            <Input
              label="Confirmer le mot de passe"
              type="password"
              name="confirm-password"
              required
              placeholder="Répétez le mot de passe"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />

            <Button
              type="submit"
              loading={isPending}
              disabled={!newPassword.trim() || !confirm.trim()}
              className="w-full"
            >
              Enregistrer
            </Button>
          </form>
        </Card>
      </div>
    </main>
  )
}
