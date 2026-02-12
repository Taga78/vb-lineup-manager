import { notFound } from 'next/navigation'
import { getSchedule } from '@/lib/actions/recurring-schedules'
import { RecurringScheduleForm } from '@/components/recurring-schedule-form'

export default async function EditSchedulePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { data: schedule } = await getSchedule(id)

  if (!schedule) notFound()

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Modifier le planning</h1>
      <RecurringScheduleForm schedule={schedule} />
    </div>
  )
}
