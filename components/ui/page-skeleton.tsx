import { Skeleton } from '@/components/ui/skeleton'

/** Shimmering placeholder for a page header (title + meta row). */
export function HeaderSkeleton() {
  return (
    <div className="bg-horizon rounded-2xl border border-line bg-card p-6 md:p-7">
      <Skeleton className="h-8 w-2/3 max-w-xs" />
      <Skeleton className="mt-3 h-4 w-1/2 max-w-sm" />
      <div className="mt-4 flex gap-4">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  )
}

/** A few stacked card rows — good stand-in for lists/timelines. */
export function RowsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between rounded-xl border border-line bg-card p-3.5"
        >
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  )
}

/** Generic page skeleton: header + a card of rows. */
export function PageSkeleton() {
  return (
    <div className="animate-fade-up space-y-6">
      <HeaderSkeleton />
      <div className="rounded-2xl border border-line bg-card p-5 md:p-6">
        <RowsSkeleton rows={4} />
      </div>
    </div>
  )
}
