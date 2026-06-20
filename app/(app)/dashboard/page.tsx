import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { TodayBanner } from '@/components/dashboard/today-banner'
import { ProgressRing } from '@/components/dashboard/progress-ring'
import { MemberSpendList } from '@/components/dashboard/member-spend-list'
import { DayBlock } from '@/components/trips/day-block'
import { Plus, MapPin } from 'lucide-react'

async function getActiveTrip(userId: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayEnd = new Date(today)
  todayEnd.setHours(23, 59, 59, 999)

  const trips = await prisma.trip.findMany({
    where: {
      OR: [
        { created_by: userId },
        { members: { some: { user_id: userId } } },
      ],
    },
    orderBy: { start_date: 'asc' },
  })

  const active = trips.find(
    (t) => t.start_date <= todayEnd && t.end_date >= today
  )
  if (active) return { trip: active, daysUntilTrip: 0 }

  const upcoming = trips
    .filter((t) => t.start_date > todayEnd)
    .sort((a, b) => a.start_date.getTime() - b.start_date.getTime())[0]
  if (upcoming) {
    const diff = Math.ceil(
      (upcoming.start_date.getTime() - today.getTime()) / 86400000
    )
    return { trip: upcoming, daysUntilTrip: diff }
  }

  const past = trips
    .filter((t) => t.end_date < today)
    .sort((a, b) => b.end_date.getTime() - a.end_date.getTime())[0]
  if (past) return { trip: past, daysUntilTrip: 0 }

  return null
}

export default async function DashboardPage() {
  const session = await auth()
  const isAdmin = (session?.user as any)?.role === 'ADMIN'

  const active = await getActiveTrip(session!.user.id)

  if (!active) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold text-ink">Tổng quan</h1>
        <div className="rounded-2xl border border-dashed border-line bg-card p-12 text-center">
          <MapPin className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
          <p className="mb-4 text-muted-foreground">
            Bạn chưa có chuyến đi nào.
          </p>
          {isAdmin && (
            <Button asChild>
              <Link href="/trips/new">
                <Plus className="mr-1 h-4 w-4" /> Tạo chuyến đi
              </Link>
            </Button>
          )}
        </div>
      </div>
    )
  }

  const { trip, daysUntilTrip } = active

  const fullTrip = await prisma.trip.findUnique({
    where: { id: trip.id },
    include: {
      members: { include: { user: { select: { id: true, name: true } } } },
      days: {
        orderBy: { day_number: 'asc' },
        include: {
          destinations: {
            orderBy: { order_index: 'asc' },
            include: {
              expenses: { select: { amount: true, user_id: true } },
              _count: { select: { feedbacks: true } },
            },
          },
        },
      },
    },
  })

  const todayStr = new Date().toDateString()
  const todayDay = fullTrip!.days.find(
    (d) => new Date(d.date).toDateString() === todayStr
  )
  const todayDests = todayDay?.destinations ?? []

  const allDests = fullTrip!.days.flatMap((d) => d.destinations)
  const doneDests = allDests.filter((d) => d.status === 'DONE')
  const allExpenses = allDests.flatMap((d) => d.expenses)

  const memberSpend = fullTrip!.members
    .map((m) => ({
      id: m.user_id,
      name: m.user.name,
      total: allExpenses
        .filter((e) => e.user_id === m.user_id)
        .reduce((s, e) => s + e.amount, 0),
    }))
    .sort((a, b) => b.total - a.total)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">
            Tổng quan
          </h1>
          <Link
            href={`/trips/${trip.id}`}
            className="text-sm text-muted-foreground transition-colors hover:text-sea"
          >
            {trip.title} →
          </Link>
        </div>
        {isAdmin && (
          <Button asChild size="sm">
            <Link href="/trips/new">
              <Plus className="mr-1 h-4 w-4" /> Chuyến đi mới
            </Link>
          </Button>
        )}
      </div>

      <TodayBanner
        todayDestinations={todayDests as any}
        tripId={trip.id}
        isAdmin={isAdmin}
        daysUntilTrip={daysUntilTrip}
      />

      <div className="grid gap-6 md:grid-cols-3">
        {/* Progress */}
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-line bg-card p-6">
          <h2 className="self-start font-semibold text-ink">
            Tiến độ lịch trình
          </h2>
          <ProgressRing
            done={doneDests.length}
            total={allDests.length}
            size={128}
          />
          <div className="mt-1 flex flex-wrap justify-center gap-1.5">
            {fullTrip!.days.map((day) => {
              const isToday =
                new Date(day.date).toDateString() === todayStr
              return (
                <Link
                  key={day.id}
                  href={`/trips/${trip.id}`}
                  className={`rounded-full border px-2 py-0.5 text-xs transition-colors ${
                    isToday
                      ? 'border-sea bg-sea text-white'
                      : 'border-line bg-card text-muted-foreground hover:border-sea/30'
                  }`}
                >
                  N{day.day_number}
                </Link>
              )
            })}
          </div>
        </div>

        {/* Member spend */}
        <div className="rounded-2xl border border-line bg-card p-6 md:col-span-2">
          <h2 className="mb-4 font-semibold text-ink">Chi tiêu thành viên</h2>
          {memberSpend.some((m) => m.total > 0) ? (
            <MemberSpendList members={memberSpend} tripId={trip.id} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Chưa có chi tiêu nào được ghi nhận.
            </p>
          )}
        </div>
      </div>

      {/* Today's timeline */}
      {todayDay && todayDests.length > 0 && (
        <div className="rounded-2xl border border-line bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-ink">Lịch trình hôm nay</h2>
            <Button asChild variant="outline" size="sm">
              <Link href={`/trips/${trip.id}`}>Xem tất cả</Link>
            </Button>
          </div>
          <DayBlock day={todayDay as any} tripId={trip.id} isLast />
        </div>
      )}
    </div>
  )
}
