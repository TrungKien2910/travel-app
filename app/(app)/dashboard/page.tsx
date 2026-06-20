import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { TodayBanner } from '@/components/dashboard/today-banner'
import { ProgressRing } from '@/components/dashboard/progress-ring'
import { MemberSpendList } from '@/components/dashboard/member-spend-list'
import { StatCards } from '@/components/dashboard/stat-cards'
import { PendingTasks } from '@/components/dashboard/pending-tasks'
import { BestShotsStrip } from '@/components/dashboard/best-shots-strip'
import { DayBlock } from '@/components/trips/day-block'
import { formatDate } from '@/lib/format'
import { Plus, MapPin, CalendarDays, Users } from 'lucide-react'

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
        <h1 className="font-display text-xl font-bold text-ink sm:text-2xl">Tổng quan</h1>
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

  // Single round-trip: everything the dashboard blocks need.
  const fullTrip = await prisma.trip.findUnique({
    where: { id: trip.id },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, avatar_url: true } },
        },
      },
      days: {
        orderBy: { day_number: 'asc' },
        include: {
          destinations: {
            orderBy: { order_index: 'asc' },
            include: {
              expenses: { select: { amount: true, user_id: true } },
              feedbacks: { select: { user_id: true } },
              // All photos, best-shot first: media[0] = thumbnail, the
              // is_best_shot ones feed the "Ảnh đẹp gần nhất" strip.
              media: {
                where: { type: 'PHOTO' },
                orderBy: [{ is_best_shot: 'desc' }, { created_at: 'desc' }],
                select: {
                  id: true,
                  file_path: true,
                  file_name: true,
                  is_best_shot: true,
                },
              },
              _count: { select: { feedbacks: true } },
            },
          },
        },
      },
    },
  })

  const now = new Date()
  const todayStr = now.toDateString()
  const todayMidnight = new Date(now)
  todayMidnight.setHours(0, 0, 0, 0)

  const todayDay = fullTrip!.days.find(
    (d) => new Date(d.date).toDateString() === todayStr
  )
  const todayDests = todayDay?.destinations ?? []

  const allDests = fullTrip!.days.flatMap((d) => d.destinations)
  const liveDests = allDests.filter((d) => d.status !== 'REPLACED')
  const doneDests = allDests.filter((d) => d.status === 'DONE')
  const allExpenses = allDests.flatMap((d) => d.expenses)
  const totalSpent = allExpenses.reduce((s, e) => s + e.amount, 0)

  const memberSpend = fullTrip!.members
    .map((m) => ({
      id: m.user_id,
      name: m.user.name,
      avatar_url: m.user.avatar_url,
      total: allExpenses
        .filter((e) => e.user_id === m.user_id)
        .reduce((s, e) => s + e.amount, 0),
    }))
    .sort((a, b) => b.total - a.total)

  // Trip state + days left
  const startMid = new Date(trip.start_date)
  startMid.setHours(0, 0, 0, 0)
  const endMid = new Date(trip.end_date)
  endMid.setHours(0, 0, 0, 0)
  const tripState: 'upcoming' | 'ongoing' | 'done' =
    todayMidnight < startMid
      ? 'upcoming'
      : todayMidnight > endMid
        ? 'done'
        : 'ongoing'
  const computedDaysLeft =
    tripState === 'upcoming'
      ? Math.ceil((startMid.getTime() - todayMidnight.getTime()) / 86400000)
      : null

  // Việc cần làm: ai chưa feedback các điểm DONE
  const doneDestIds = doneDests.map((d) => d.id)
  const missingFeedback = fullTrip!.members
    .map((m) => {
      const count = doneDests.filter(
        (d) => !d.feedbacks.some((f) => f.user_id === m.user_id)
      ).length
      return { name: m.user.name, count }
    })
    .filter((x) => doneDestIds.length > 0 && x.count > 0)

  // Việc cần làm: điểm hôm nay/đã qua mà vẫn PENDING
  const overdue = fullTrip!.days
    .filter((d) => {
      const dd = new Date(d.date)
      dd.setHours(0, 0, 0, 0)
      return dd <= todayMidnight
    })
    .flatMap((d) => d.destinations)
    .filter((dest) => dest.status === 'PENDING')
    .map((dest) => ({ id: dest.id, name: dest.name }))

  // Ảnh đẹp gần nhất (tối đa 4) — chỉ ảnh được đánh dấu best-shot
  const bestShots = fullTrip!.days
    .flatMap((d) => d.destinations)
    .flatMap((dest) =>
      dest.media
        .filter((m) => m.is_best_shot)
        .map((m) => ({
          id: m.id,
          file_path: m.file_path,
          file_name: m.file_name,
          destId: dest.id,
        }))
    )
    .slice(0, 4)

  // Cover image for the trip card: best-shot anywhere, else any photo.
  const allPhotos = allDests.flatMap((d) => d.media)
  const coverImage =
    allPhotos.find((m) => m.is_best_shot)?.file_path ??
    allPhotos[0]?.file_path ??
    null

  // Background for today's banner: a photo from a today destination.
  const todayImage = todayDests.flatMap((d: any) => d.media)[0]?.file_path ?? null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold text-ink sm:text-2xl">Tổng quan</h1>
        {isAdmin && (
          <Button asChild size="sm">
            <Link href="/trips/new">
              <Plus className="mr-1 h-4 w-4" /> Chuyến đi mới
            </Link>
          </Button>
        )}
      </div>

      {/* Trip cover card */}
      <Link
        href={`/trips/${trip.id}`}
        className="group relative block h-44 overflow-hidden rounded-2xl border border-line sm:h-48"
      >
        {coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverImage}
            alt={trip.title}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="bg-golden-hour absolute inset-0" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-6">
          <h2 className="font-display text-xl font-bold drop-shadow-sm sm:text-2xl md:text-3xl">
            {trip.title}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-white/90 sm:text-sm">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {formatDate(trip.start_date)} – {formatDate(trip.end_date)}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {fullTrip!.members.length} thành viên
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {liveDests.length} điểm đến
            </span>
          </div>
        </div>
      </Link>

      <TodayBanner
        todayDestinations={todayDests as any}
        tripId={trip.id}
        isAdmin={isAdmin}
        daysUntilTrip={daysUntilTrip}
        bgImage={todayImage}
      />

      <StatCards
        totalSpent={totalSpent}
        memberCount={fullTrip!.members.length}
        doneCount={doneDests.length}
        totalDests={liveDests.length}
        daysLeft={computedDaysLeft}
        tripState={tripState}
      />

      <PendingTasks
        tripId={trip.id}
        missingFeedback={missingFeedback}
        overdue={overdue}
      />

      <div className="grid gap-6 md:grid-cols-3">
        {/* Progress */}
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-line bg-card p-6">
          <h2 className="self-start font-semibold text-ink">
            Tiến độ lịch trình
          </h2>
          <ProgressRing
            done={doneDests.length}
            total={liveDests.length}
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

      {/* Best shots */}
      <BestShotsStrip tripId={trip.id} photos={bestShots} />
    </div>
  )
}
