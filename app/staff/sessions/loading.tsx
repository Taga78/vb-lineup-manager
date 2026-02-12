import { Skeleton } from '@/components/ui/skeleton'

export default function SessionsLoading() {
  return (
    <div className="space-y-4 px-4 py-6 max-w-lg md:max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-9 w-36" />
      </div>
      {/* Session cards */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    </div>
  )
}
