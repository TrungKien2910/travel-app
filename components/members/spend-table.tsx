'use client'

import { formatVND } from '@/lib/format'
import { cn } from '@/lib/utils'

interface SpendTableProps {
  members: { user_id: string; user: { name: string } }[]
  days: { id: string; day_number: number; date: string }[]
  expenses: { user_id: string; amount: number; destination: { day_id: string } }[]
}

export function SpendTable({ members, days, expenses }: SpendTableProps) {
  function getAmount(userId: string, dayId: string) {
    return expenses
      .filter((e) => e.user_id === userId && e.destination.day_id === dayId)
      .reduce((s, e) => s + e.amount, 0)
  }
  function getDayTotal(dayId: string) {
    return expenses
      .filter((e) => e.destination.day_id === dayId)
      .reduce((s, e) => s + e.amount, 0)
  }
  function getMemberTotal(userId: string) {
    return expenses
      .filter((e) => e.user_id === userId)
      .reduce((s, e) => s + e.amount, 0)
  }

  const grandTotal = expenses.reduce((s, e) => s + e.amount, 0)

  const maxPerDay: Record<string, number> = {}
  for (const day of days) {
    maxPerDay[day.id] = Math.max(
      0,
      ...members.map((m) => getAmount(m.user_id, day.id))
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-sea-soft/60">
            <th className="border-b border-line p-3 text-left font-semibold text-ink">
              Thành viên
            </th>
            {days.map((day) => (
              <th
                key={day.id}
                className="whitespace-nowrap border-b border-line p-3 text-right font-semibold text-ink"
              >
                Ngày {day.day_number}
              </th>
            ))}
            <th className="border-b border-line p-3 text-right font-semibold text-sea-deep">
              Tổng
            </th>
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr key={member.user_id} className="hover:bg-muted/40">
              <td className="border-b border-line p-3 font-medium text-ink">
                {member.user.name}
              </td>
              {days.map((day) => {
                const amount = getAmount(member.user_id, day.id)
                const isMax = amount > 0 && amount === maxPerDay[day.id]
                return (
                  <td
                    key={day.id}
                    className={cn(
                      'tabular border-b border-line p-3 text-right',
                      isMax ? 'font-semibold text-sun-deep' : 'text-muted-foreground'
                    )}
                  >
                    {amount > 0 ? formatVND(amount) : '—'}
                  </td>
                )
              })}
              <td className="tabular border-b border-line p-3 text-right font-semibold text-sea-deep">
                {formatVND(getMemberTotal(member.user_id))}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-muted/50 font-semibold">
            <td className="p-3 text-ink">Tổng ngày</td>
            {days.map((day) => (
              <td key={day.id} className="tabular p-3 text-right text-ink">
                {formatVND(getDayTotal(day.id))}
              </td>
            ))}
            <td className="tabular p-3 text-right text-sea-deep">
              {formatVND(grandTotal)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
