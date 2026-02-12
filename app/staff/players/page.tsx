import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { PlayerList } from '@/components/player-list'
import { getPlayers, getPlayersAttendanceCounts } from '@/lib/actions/players'

export default async function PlayersPage() {
  const [{ data: players, error }, { data: attendanceCounts }] = await Promise.all([
    getPlayers(),
    getPlayersAttendanceCounts(),
  ])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Joueurs</h1>
        <Link href="/staff/players/new">
          <Button size="sm">+ Nouveau joueur</Button>
        </Link>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          Erreur de chargement : {error}
        </div>
      )}

      {/* Content */}
      {!error && players.length === 0 ? (
        <EmptyState
          title="Aucun joueur"
          description="Ajoutez votre premier joueur pour commencer."
          action={
            <Link href="/staff/players/new">
              <Button>Ajouter un joueur</Button>
            </Link>
          }
        />
      ) : (
        <PlayerList players={players} attendanceCounts={Object.fromEntries(attendanceCounts)} />
      )}
    </div>
  )
}
