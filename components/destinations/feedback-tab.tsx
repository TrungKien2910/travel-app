'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

const feedbackConfig = {
  OK: {
    icon: '👍',
    label: 'Ổn',
    color: 'border-emerald-300 bg-emerald-50 text-emerald-700',
  },
  NOT_OK: {
    icon: '👎',
    label: 'Không ổn',
    color: 'border-rose-300 bg-rose-50 text-rose-600',
  },
  MAYBE: {
    icon: '🤔',
    label: 'Bình thường',
    color: 'border-sun/40 bg-sun-soft text-sun-deep',
  },
} as const

export function FeedbackTab({ feedbacks, members, destId, currentUserId }: any) {
  const router = useRouter()
  const mine = feedbacks.find((f: any) => f.user_id === currentUserId)
  const [selected, setSelected] = useState<string | null>(mine?.status ?? null)
  const [note, setNote] = useState(mine?.note ?? '')
  const [saving, setSaving] = useState(false)

  const counts = { OK: 0, NOT_OK: 0, MAYBE: 0 }
  feedbacks.forEach((f: any) => {
    if (f.status in counts) counts[f.status as keyof typeof counts]++
  })

  async function saveFeedback() {
    if (!selected) return
    setSaving(true)
    await fetch(`/api/destinations/${destId}/feedbacks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: selected, note }),
    })
    setSaving(false)
    router.refresh()
  }

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="flex gap-3">
        {(['OK', 'NOT_OK', 'MAYBE'] as const).map((s) => (
          <div
            key={s}
            className={cn(
              'flex-1 rounded-xl border p-3 text-center',
              feedbackConfig[s].color
            )}
          >
            <div className="text-2xl">{feedbackConfig[s].icon}</div>
            <div className="text-xl font-bold">{counts[s]}</div>
            <div className="text-xs">{feedbackConfig[s].label}</div>
          </div>
        ))}
      </div>

      {/* Current user's form */}
      <div className="space-y-3 rounded-xl border border-sea/20 bg-sea-soft/40 p-4">
        <p className="text-sm font-medium text-ink">Cảm nhận của bạn</p>
        <div className="flex gap-2">
          {(['OK', 'NOT_OK', 'MAYBE'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSelected(s)}
              className={cn(
                'flex-1 rounded-lg border-2 py-2 text-sm font-medium transition-colors',
                selected === s
                  ? feedbackConfig[s].color + ' border-current'
                  : 'border-line bg-card text-muted-foreground hover:border-sea/30'
              )}
            >
              {feedbackConfig[s].icon} {feedbackConfig[s].label}
            </button>
          ))}
        </div>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ghi chú thêm (tuỳ chọn)…"
          rows={2}
        />
        <Button
          onClick={saveFeedback}
          disabled={!selected || saving}
          className="w-full"
        >
          {saving ? 'Đang lưu…' : 'Lưu cảm nhận'}
        </Button>
      </div>

      {/* All feedbacks */}
      <div className="space-y-2">
        {feedbacks.map((fb: any) => (
          <div
            key={fb.id}
            className="flex items-start gap-3 rounded-xl border border-line bg-card p-3"
          >
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="bg-sea-soft text-xs font-semibold text-sea-deep">
                {fb.user.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-ink">
                  {fb.user.name}
                </span>
                <span
                  className={cn(
                    'rounded-full border px-2 py-0.5 text-xs',
                    feedbackConfig[fb.status as keyof typeof feedbackConfig]
                      .color
                  )}
                >
                  {feedbackConfig[fb.status as keyof typeof feedbackConfig].icon}{' '}
                  {
                    feedbackConfig[fb.status as keyof typeof feedbackConfig]
                      .label
                  }
                </span>
              </div>
              {fb.note && (
                <p className="mt-1 text-sm text-muted-foreground">{fb.note}</p>
              )}
            </div>
          </div>
        ))}

        {members
          .filter(
            (m: any) => !feedbacks.some((f: any) => f.user_id === m.user_id)
          )
          .map((m: any) => (
            <div
              key={m.user_id}
              className="flex items-center gap-3 rounded-xl border border-dashed border-line bg-muted/40 p-3"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-muted text-xs text-muted-foreground">
                  {m.user.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-muted-foreground">
                {m.user.name} — chưa cho cảm nhận
              </span>
            </div>
          ))}
      </div>
    </div>
  )
}
