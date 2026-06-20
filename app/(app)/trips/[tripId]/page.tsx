import { auth } from '@/lib/auth'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { DayBlock } from '@/components/trips/day-block'
import { formatDate, formatVND } from '@/lib/format'
import { Settings, Users, Trophy, CalendarDays, MapPin } from 'lucide-react'

export default async function TripDetailPage({
  params,
}: {
  params: { tripId: string }
}) {
  const session = await auth()
  const isAdmin = (session?.user as any)?.role === 'ADMIN'

  const trip = await prisma.trip.findUnique({
    where: { id: params.tripId },
    include: {
      members: { include: { user: { select: { id: true, name: true } } } },
      days: {
        orderBy: { day_number: 'asc' },
        include: {
          destinations: {
            orderBy: { order_index: 'asc' },
            include: {
              expenses: { select: { amount: true } },
              media: {
                where: { type: 'PHOTO' },
                orderBy: [{ is_best_shot: 'desc' }, { created_at: 'asc' }],
                take: 1,
                select: { file_path: true },
              },
              _count: { select: { feedbacks: true } },
            },
          },
        },
      },
    },
  })

  if (!trip) notFound()

  const allDests = trip.days.flatMap((d) => d.destinations)
  const totalBudget = allDests.reduce(
    (s, d) => s + (d.budget_estimate ?? 0),
    0
  )
  const totalActual = allDests
    .flatMap((d) => d.expenses)
    .reduce((s, e) => s + e.amount, 0)
  const pct = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Hero header */}
      <div className="bg-horizon relative overflow-hidden rounded-2xl border border-line bg-card p-5 shadow-sm sm:p-6 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-xl font-bold text-ink sm:text-2xl md:text-3xl">
              {trip.title}
            </h1>
            {trip.description && (
              <p className="mt-1.5 max-w-prose text-muted-foreground">
                {trip.description}
              </p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 text-sea" />
                {formatDate(trip.start_date)} – {formatDate(trip.end_date)}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-sea" />
                {trip.members.length} thành viên
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-sea" />
                {allDests.length} điểm đến
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {isAdmin && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/trips/${trip.id}/config`}>
                  <Settings className="mr-1 h-4 w-4" /> Cấu hình
                </Link>
              </Button>
            )}
            <Button asChild variant="outline" size="sm">
              <Link href={`/trips/${trip.id}/members`}>
                <Users className="mr-1 h-4 w-4" /> Thành viên
              </Link>
            </Button>
            <Button asChild variant="accent" size="sm">
              <Link href={`/trips/${trip.id}/summary`}>
                <Trophy className="mr-1 h-4 w-4" /> Tổng kết
              </Link>
            </Button>
          </div>
        </div>

        {totalBudget > 0 && (
          <div className="mt-5 border-t border-line pt-4">
            <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
              <span className="shrink-0 text-muted-foreground">
                Chi tiêu cả chuyến
              </span>
              <span
                className={
                  totalActual > totalBudget
                    ? 'tabular whitespace-nowrap text-right font-semibold text-rose-500'
                    : 'tabular whitespace-nowrap text-right font-medium text-ink'
                }
              >
                {formatVND(totalActual)} / {formatVND(totalBudget)}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all ${
                  pct > 100
                    ? 'bg-rose-400'
                    : pct > 80
                      ? 'bg-sun'
                      : 'bg-sea'
                }`}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Days timeline */}
      <div className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-ink">
          Lịch trình
        </h2>
        {trip.days.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-card p-10 text-center">
            <CalendarDays className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="text-muted-foreground">
              Chưa có ngày nào.{' '}
              {isAdmin && 'Vào Cấu hình để bắt đầu thêm ngày và điểm đến.'}
            </p>
            {isAdmin && (
              <Button asChild className="mt-4" size="sm">
                <Link href={`/trips/${trip.id}/config`}>
                  <Settings className="mr-1 h-4 w-4" /> Mở cấu hình
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-line bg-card p-5 md:p-6">
            {trip.days.map((day, i) => (
              <DayBlock
                key={day.id}
                day={day as any}
                tripId={trip.id}
                isLast={i === trip.days.length - 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
