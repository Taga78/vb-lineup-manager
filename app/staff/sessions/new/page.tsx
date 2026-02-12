import Link from 'next/link'
import { SessionForm } from '@/components/session-form'
import { getSession } from '@/lib/actions/sessions'

export default async function NewSessionPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>
}) {
  const { from } = await searchParams

  let initialData = undefined
  if (from) {
    const { data: session } = await getSession(from)
    if (session) {
      // Get today's date in YYYY-MM-DD format
      const today = new Date()
      const year = today.getFullYear()
      const month = String(today.getMonth() + 1).padStart(2, '0')
      const day = String(today.getDate()).padStart(2, '0')
      const todayString = `${year}-${month}-${day}`

      initialData = {
        date: todayString,
        label: session.label,
        nb_courts_planned: session.nb_courts_planned,
        preferred_team_size: session.preferred_team_size,
      }
    }
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/staff/sessions"
          className="inline-flex items-center gap-1 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors min-h-[44px]"
        >
          &larr; Retour aux seances
        </Link>
        <h1 className="text-2xl font-bold mt-2">Nouvelle seance</h1>
      </div>

      <SessionForm initialData={initialData} />
    </div>
  )
}
