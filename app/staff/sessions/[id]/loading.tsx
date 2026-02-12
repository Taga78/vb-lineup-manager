import { Skeleton } from '@/components/ui/skeleton'

export default function SessionDetailLoading() {
  return (
    <div className="space-y-4 px-4 py-6 max-w-lg md:max-w-2xl mx-auto">
      {/* Back link */}
      <Skeleton className="h-5 w-24" />
      {/* Title */}
      <Skeleton className="h-8 w-48" />
      {/* Info card */}
      <Skeleton className="h-24 w-full" />
      {/* Attendance board */}
      <Skeleton className="h-6 w-32 mt-4" />
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    </div>
  )
}
