import { auth } from '@/lib/auth'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { StatusBadge } from '@/components/ui/status-badge'
import { InfoTab } from '@/components/destinations/info-tab'
import { MediaTab } from '@/components/destinations/media-tab'
import { ExpenseTab } from '@/components/destinations/expense-tab'
import { FeedbackTab } from '@/components/destinations/feedback-tab'
import { formatTime } from '@/lib/format'
import { ChevronRight, Clock } from 'lucide-react'

export default async function DestinationDetailPage({
  params,
}: {
  params: { tripId: string; destId: string }
}) {
  const session = await auth()
  const isAdmin = (session?.user as any)?.role === 'ADMIN'

  const dest = await prisma.destination.findUnique({
    where: { id: params.destId },
    include: {
      day: { include: { trip: true } },
      replaced_by: { select: { id: true, name: true } },
      replaces: { select: { id: true, name: true } },
      expenses: {
        include: {
          user: { select: { id: true, name: true, avatar_url: true } },
        },
        orderBy: { created_at: 'asc' },
      },
      media: {
        include: { uploader: { select: { name: true } } },
        orderBy: { created_at: 'asc' },
      },
      feedbacks: {
        include: {
          user: { select: { id: true, name: true, avatar_url: true } },
        },
        orderBy: { updated_at: 'desc' },
      },
    },
  })

  if (!dest) notFound()

  const members = await prisma.tripMember.findMany({
    where: { trip_id: params.tripId },
    include: { user: { select: { id: true, name: true, avatar_url: true } } },
  })

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        <Link
          href={`/trips/${params.tripId}`}
          className="transition-colors hover:text-sea"
        >
          {dest.day.trip.title}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span>Ngày {dest.day.day_number}</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-ink">{dest.name}</span>
      </nav>

      {/* Header */}
      <div className="rounded-2xl border border-line bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1
                className={`font-display text-xl font-bold ${
                  dest.status === 'REPLACED'
                    ? 'text-muted-foreground line-through'
                    : 'text-ink'
                }`}
              >
                {dest.name}
              </h1>
              <StatusBadge status={dest.status} />
            </div>
            {(dest.start_time || dest.end_time) && (
              <div className="mt-1.5 flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {formatTime(dest.start_time)}
                {dest.end_time && ` → ${formatTime(dest.end_time)}`}
              </div>
            )}
            {dest.replaced_by && (
              <p className="mt-1.5 text-sm text-muted-foreground">
                Thay thế bởi:{' '}
                <Link
                  href={`/trips/${params.tripId}/destination/${dest.replaced_by.id}`}
                  className="font-medium text-sea hover:underline"
                >
                  {dest.replaced_by.name}
                </Link>
              </p>
            )}
            {dest.replaces.length > 0 && (
              <p className="mt-1 text-sm text-muted-foreground">
                Thay cho:{' '}
                {dest.replaces.map((r, i) => (
                  <span key={r.id}>
                    {i > 0 && ', '}
                    <Link
                      href={`/trips/${params.tripId}/destination/${r.id}`}
                      className="text-muted-foreground hover:underline"
                    >
                      {r.name}
                    </Link>
                  </span>
                ))}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        defaultValue="info"
        className="overflow-hidden rounded-2xl border border-line bg-card shadow-sm"
      >
        <TabsList className="h-12 w-full justify-start rounded-none border-b border-line bg-muted/40 p-0">
          {[
            ['info', 'Thông tin'],
            ['media', 'Ảnh & Bill'],
            ['expense', 'Chi tiêu'],
            ['feedback', 'Cảm nhận'],
          ].map(([v, label]) => (
            <TabsTrigger
              key={v}
              value={v}
              className="h-full flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-sea data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
        <div className="p-5">
          <TabsContent value="info" className="mt-0">
            <InfoTab dest={dest as any} isAdmin={isAdmin} />
          </TabsContent>
          <TabsContent value="media" className="mt-0">
            <MediaTab media={dest.media as any} destId={dest.id} isAdmin={isAdmin} />
          </TabsContent>
          <TabsContent value="expense" className="mt-0">
            <ExpenseTab
              expenses={dest.expenses as any}
              members={members as any}
              budget={dest.budget_estimate}
              destId={dest.id}
              isAdmin={isAdmin}
            />
          </TabsContent>
          <TabsContent value="feedback" className="mt-0">
            <FeedbackTab
              feedbacks={dest.feedbacks as any}
              members={members as any}
              destId={dest.id}
              currentUserId={session!.user.id}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
