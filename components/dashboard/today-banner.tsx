'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { formatTime } from '@/lib/format'
import { MapPin, Clock, CheckCircle, XCircle } from 'lucide-react'

interface Destination {
  id: string
  name: string
  start_time: string | null
  end_time: string | null
  status: 'PENDING' | 'DONE' | 'REJECTED' | 'REPLACED'
}

interface TodayBannerProps {
  todayDestinations: Destination[]
  tripId: string
  isAdmin: boolean
  daysUntilTrip?: number
  /** Optional photo shown faded behind the banner. */
  bgImage?: string | null
}

export function TodayBanner({
  todayDestinations,
  isAdmin,
  daysUntilTrip,
  bgImage,
}: TodayBannerProps) {
  const router = useRouter()
  const [now, setNow] = useState(() => new Date())
  const [busy, setBusy] = useState(false)
  // Optimistic status overrides so the badge flips instantly on click.
  const [statusOverride, setStatusOverride] = useState<
    Record<string, 'DONE' | 'REJECTED'>
  >({})

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  async function updateStatus(destId: string, status: 'DONE' | 'REJECTED') {
    setBusy(true)
    // Reflect the change immediately, then sync in the background.
    setStatusOverride((s) => ({ ...s, [destId]: status }))
    try {
      await fetch(`/api/destinations/${destId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      router.refresh()
    } catch {
      // Roll back the optimistic change if the request failed.
      setStatusOverride((s) => {
        const next = { ...s }
        delete next[destId]
        return next
      })
    } finally {
      setBusy(false)
    }
  }

  // Upcoming trip — countdown
  if (daysUntilTrip != null && daysUntilTrip > 0) {
    return (
      <div className="bg-golden-hour relative overflow-hidden rounded-2xl p-6 text-white">
        <div className="mb-2 flex items-center gap-2 text-white/90">
          <MapPin className="h-5 w-5" />
          <span className="text-sm font-medium uppercase tracking-wide">
            Chuyến đi sắp tới
          </span>
        </div>
        <div className="font-display text-4xl font-bold">
          Còn {daysUntilTrip} ngày
        </div>
        <p className="mt-1 text-sm text-white/80">
          Chuẩn bị hành lý và rà lại lịch trình nhé!
        </p>
      </div>
    )
  }

  if (!todayDestinations.length) {
    return (
      <div className="bg-golden-hour rounded-2xl p-6 text-white">
        <p className="text-white/90">
          Hôm nay không có điểm đến nào trong lịch.
        </p>
      </div>
    )
  }

  const current = todayDestinations.find((d) => {
    if (!d.start_time || !d.end_time) return false
    return now >= new Date(d.start_time) && now <= new Date(d.end_time)
  })
  const next = todayDestinations.find((d) => {
    if (!d.start_time) return false
    return new Date(d.start_time) > now && d.status === 'PENDING'
  })
  const featured = current ?? next ?? todayDestinations[0]
  const override = statusOverride[featured.id]
  const featuredStatus: Destination['status'] = override
    ? override
    : featured.status

  return (
    <div className="bg-golden-hour relative overflow-hidden rounded-2xl p-6 text-white">
      {bgImage && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={bgImage}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover opacity-30 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-ink/30 to-transparent" />
        </>
      )}
      <div className="relative mb-3 flex items-center gap-2 text-sm text-white/85">
        <Clock className="h-4 w-4" />
        {current ? 'Đang ở đây' : next ? 'Điểm tiếp theo' : 'Hôm nay'}
      </div>
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold">{featured.name}</h2>
          <div className="mt-1.5 flex items-center gap-2 text-sm text-white/85">
            {(featured.start_time || featured.end_time) && (
              <span>
                {formatTime(featured.start_time)}
                {featured.end_time && ` → ${formatTime(featured.end_time)}`}
              </span>
            )}
            <StatusBadge status={featuredStatus} className="bg-white/90" />
          </div>
        </div>
        {isAdmin && featuredStatus === 'PENDING' && (
          <div className="flex shrink-0 gap-2">
            <Button
              size="sm"
              disabled={busy}
              onClick={() => updateStatus(featured.id, 'DONE')}
              className="border-0 bg-white/20 text-white hover:bg-white/30"
            >
              <CheckCircle className="mr-1 h-4 w-4" /> Đã đi
            </Button>
            <Button
              size="sm"
              disabled={busy}
              onClick={() => updateStatus(featured.id, 'REJECTED')}
              className="border-0 bg-white/10 text-white hover:bg-white/20"
            >
              <XCircle className="mr-1 h-4 w-4" /> Bỏ qua
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
