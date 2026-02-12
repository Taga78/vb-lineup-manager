import Link from 'next/link'
import { getSessions } from '@/lib/actions/sessions'
import { SessionList } from '@/components/session-list'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'

export default async function SessionsPage() {
  const { data: sessions, error } = await getSessions()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Seances</h1>
        <Link href="/staff/sessions/new">
          <Button size="sm">Nouvelle seance</Button>
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 mb-4">
          Erreur : {error}
        </div>
      )}

      {sessions.length === 0 && !error ? (
        <EmptyState
          title="Aucune seance"
          description="Creez votre premiere seance pour commencer a gerer les presences et equipes."
          action={
            <Link href="/staff/sessions/new">
              <Button>Nouvelle seance</Button>
            </Link>
          }
        />
      ) : (
        <SessionList sessions={sessions} />
      )}
    </div>
  )
}
