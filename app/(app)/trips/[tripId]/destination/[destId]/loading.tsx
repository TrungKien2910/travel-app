import { Skeleton } from '@/components/ui/skeleton'

export default function DestinationLoading() {
  return (
    <div className="animate-fade-up space-y-4">
      <Skeleton className="h-4 w-72" />
      <div className="rounded-2xl border border-line bg-card p-5">
        <Skeleton className="h-7 w-1/2 max-w-xs" />
        <Skeleton className="mt-2 h-4 w-40" />
      </div>
      <div className="rounded-2xl border border-line bg-card">
        <Skeleton className="h-12 w-full rounded-b-none" />
        <div className="space-y-3 p-5">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    </div>
  )
}
