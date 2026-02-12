import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSchedule, getExclusions } from '@/lib/actions/recurring-schedules'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ExclusionList } from '@/components/exclusion-list'
import { DAYS_OF_WEEK_FR } from '@/lib/types'
import { ScheduleActions } from './schedule-actions'

export default async function ScheduleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [{ data: schedule }, { data: exclusions }] = await Promise.all([
    getSchedule(id),
    getExclusions(id),
  ])

  if (!schedule) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{schedule.label}</h1>
        <div className="flex gap-2">
          <Link href={`/staff/schedules/${id}/edit`}>
            <Button variant="secondary" size="sm">Modifier</Button>
          </Link>
        </div>
      </div>

      <Card>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant={schedule.is_active ? 'success' : 'default'}>
              {schedule.is_active ? 'Actif' : 'Inactif'}
            </Badge>
          </div>

          <div>
            <p className="text-sm text-(--color-text-secondary)">Jours</p>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {schedule.days_of_week
                .slice()
                .sort()
                .map((d) => (
                  <Badge key={d} variant="info">
                    {DAYS_OF_WEEK_FR[d]}
                  </Badge>
                ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-(--color-text-secondary)">Heure</p>
              <p className="font-medium">{schedule.session_time.slice(0, 5)}</p>
            </div>
            <div>
              <p className="text-(--color-text-secondary)">Ouverture avant</p>
              <p className="font-medium">{schedule.open_before_minutes} min</p>
            </div>
            <div>
              <p className="text-(--color-text-secondary)">Terrains</p>
              <p className="font-medium">{schedule.nb_courts_planned}</p>
            </div>
            <div>
              <p className="text-(--color-text-secondary)">Joueurs / equipe</p>
              <p className="font-medium">{schedule.preferred_team_size}</p>
            </div>
          </div>

          {schedule.session_label_template && (
            <div className="text-sm">
              <p className="text-(--color-text-secondary)">Libellé séance</p>
              <p className="font-medium">{schedule.session_label_template}</p>
            </div>
          )}
        </div>
      </Card>

      <ScheduleActions scheduleId={id} isActive={schedule.is_active} />

      <ExclusionList scheduleId={id} exclusions={exclusions} />
    </div>
  )
}
