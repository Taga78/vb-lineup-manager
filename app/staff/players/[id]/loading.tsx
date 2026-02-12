import { Skeleton } from '@/components/ui/skeleton'

export default function PlayerDetailLoading() {
  return (
    <div className="space-y-4 px-4 py-6 max-w-lg md:max-w-2xl mx-auto">
      {/* Back link */}
      <Skeleton className="h-5 w-24" />
      {/* Title */}
      <Skeleton className="h-8 w-48" />
      {/* Form card */}
      <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-4 space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        {/* Radar + score */}
        <div className="flex items-center justify-center gap-4 py-2">
          <Skeleton className="h-20 w-20 rounded-full" />
          <Skeleton className="h-12 w-12 rounded-xl" />
        </div>
        {/* Sliders */}
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  )
}
