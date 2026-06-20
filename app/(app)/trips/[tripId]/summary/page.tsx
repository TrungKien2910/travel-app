import { auth } from '@/lib/auth'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { BudgetChart } from '@/components/summary/budget-chart'
import { PhotoGallery } from '@/components/summary/photo-gallery'
import { formatVND, formatDate } from '@/lib/format'
import { ArrowLeft, Trophy, Camera, Calendar, MapPin } from 'lucide-react'

export default async function SummaryPage({
  params,
}: {
  params: { tripId: string }
}) {
  await auth()

  const trip = await prisma.trip.findUnique({
    where: { id: params.tripId },
    include: {
      members: { include: { user: { select: { id: true, name: true } } } },
      days: {
        orderBy: { day_number: 'asc' },
        include: {
          destinations: {
            include: {
              expenses: { select: { amount: true, user_id: true } },
              feedbacks: { select: { status: true } },
              media: {
                where: { type: 'PHOTO' },
                orderBy: { created_at: 'asc' },
              },
            },
          },
        },
      },
    },
  })

  if (!trip) notFound()

  const allDests = trip.days.flatMap((d) => d.destinations)
  const allExpenses = allDests.flatMap((d) => d.expenses)
  const allPhotos = trip.days.flatMap((d) =>
    d.destinations.flatMap((dest) =>
      dest.media.map((m) => ({
        id: m.id,
        file_path: m.file_path,
        file_name: m.file_name,
        is_best_shot: m.is_best_shot,
        day_number: d.day_number,
        day_label: d.label,
      }))
    )
  )

  const bestShots = allPhotos.filter((p) => p.is_best_shot).slice(0, 3)
  const doneDests = allDests.filter((d) => d.status === 'DONE')
  const totalBudget = allDests.reduce((s, d) => s + (d.budget_estimate ?? 0), 0)
  const totalActual = allExpenses.reduce((s, e) => s + e.amount, 0)
  const overBudget = totalActual > totalBudget && totalBudget > 0

  const budgetChartData = trip.days.map((day) => ({
    label: `Ngày ${day.day_number}`,
    budget: day.destinations.reduce((s, d) => s + (d.budget_estimate ?? 0), 0),
    actual: day.destinations
      .flatMap((d) => d.expenses)
      .reduce((s, e) => s + e.amount, 0),
  }))

  const memberSpend = trip.members
    .map((m) => ({
      ...m,
      total: allExpenses
        .filter((e) => e.user_id === m.user_id)
        .reduce((s, e) => s + e.amount, 0),
    }))
    .sort((a, b) => b.total - a.total)

  const topDests = allDests
    .map((d) => ({
      id: d.id,
      name: d.name,
      okCount: d.feedbacks.filter((f) => f.status === 'OK').length,
      notOkCount: d.feedbacks.filter((f) => f.status === 'NOT_OK').length,
      maybeCount: d.feedbacks.filter((f) => f.status === 'MAYBE').length,
    }))
    .filter((d) => d.okCount > 0)
    .sort((a, b) => b.okCount - a.okCount)
    .slice(0, 3)

  return (
    <div className="space-y-7">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href={`/trips/${params.tripId}`}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Lịch trình
          </Link>
        </Button>
        <h1 className="font-display text-2xl font-bold text-ink">
          Tổng kết chuyến đi
        </h1>
      </div>

      {/* Best shots hero */}
      {bestShots.length > 0 ? (
        <div className="relative h-64 overflow-hidden rounded-2xl border border-line">
          <div
            className={`grid h-full gap-1 ${
              bestShots.length === 1
                ? 'grid-cols-1'
                : bestShots.length === 2
                  ? 'grid-cols-2'
                  : 'grid-cols-3'
            }`}
          >
            {bestShots.map((photo) => (
              <div key={photo.id} className="relative h-full">
                <Image
                  src={photo.file_path}
                  alt={photo.file_name}
                  fill
                  sizes="(max-width: 768px) 100vw, 400px"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
          <div className="pointer-events-none absolute inset-0 flex items-end bg-gradient-to-t from-ink/80 via-ink/20 to-transparent p-6">
            <div className="text-white">
              <h2 className="font-display text-2xl font-bold">{trip.title}</h2>
              <p className="text-sm text-white/85">
                {formatDate(trip.start_date)} – {formatDate(trip.end_date)} ·{' '}
                {trip.members.length} thành viên
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-horizon rounded-2xl border border-line bg-card p-6">
          <h2 className="font-display text-2xl font-bold text-ink">
            {trip.title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDate(trip.start_date)} – {formatDate(trip.end_date)} ·{' '}
            {trip.members.length} thành viên
          </p>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          icon={<MapPin className="h-5 w-5 text-sea" />}
          value={`${doneDests.length}/${allDests.length}`}
          label="Điểm đã đi"
        />
        <div
          className={`rounded-2xl border bg-card p-5 text-center ${
            overBudget ? 'border-rose-200' : 'border-line'
          }`}
        >
          <Trophy className="mx-auto mb-2 h-5 w-5 text-sun" />
          <div
            className={`tabular text-xl font-bold ${
              overBudget ? 'text-rose-500' : 'text-ink'
            }`}
          >
            {formatVND(totalActual)}
          </div>
          <div className="text-xs text-muted-foreground">Tổng chi tiêu</div>
          {totalBudget > 0 && (
            <div className="text-xs text-muted-foreground">
              / {formatVND(totalBudget)} dự tính
            </div>
          )}
        </div>
        <StatCard
          icon={<Calendar className="h-5 w-5 text-sea" />}
          value={String(trip.days.length)}
          label="Ngày đi"
        />
        <StatCard
          icon={<Camera className="h-5 w-5 text-sea" />}
          value={String(allPhotos.length)}
          label="Ảnh đã chụp"
        />
      </div>

      {/* Budget chart */}
      {budgetChartData.some((d) => d.budget > 0 || d.actual > 0) && (
        <div className="rounded-2xl border border-line bg-card p-6">
          <h2 className="mb-4 font-semibold text-ink">Ngân sách theo ngày</h2>
          <BudgetChart data={budgetChartData} />
        </div>
      )}

      {/* Member spend */}
      {memberSpend.length > 0 && (
        <div className="rounded-2xl border border-line bg-card p-6">
          <h2 className="mb-4 font-semibold text-ink">Chi tiêu thành viên</h2>
          <div className="space-y-3">
            {memberSpend.map((m, i) => (
              <div key={m.user_id} className="flex items-center gap-3">
                <div
                  className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                    i === 0 ? 'bg-sun' : 'bg-sea/70'
                  }`}
                >
                  {i === 0 ? '🏆' : i + 1}
                </div>
                <span className="flex-1 text-sm font-medium text-ink">
                  {m.user.name}
                </span>
                <span className="tabular text-sm text-ink">
                  {formatVND(m.total)}
                </span>
                <span className="tabular w-10 text-right text-xs text-muted-foreground">
                  {totalActual > 0
                    ? Math.round((m.total / totalActual) * 100)
                    : 0}
                  %
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top destinations */}
      {topDests.length > 0 && (
        <div className="rounded-2xl border border-line bg-card p-6">
          <h2 className="mb-4 font-semibold text-ink">Điểm đến yêu thích</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {topDests.map((dest, i) => (
              <Link
                key={dest.id}
                href={`/trips/${params.tripId}/destination/${dest.id}`}
                className="block overflow-hidden rounded-xl border border-line transition-shadow hover:shadow-md hover:shadow-ink/5"
              >
                <div className="bg-sea-soft/60 p-4 text-center">
                  <div className="mb-1 text-2xl">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                  </div>
                  <div className="text-sm font-medium text-ink">
                    {dest.name}
                  </div>
                </div>
                <div className="flex justify-center gap-3 p-3 text-xs text-muted-foreground">
                  <span>👍 {dest.okCount}</span>
                  <span>👎 {dest.notOkCount}</span>
                  <span>🤔 {dest.maybeCount}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Photo gallery */}
      {allPhotos.length > 0 && (
        <div className="rounded-2xl border border-line bg-card p-6">
          <h2 className="mb-4 font-semibold text-ink">Ảnh chuyến đi</h2>
          <PhotoGallery photos={allPhotos} />
        </div>
      )}
    </div>
  )
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode
  value: string
  label: string
}) {
  return (
    <div className="rounded-2xl border border-line bg-card p-5 text-center">
      <div className="mx-auto mb-2 flex justify-center">{icon}</div>
      <div className="tabular text-xl font-bold text-ink">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}
