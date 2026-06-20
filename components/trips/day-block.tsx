import { DestinationCard } from './destination-card'
import { formatDate, formatVND } from '@/lib/format'
import { MapPin } from 'lucide-react'

interface DayBlockProps {
  day: {
    id: string
    date: string
    day_number: number
    label: string | null
    destinations: any[]
  }
  tripId: string
  isLast?: boolean
}

export function DayBlock({ day, tripId, isLast }: DayBlockProps) {
  const totalBudget = day.destinations.reduce(
    (s: number, d: any) => s + (d.budget_estimate ?? 0),
    0
  )
  const totalActual = day.destinations.reduce(
    (s: number, d: any) =>
      s + d.expenses.reduce((es: number, e: any) => es + e.amount, 0),
    0
  )

  return (
    <div className="relative pl-9">
      {/* Day-rail: continuous line + marker */}
      {!isLast && (
        <div className="absolute bottom-0 left-[13px] top-8 w-px bg-gradient-to-b from-sea/40 to-line" />
      )}
      <div className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-golden-hour text-[10px] font-bold text-white shadow-sm ring-4 ring-background">
        {day.day_number}
      </div>

      <div className="pb-7">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-base font-semibold text-ink">
              Ngày {day.day_number}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {formatDate(day.date)}
              </span>
            </h3>
            {day.label && (
              <p className="mt-0.5 text-sm text-muted-foreground">{day.label}</p>
            )}
          </div>
          {totalBudget > 0 && (
            <div className="text-right text-xs text-muted-foreground">
              <p className="tabular font-medium text-ink">
                {formatVND(totalActual)}
              </p>
              <p>/ {formatVND(totalBudget)}</p>
            </div>
          )}
        </div>

        {day.destinations.length === 0 ? (
          <p className="flex items-center gap-2 rounded-lg border border-dashed border-line bg-muted/40 px-3 py-2.5 text-sm italic text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            Chưa có điểm đến nào trong ngày này.
          </p>
        ) : (
          <div className="space-y-2">
            {day.destinations.map((dest: any) => (
              <DestinationCard key={dest.id} destination={dest} tripId={tripId} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
