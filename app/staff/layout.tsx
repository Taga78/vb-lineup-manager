import { NavHeader } from '@/components/nav-header'

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-(--color-background)]">
      <main className="pb-24 px-4 pt-4 safe-area-top max-w-lg md:max-w-2xl mx-auto">
        {children}
      </main>
      <NavHeader />
    </div>
  )
}
