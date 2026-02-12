import Link from 'next/link'
import { PlayerForm } from '@/components/player-form'

export default function NewPlayerPage() {
  return (
    <div className="space-y-4">
      <div className="mb-6">
        <Link
          href="/staff/players"
          className="inline-flex items-center gap-1 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors min-h-[44px]"
        >
          &larr; Retour aux joueurs
        </Link>
        <h1 className="text-2xl font-bold">Nouveau joueur</h1>
      </div>

      <PlayerForm />
    </div>
  )
}
