import { NavHeader } from '@/components/nav-header'

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <main className="pb-20 px-4 pt-4 max-w-lg md:max-w-2xl mx-auto">
        {children}
      </main>
      <NavHeader />
    </div>
  )
}
