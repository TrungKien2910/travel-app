import { auth } from '@/lib/auth'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { MemberGrid } from '@/components/members/member-grid'
import { SpendChart } from '@/components/members/spend-chart'
import { SpendTable } from '@/components/members/spend-table'
import { Download, ArrowLeft, AlertCircle } from 'lucide-react'

export default async function MembersPage({
  params,
}: {
  params: { tripId: string }
}) {
  const session = await auth()
  const isAdmin = (session?.user as any)?.role === 'ADMIN'

  const trip = await prisma.trip.findUnique({
    where: { id: params.tripId },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true, avatar_url: true },
          },
        },
        orderBy: { joined_at: 'asc' },
      },
      days: {
        orderBy: { day_number: 'asc' },
        include: {
          destinations: {
            include: {
              expenses: {
                include: { user: { select: { id: true, name: true } } },
              },
              // Pull feedback authorship in the same round-trip so we don't
              // need a second sequential query for "who hasn't given feedback".
              feedbacks: { select: { user_id: true } },
            },
          },
        },
      },
    },
  })

  if (!trip) notFound()

  const allExpenses = trip.days.flatMap((d) =>
    d.destinations.flatMap((dest) =>
      dest.expenses.map((e) => ({
        ...e,
        destination: { day_id: dest.day_id },
      }))
    )
  )

  const chartData = trip.members.map((m) => ({
    name: m.user.name,
    total: allExpenses
      .filter((e) => e.user_id === m.user_id)
      .reduce((s, e) => s + e.amount, 0),
  }))

  const allDestinations = trip.days.flatMap((d) => d.destinations)

  const missingFeedback: Record<string, string[]> = {}
  for (const member of trip.members) {
    const missing = allDestinations
      .filter(
        (dest) =>
          !dest.feedbacks.some((f) => f.user_id === member.user_id)
      )
      .map((d) => d.name)
    if (missing.length) missingFeedback[member.user.name] = missing
  }

  const hasExpenses = allExpenses.length > 0

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href={`/trips/${params.tripId}`}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Lịch trình
          </Link>
        </Button>
        <h1 className="font-display text-2xl font-bold text-ink">
          Thành viên & Chi tiêu
        </h1>
        {hasExpenses && (
          <Button asChild variant="outline" size="sm" className="ml-auto">
            <a href={`/api/trips/${params.tripId}/export/csv`} download>
              <Download className="mr-1 h-4 w-4" /> Xuất CSV
            </a>
          </Button>
        )}
      </div>

      <div className="rounded-2xl border border-line bg-card p-6">
        <MemberGrid
          initialMembers={trip.members as any}
          tripId={params.tripId}
          isAdmin={isAdmin}
        />
      </div>

      {hasExpenses && (
        <div className="rounded-2xl border border-line bg-card p-6">
          <h2 className="mb-4 font-semibold text-ink">Biểu đồ chi tiêu</h2>
          <SpendChart data={chartData} />
        </div>
      )}

      {hasExpenses && (
        <div className="rounded-2xl border border-line bg-card p-6">
          <h2 className="mb-4 font-semibold text-ink">
            Bảng chi tiêu chi tiết
          </h2>
          <SpendTable
            members={trip.members as any}
            days={trip.days as any}
            expenses={allExpenses as any}
          />
        </div>
      )}

      {Object.keys(missingFeedback).length > 0 && (
        <div className="rounded-2xl border border-line bg-card p-6">
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-ink">
            <AlertCircle className="h-4 w-4 text-sun" />
            Chưa cho cảm nhận
          </h2>
          <div className="space-y-2">
            {Object.entries(missingFeedback).map(([name, dests]) => (
              <div key={name} className="text-sm">
                <span className="font-medium text-ink">{name}</span>
                <span className="text-muted-foreground"> chưa nhận xét: </span>
                <span className="text-ink/80">{dests.join(', ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
