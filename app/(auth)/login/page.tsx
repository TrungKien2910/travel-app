'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Compass, Loader2, MapPin, Plane } from 'lucide-react'

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
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Left — golden-hour coastal scene (CSS art) */}
      <CoastalScene />

      {/* Right — form */}
      <div className="relative flex flex-col">
        {/* Mobile-only golden-hour hero strip */}
        <div className="bg-golden-hour relative h-40 overflow-hidden text-white lg:hidden">
          <div className="absolute left-1/2 top-12 h-28 w-28 -translate-x-1/2 rounded-full bg-white/30 blur-2xl" />
          <div className="absolute left-1/2 top-16 h-16 w-16 -translate-x-1/2 rounded-full bg-white/70 blur-md" />
          <div className="absolute inset-x-0 bottom-0 top-[62%] bg-gradient-to-b from-sea-deep/30 to-ink/40" />
          <div className="absolute inset-x-0 top-[62%] h-px bg-white/40" />
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden
          >
            <path
              d="M 16 46 Q 50 14 84 40"
              fill="none"
              stroke="rgba(255,255,255,0.55)"
              strokeWidth="0.6"
              strokeDasharray="2 2"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <Plane className="absolute left-[49%] top-3 h-4 w-4 -rotate-12 text-white drop-shadow" />
          <div className="absolute bottom-4 left-5 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
              <Compass className="h-5 w-5" />
            </span>
            <span className="font-display text-sm font-bold uppercase tracking-[0.25em] text-white/90">
              Travel
            </span>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
          <div className="animate-fade-up relative z-10 w-full max-w-sm">
            <h1 className="font-display text-2xl font-bold leading-tight text-ink sm:text-3xl">
            Chào mừng trở lại.
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Đăng nhập để tiếp tục hành trình của nhóm.
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="ban@email.com"
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

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang đăng nhập…
                </>
              ) : (
                'Đăng nhập'
              )}
            </Button>
          </form>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Left panel: a golden-hour coast drawn in CSS/SVG — sun, horizon, a dashed
 *  flight route between two pins. Hidden on mobile (form gets a soft glow). */
function CoastalScene() {
  return (
    <div className="bg-golden-hour relative hidden overflow-hidden text-white lg:block">
      {/* Setting sun */}
      <div className="absolute left-1/2 top-[42%] h-44 w-44 -translate-x-1/2 rounded-full bg-white/30 blur-2xl" />
      <div className="absolute left-1/2 top-[44%] h-28 w-28 -translate-x-1/2 rounded-full bg-white/70 blur-md" />

      {/* Horizon line + sea sheen */}
      <div className="absolute inset-x-0 top-[58%] h-px bg-white/40" />
      <div className="absolute inset-x-0 bottom-0 top-[58%] bg-gradient-to-b from-sea-deep/30 to-ink/55" />
      {/* gentle wave hints */}
      <div className="absolute inset-x-0 top-[66%] h-px bg-white/10" />
      <div className="absolute inset-x-0 top-[74%] h-px bg-white/10" />

      {/* Flight route — dashed arc between two place pins */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d="M 18 40 Q 50 8 82 34"
          fill="none"
          stroke="rgba(255,255,255,0.55)"
          strokeWidth="0.5"
          strokeDasharray="2 2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <Pin className="left-[15%] top-[36%]" label="Bắt đầu" />
      <Pin className="left-[80%] top-[30%]" label="Điểm đến" />
      <Plane className="absolute left-[49%] top-[12%] h-5 w-5 -rotate-12 text-white drop-shadow" />

      {/* Brand + copy, anchored bottom-left */}
      <div className="absolute inset-x-0 bottom-0 p-10">
        <div className="flex items-center gap-2.5">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
            <Compass className="h-6 w-6" />
          </span>
          <span className="font-display text-sm font-semibold uppercase tracking-[0.3em] text-white/90">
            Travel
          </span>
        </div>
        <h2 className="mt-6 max-w-md font-display text-4xl font-bold leading-[1.1] drop-shadow-sm">
          Cả nhóm,
          <br />
          một hành trình.
        </h2>
        <p className="mt-3 max-w-sm text-sm text-white/85">
          Lên lịch trình, chia chi tiêu và giữ lại mọi khoảnh khắc — tất cả ở
          một nơi.
        </p>
      </div>
    </div>
  )
}

function Pin({ className, label }: { className: string; label: string }) {
  return (
    <div className={`absolute flex flex-col items-center ${className}`}>
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/40 backdrop-blur">
        <MapPin className="h-4 w-4" />
      </span>
      <span className="mt-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-medium tracking-wide backdrop-blur">
        {label}
      </span>
    </div>
  )
}
