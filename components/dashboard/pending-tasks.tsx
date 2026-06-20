import Link from 'next/link'
import { CheckCircle2, MessageSquareWarning, MapPinned, ChevronRight } from 'lucide-react'

interface PendingTasksProps {
  tripId: string
  /** [{ name, missingCount }] — thành viên còn điểm chưa cho cảm nhận */
  missingFeedback: { name: string; count: number }[]
  /** điểm thuộc ngày hôm nay/đã qua mà vẫn PENDING */
  overdue: { id: string; name: string }[]
}

export function PendingTasks({
  tripId,
  missingFeedback,
  overdue,
}: PendingTasksProps) {
  const nothing = missingFeedback.length === 0 && overdue.length === 0

  return (
    <div className="rounded-2xl border border-sun/30 bg-sun-soft/40 p-6">
      <h2 className="mb-4 flex items-center gap-2 font-semibold text-ink">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sun text-white">
          <CheckCircle2 className="h-3.5 w-3.5" />
        </span>
        Việc cần làm
      </h2>

      {nothing ? (
        <p className="flex items-center gap-2 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          Mọi thứ đã ổn — không còn việc nào đang chờ.
        </p>
      ) : (
        <div className="space-y-2.5">
          {overdue.map((d) => (
            <Link
              key={d.id}
              href={`/trips/${tripId}/destination/${d.id}`}
              className="group flex items-center gap-3 rounded-xl border border-line bg-card p-3 transition-colors hover:border-sun/40"
            >
              <MapPinned className="h-4 w-4 shrink-0 text-sun-deep" />
              <span className="flex-1 text-sm text-ink">
                <span className="font-medium">{d.name}</span>
                <span className="text-muted-foreground"> chưa cập nhật trạng thái</span>
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}

          {missingFeedback.map((m) => (
            <Link
              key={m.name}
              href={`/trips/${tripId}/members`}
              className="group flex items-center gap-3 rounded-xl border border-line bg-card p-3 transition-colors hover:border-sun/40"
            >
              <MessageSquareWarning className="h-4 w-4 shrink-0 text-sun-deep" />
              <span className="flex-1 text-sm text-ink">
                <span className="font-medium">{m.name}</span>
                <span className="text-muted-foreground">
                  {' '}
                  chưa nhận xét {m.count} điểm đã đi
                </span>
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
