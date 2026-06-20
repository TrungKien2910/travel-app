import { formatVND } from '@/lib/format'

interface ExpenseProgressProps {
  actual: number
  budget: number | null
}

export function ExpenseProgress({ actual, budget }: ExpenseProgressProps) {
  if (!budget)
    return (
      <div className="text-sm text-muted-foreground">
        Chi tiêu thực tế:{' '}
        <span className="tabular font-semibold text-ink">
          {formatVND(actual)}
        </span>
      </div>
    )

  const pct = Math.min((actual / budget) * 100, 100)
  const over = actual > budget
  const color = over ? 'bg-rose-400' : actual / budget > 0.8 ? 'bg-sun' : 'bg-sea'

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Thực tế / Dự tính</span>
        <span
          className={
            over ? 'tabular font-semibold text-rose-500' : 'tabular text-ink'
          }
        >
          {formatVND(actual)} / {formatVND(budget)}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
