import { Skeleton } from '@/components/ui/skeleton'

export default function SummaryLoading() {
  return (
    <div className="animate-fade-up space-y-7">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-64 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  )
}
