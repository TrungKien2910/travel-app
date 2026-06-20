'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle2 } from 'lucide-react'

export function PasswordForm() {
  const [form, setForm] = useState({
    current_password: '',
    new_password: '',
    confirm: '',
  })
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setDone(false)

    if (form.new_password.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự.')
      return
    }
    if (form.new_password !== form.confirm) {
      setError('Mật khẩu xác nhận không khớp.')
      return
    }

    setBusy(true)
    const res = await fetch('/api/account/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        current_password: form.current_password,
        new_password: form.new_password,
      }),
    })
    setBusy(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Không đổi được mật khẩu.')
      return
    }
    setForm({ current_password: '', new_password: '', confirm: '' })
    setDone(true)
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="current">Mật khẩu hiện tại</Label>
        <Input
          id="current"
          type="password"
          value={form.current_password}
          onChange={(e) =>
            setForm({ ...form, current_password: e.target.value })
          }
          autoComplete="current-password"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="new">Mật khẩu mới</Label>
        <Input
          id="new"
          type="password"
          value={form.new_password}
          onChange={(e) => setForm({ ...form, new_password: e.target.value })}
          autoComplete="new-password"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm">Xác nhận mật khẩu mới</Label>
        <Input
          id="confirm"
          type="password"
          value={form.confirm}
          onChange={(e) => setForm({ ...form, confirm: e.target.value })}
          autoComplete="new-password"
          required
        />
      </div>

      {error && (
        <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      {done && (
        <p className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" /> Đã đổi mật khẩu thành công.
        </p>
      )}

      <Button type="submit" disabled={busy}>
        {busy ? 'Đang lưu…' : 'Đổi mật khẩu'}
      </Button>
    </form>
  )
}
