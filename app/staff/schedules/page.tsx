import Link from 'next/link'
import { getSchedules } from '@/lib/actions/recurring-schedules'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { DAYS_OF_WEEK_SHORT_FR } from '@/lib/types'

export default async function SchedulesPage() {
  const { data: schedules, error } = await getSchedules()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Planification</h1>
        <Link href="/staff/schedules/new">
          <Button size="sm">Nouveau planning</Button>
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 mb-4">
          Erreur : {error}
        </div>
      )}

      {schedules.length === 0 && !error ? (
        <EmptyState
          title="Aucun planning"
          description="Créez un planning récurrent pour automatiser l'ouverture des séances."
          action={
            <Link href="/staff/schedules/new">
              <Button>Nouveau planning</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {schedules.map((s) => (
            <Link key={s.id} href={`/staff/schedules/${s.id}`} className="block">
              <Card className="hover:border-(--color-primary)/30 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{s.label}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {s.days_of_week
                        .slice()
                        .sort()
                        .map((d) => (
                          <Badge key={d} variant="info">
                            {DAYS_OF_WEEK_SHORT_FR[d]}
                          </Badge>
                        ))}
                    </div>
                    <p className="mt-1.5 text-sm text-(--color-text-secondary)">
                      {s.session_time.slice(0, 5)} — {s.nb_courts_planned} terrain{s.nb_courts_planned > 1 ? 's' : ''}, {s.preferred_team_size}/equipe
                    </p>
                  </div>
                  <Badge variant={s.is_active ? 'success' : 'default'}>
                    {s.is_active ? 'Actif' : 'Inactif'}
                  </Badge>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
