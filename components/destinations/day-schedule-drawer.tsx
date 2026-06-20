'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { formatDate, formatTime } from '@/lib/format'
import { CalendarRange, Clock, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DayDest {
  id: string
  name: string
  order_index: number
  start_time: string | null
  end_time: string | null
  status: 'PENDING' | 'DONE' | 'REJECTED' | 'REPLACED'
}

export function DayScheduleDrawer({
  destinations,
  currentDestId,
  tripId,
  dayNumber,
  dayDate,
}: {
  destinations: DayDest[]
  currentDestId: string
  tripId: string
  dayNumber: number
  dayDate: string
}) {
  const [open, setOpen] = useState(false)

  // Hide replaced ones, but always keep the destination being viewed.
  const list = destinations
    .filter((d) => d.status !== 'REPLACED' || d.id === currentDestId)
    .sort((a, b) => a.order_index - b.order_index)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <CalendarRange className="mr-1.5 h-4 w-4" /> Lịch trình ngày
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80 p-0 sm:w-96">
        <SheetHeader className="border-b border-line bg-muted/40 p-5">
          <SheetTitle className="font-display">
            Ngày {dayNumber}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {formatDate(dayDate)}
            </span>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-2 overflow-y-auto p-4">
          {list.map((d) => {
            const isCurrent = d.id === currentDestId
            const Wrapper: any = isCurrent ? 'div' : Link
            return (
              <Wrapper
                key={d.id}
                {...(!isCurrent && {
                  href: `/trips/${tripId}/destination/${d.id}`,
                  onClick: () => setOpen(false),
                })}
                className={cn(
                  'block rounded-xl border p-3 transition-colors',
                  isCurrent
                    ? 'border-sea/40 bg-sea-soft/60'
                    : 'border-line bg-card hover:border-sea/30 hover:bg-muted/40'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={cn(
                      'text-sm font-semibold',
                      d.status === 'REPLACED'
                        ? 'text-muted-foreground line-through'
                        : 'text-ink'
                    )}
                  >
                    {d.name}
                  </span>
                  <StatusBadge status={d.status} className="shrink-0" />
                </div>

                <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                  {(d.start_time || d.end_time) && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(d.start_time)}
                      {d.end_time && ` → ${formatTime(d.end_time)}`}
                    </span>
                  )}
                  {isCurrent && (
                    <span className="flex items-center gap-1 font-medium text-sea-deep">
                      <MapPin className="h-3 w-3" /> Đang xem
                    </span>
                  )}
                </div>
              </Wrapper>
            )
          })}

          {list.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Ngày này chưa có điểm đến nào khác.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
