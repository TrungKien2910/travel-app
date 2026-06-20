'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Compass, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const form = new FormData(e.currentTarget)
    const result = await signIn('credentials', {
      email: form.get('email'),
      password: form.get('password'),
      redirect: false,
    })

    setLoading(false)
    if (result?.error) {
      setError('Email hoặc mật khẩu chưa đúng. Thử lại nhé.')
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="animate-fade-up overflow-hidden rounded-2xl border border-line bg-card shadow-xl shadow-ink/5">
      {/* Golden-hour header band */}
      <div className="bg-golden-hour relative px-7 pb-7 pt-8 text-white">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
            <Compass className="h-5 w-5" />
          </div>
          <span className="font-display text-sm font-semibold uppercase tracking-[0.25em] text-white/85">
            Travel
          </span>
        </div>
        <h1 className="mt-5 font-display text-2xl font-bold leading-tight">
          Cả nhóm, một lịch trình.
        </h1>
        <p className="mt-1.5 text-sm text-white/80">
          Đăng nhập để xem chuyến đi sắp tới.
        </p>
      </div>

      {/* Form body */}
      <form onSubmit={handleSubmit} className="space-y-4 px-7 py-7">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="admin@travel.app"
            required
            autoComplete="email"
            autoFocus
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Mật khẩu</Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            required
            autoComplete="current-password"
          />
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Đang đăng nhập…
            </>
          ) : (
            'Đăng nhập'
          )}
        </Button>

        <p className="pt-1 text-center text-xs text-muted-foreground">
          Tài khoản demo: admin@travel.app · mật khẩu admin123
        </p>
      </form>
    </div>
  )
}
