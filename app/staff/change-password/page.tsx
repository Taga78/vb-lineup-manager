'use client'

import { useState, useTransition } from 'react'
import { changePassword } from '@/lib/actions/auth'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function ChangePasswordPage() {
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
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/staff"
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/5 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold">Changer le mot de passe</h1>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
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
  )
}
