import { Skeleton } from '@/components/ui/skeleton'

export default function MembersLoading() {
  return (
    <div className="animate-fade-up space-y-7">
      <Skeleton className="h-8 w-64" />
      <div className="rounded-2xl border border-line bg-card p-6">
        <Skeleton className="mb-4 h-5 w-32" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  )
}
