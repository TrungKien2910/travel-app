'use client'

import Link from 'next/link'
import { UserAvatar } from '@/components/ui/user-avatar'
import { formatVND } from '@/lib/format'

interface MemberSpendListProps {
  members: { id: string; name: string; total: number; avatar_url?: string | null }[]
  tripId: string
}

export function MemberSpendList({ members, tripId }: MemberSpendListProps) {
  const max = Math.max(...members.map((m) => m.total), 1)
  const grandTotal = members.reduce((s, m) => s + m.total, 0)
  // Top spender = first with the max (members arrive pre-sorted desc).
  const topId = members.find((m) => m.total === max && m.total > 0)?.id

  return (
    <Link
      href={`/trips/${tripId}/members`}
      className="block space-y-3.5 transition-opacity hover:opacity-90"
    >
      {members.map((m) => {
        const pct = grandTotal > 0 ? Math.round((m.total / grandTotal) * 100) : 0
        const isTop = m.id === topId
        return (
          <div key={m.id}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <div className="flex min-w-0 items-center gap-2">
                <UserAvatar
                  user={m}
                  className="h-6 w-6"
                  fallbackClassName="text-[10px]"
                />
                <span className="truncate font-medium text-ink">{m.name}</span>
                {isTop && <span title="Chi nhiều nhất">🏆</span>}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="tabular text-ink">{formatVND(m.total)}</span>
                <span className="tabular w-9 text-right text-xs text-muted-foreground">
                  {pct}%
                </span>
              </div>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all ${
                  isTop ? 'bg-sun' : 'bg-sea'
                }`}
                style={{ width: `${(m.total / max) * 100}%` }}
              />
            </div>
          </div>
        )
      })}
    </Link>
  )
}
