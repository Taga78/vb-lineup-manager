import { RecurringScheduleForm } from '@/components/recurring-schedule-form'

export default function NewSchedulePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Nouveau planning</h1>
      <RecurringScheduleForm />
    </div>
  )
}
