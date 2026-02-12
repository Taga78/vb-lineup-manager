'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="min-h-dvh flex items-center justify-center px-4 bg-(--color-background)">
      <Card className="max-w-sm w-full text-center">
        <div className="w-12 h-12 rounded-full bg-(--color-danger)/10 flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-(--color-danger)" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold mb-1">Une erreur est survenue</h2>
        <p className="text-sm text-(--color-text-secondary) mb-4">
          {error.message || 'Quelque chose s\u2019est mal passé.'}
        </p>
        <Button onClick={reset} className="w-full">
          Réessayer
        </Button>
      </Card>
    </main>
  )
}
