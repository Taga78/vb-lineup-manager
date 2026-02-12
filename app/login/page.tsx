'use client'

import { useState, useTransition } from 'react'
import { staffLogin, forgotPassword } from '@/lib/actions/auth'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [resetSent, setResetSent] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isResetting, startResetTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await staffLogin(password)
      if (result?.error) {
        setError(result.error)
      }
    })
  }

  const handleForgotPassword = () => {
    setError(null)
    setResetSent(false)
    startResetTransition(async () => {
      const result = await forgotPassword()
      if (result.error) {
        setError(result.error)
      } else {
        setResetSent(true)
      }
    })
  }

  return (
    <main className="min-h-dvh flex items-center justify-center px-4 bg-(--color-background)">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-6">VB Lineup Manager</h1>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-(--color-text-secondary) text-center">
              Connectez-vous pour accéder à l&apos;espace staff.
            </p>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {resetSent && (
              <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">
                Un email de réinitialisation a été envoyé.
              </div>
            )}

            <Input
              label="Mot de passe"
              type="password"
              name="password"
              required
              placeholder="Mot de passe staff"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />

            <Button
              type="submit"
              loading={isPending}
              disabled={!password.trim()}
              className="w-full"
            >
              Se connecter
            </Button>
          </form>

          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={isResetting}
              className="text-sm text-(--color-primary) hover:underline disabled:opacity-50"
            >
              {isResetting ? 'Envoi en cours...' : 'Mot de passe oublié ?'}
            </button>
          </div>
        </Card>
      </div>
    </main>
  )
}
