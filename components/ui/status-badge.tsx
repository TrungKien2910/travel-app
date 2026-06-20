import { cn } from '@/lib/utils'

const statusConfig = {
  PENDING: {
    label: 'Chưa đi',
    className: 'border-sun/40 bg-sun-soft text-sun-deep',
    dot: 'bg-sun',
  },
  DONE: {
    label: 'Đã đi',
    className: 'border-emerald-300 bg-emerald-50 text-emerald-700',
    dot: 'bg-emerald-500',
  },
  REJECTED: {
    label: 'Bỏ qua',
    className: 'border-rose-300 bg-rose-50 text-rose-600',
    dot: 'bg-rose-500',
  },
  REPLACED: {
    label: 'Đã thay',
    className: 'border-line bg-muted text-muted-foreground line-through',
    dot: 'bg-muted-foreground',
  },
} as const

export type DestStatus = keyof typeof statusConfig

export function StatusBadge({
  status,
  className,
}: {
  status: DestStatus
  className?: string
}) {
  const cfg = statusConfig[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium',
        cfg.className,
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  )
}
