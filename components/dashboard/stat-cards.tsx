import { formatVND } from '@/lib/format'
import { Wallet, Users, MapPin, CalendarClock } from 'lucide-react'

interface StatCardsProps {
  totalSpent: number
  memberCount: number
  doneCount: number
  totalDests: number
  /** null = đang diễn ra/đã xong (xem `tripState`) */
  daysLeft: number | null
  tripState: 'upcoming' | 'ongoing' | 'done'
}

export function StatCards({
  totalSpent,
  memberCount,
  doneCount,
  totalDests,
  daysLeft,
  tripState,
}: StatCardsProps) {
  const avgPerPerson = memberCount > 0 ? totalSpent / memberCount : 0

  const remainLabel =
    tripState === 'ongoing'
      ? 'Đang diễn ra'
      : tripState === 'done'
        ? 'Đã kết thúc'
        : daysLeft === 0
          ? 'Bắt đầu hôm nay'
          : `${daysLeft} ngày`

  const cards = [
    {
      icon: <Wallet className="h-5 w-5 text-sea" />,
      value: formatVND(totalSpent),
      label: 'Tổng chi tiêu',
    },
    {
      icon: <Users className="h-5 w-5 text-sea" />,
      value: formatVND(avgPerPerson),
      label: 'Trung bình / người',
    },
    {
      icon: <MapPin className="h-5 w-5 text-sea" />,
      value: `${doneCount}/${totalDests}`,
      label: 'Điểm đã đi',
    },
    {
      icon: <CalendarClock className="h-5 w-5 text-sea" />,
      value: remainLabel,
      label: tripState === 'upcoming' ? 'Đến khi khởi hành' : 'Trạng thái',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {cards.map((c, i) => (
        <div
          key={i}
          className="rounded-2xl border border-line bg-card p-4 text-center"
        >
          <div className="mb-2 flex justify-center">{c.icon}</div>
          <div className="tabular truncate text-lg font-bold text-ink">
            {c.value}
          </div>
          <div className="text-xs text-muted-foreground">{c.label}</div>
        </div>
      ))}
    </div>
  )
}
