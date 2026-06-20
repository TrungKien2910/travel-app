import { Skeleton } from '@/components/ui/skeleton'
import { RowsSkeleton } from '@/components/ui/page-skeleton'

export default function DashboardLoading() {
  return (
    <div className="animate-fade-up space-y-6">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-32 w-full rounded-2xl" />
      <div className="grid gap-6 md:grid-cols-3">
        <Skeleton className="h-64 rounded-2xl md:col-span-1" />
        <Skeleton className="h-64 rounded-2xl md:col-span-2" />
      </div>
      <div className="rounded-2xl border border-line bg-card p-6">
        <RowsSkeleton rows={3} />
      </div>
    </div>
  )
}
