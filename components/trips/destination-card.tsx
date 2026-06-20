import Link from 'next/link'
import { StatusBadge } from '@/components/ui/status-badge'
import { formatVND, formatTime } from '@/lib/format'
import { Clock, MessageSquare, ChevronRight, ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DestinationCardProps {
  destination: {
    id: string
    name: string
    start_time: string | null
    end_time: string | null
    status: 'PENDING' | 'DONE' | 'REJECTED' | 'REPLACED'
    budget_estimate: number | null
    expenses: { amount: number }[]
    media?: { file_path: string }[]
    _count: { feedbacks: number }
  }
  tripId: string
}

export function DestinationCard({ destination, tripId }: DestinationCardProps) {
  const actualTotal = destination.expenses.reduce((s, e) => s + e.amount, 0)
  const overBudget =
    destination.budget_estimate != null &&
    actualTotal > destination.budget_estimate
  const replaced = destination.status === 'REPLACED'
  const thumb = destination.media?.[0]?.file_path ?? null

  return (
    <Link
      href={`/trips/${tripId}/destination/${destination.id}`}
      className={cn(
        'group flex items-stretch gap-3 rounded-xl border border-line bg-card p-2.5 transition-all hover:-translate-y-0.5 hover:border-sea/30 hover:shadow-md hover:shadow-ink/5',
        replaced && 'opacity-70'
      )}
    >
      {/* Thumbnail — helps picture the place at a glance */}
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt={destination.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground/30">
            <ImageIcon className="h-6 w-6" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 self-center">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'text-sm font-semibold',
              replaced ? 'text-muted-foreground line-through' : 'text-ink'
            )}
          >
            {destination.name}
          </span>
          <StatusBadge status={destination.status} />
        </div>
        {(destination.start_time || destination.end_time) && (
          <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {formatTime(destination.start_time)}
            {destination.end_time && ` → ${formatTime(destination.end_time)}`}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <div className="text-right">
          {destination.budget_estimate != null && (
            <p
              className={cn(
                'tabular text-xs font-medium',
                overBudget ? 'text-rose-500' : 'text-muted-foreground'
              )}
            >
              {formatVND(actualTotal)}
              <span className="text-muted-foreground/60">
                {' '}
                / {formatVND(destination.budget_estimate)}
              </span>
            </p>
          )}
          {destination._count.feedbacks > 0 && (
            <div className="mt-1 flex items-center justify-end gap-1 text-xs text-muted-foreground">
              <MessageSquare className="h-3 w-3" />
              {destination._count.feedbacks}
            </div>
          )}
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-sea" />
      </div>
    </Link>
  )
}
