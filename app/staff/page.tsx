import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { LogoutButton } from '@/components/logout-button'

export default function StaffDashboard() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">VB Lineup Manager</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/staff/change-password"
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-black/5 transition-colors text-[var(--color-text-secondary)]"
            title="Changer le mot de passe"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Link>
          <LogoutButton />
        </div>
      </div>

      <div className="space-y-4">
        <Link href="/staff/players" className="block">
          <Card className="hover:border-[var(--color-primary)]/30 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold">Joueurs</h2>
                <p className="text-sm text-[var(--color-text-secondary)]">Gérer les joueurs et niveaux</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/staff/sessions" className="block">
          <Card className="hover:border-[var(--color-success)]/30 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-[var(--color-success)]/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-[var(--color-success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold">Séances</h2>
                <p className="text-sm text-[var(--color-text-secondary)]">Gérer les séances d&apos;entraînement</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/staff/schedules" className="block">
          <Card className="hover:border-[var(--color-danger)]/30 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-[var(--color-danger)]/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-[var(--color-danger)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold">Planification</h2>
                <p className="text-sm text-[var(--color-text-secondary)]">Plannings récurrents et exclusions</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/attend" className="block">
          <Card className="hover:border-[var(--color-warning)]/30 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-[var(--color-warning)]/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-[var(--color-warning)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold">Présence</h2>
                <p className="text-sm text-[var(--color-text-secondary)]">Page de pointage des joueurs</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  )
}
