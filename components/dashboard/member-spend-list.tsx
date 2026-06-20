'use client'

import Link from 'next/link'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { formatVND } from '@/lib/format'

interface MemberSpendListProps {
  members: { id: string; name: string; total: number }[]
  tripId: string
}

export function MemberSpendList({ members, tripId }: MemberSpendListProps) {
  const max = Math.max(...members.map((m) => m.total), 1)

  return (
    <Link
      href={`/trips/${tripId}/members`}
      className="block space-y-3 transition-opacity hover:opacity-90"
    >
      {members.map((m) => (
        <div key={m.id}>
          <div className="mb-1 flex justify-between text-sm">
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="bg-sea-soft text-[10px] font-semibold text-sea-deep">
                  {m.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium text-ink">{m.name}</span>
            </div>
            <span className="tabular text-muted-foreground">
              {formatVND(m.total)}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-sea transition-all"
              style={{ width: `${(m.total / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </Link>
  )
}
