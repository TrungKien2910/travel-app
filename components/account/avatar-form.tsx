'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UserAvatar } from '@/components/ui/user-avatar'
import { CheckCircle2 } from 'lucide-react'

export function AvatarForm({
  name,
  initialUrl,
}: {
  name: string
  initialUrl: string | null
}) {
  const router = useRouter()
  const [url, setUrl] = useState(initialUrl ?? '')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  // Live preview only honours a usable http(s) URL; otherwise show initials.
  const previewUrl = /^https?:\/\//i.test(url.trim()) ? url.trim() : null

  async function save(next: string | null) {
    setError('')
    setDone(false)
    setBusy(true)
    const res = await fetch('/api/account/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatar_url: next }),
    })
    setBusy(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Không lưu được ảnh.')
      return
    }
    setDone(true)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <UserAvatar
          user={{ name, avatar_url: previewUrl }}
          className="h-16 w-16 ring-1 ring-line"
          fallbackClassName="text-lg"
        />
        <p className="text-sm text-muted-foreground">
          Dán đường dẫn ảnh (URL) để dùng làm ảnh đại diện. Xem trước hiện ngay
          bên trái.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="avatar_url">Đường dẫn ảnh (URL)</Label>
        <Input
          id="avatar_url"
          type="url"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value)
            setDone(false)
          }}
          placeholder="https://example.com/anh-cua-ban.jpg"
        />
      </div>

      {error && (
        <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      {done && (
        <p className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" /> Đã cập nhật ảnh đại diện.
        </p>
      )}

      <div className="flex gap-2">
        <Button onClick={() => save(url.trim() || null)} disabled={busy}>
          {busy ? 'Đang lưu…' : 'Lưu ảnh'}
        </Button>
        {initialUrl && (
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => {
              setUrl('')
              save(null)
            }}
          >
            Xóa ảnh
          </Button>
        )}
      </div>
    </div>
  )
}
