import { Skeleton } from '@/components/ui/skeleton'

export default function PlayersLoading() {
  return (
    <div className="space-y-4 px-4 py-6 max-w-lg md:max-w-2xl mx-auto">
      {/* Search bar */}
      <Skeleton className="h-10 w-full" />
      {/* Checkbox */}
      <Skeleton className="h-5 w-48" />
      {/* Player cards */}
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  )
}
