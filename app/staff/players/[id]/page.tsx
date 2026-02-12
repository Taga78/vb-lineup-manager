import { notFound } from 'next/navigation'
import Link from 'next/link'
import { PlayerForm } from '@/components/player-form'
import { getPlayer, getPlayerAttendanceHistory } from '@/lib/actions/players'

interface EditPlayerPageProps {
  params: Promise<{ id: string }>
}

export default async function EditPlayerPage({ params }: EditPlayerPageProps) {
  const { id } = await params
  const [{ data: player, error }, { data: attendance }] = await Promise.all([
    getPlayer(id),
    getPlayerAttendanceHistory(id),
  ])

  if (error || !player) {
    notFound()
  }

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <Link
          href="/staff/players"
          className="inline-flex items-center gap-1 text-sm text-(--color-text-secondary) hover:text-(--color-text) transition-colors min-h-[44px]"
        >
          &larr; Retour aux joueurs
        </Link>
        <h1 className="text-2xl font-bold">Modifier le joueur</h1>
      </div>

      <PlayerForm player={player} attendance={attendance} />
    </div>
  )
}
