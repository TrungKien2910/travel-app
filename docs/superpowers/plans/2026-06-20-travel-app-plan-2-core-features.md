# Travel App — Plan 2: Core Features

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build all CRUD for trips, days, destinations; expense tracking with split; photo/bill upload; feedback system; and the trip detail page — covering the full data lifecycle.

**Architecture:** Next.js App Router Server Components fetch data server-side. Client Components handle mutations via fetch() to API Route Handlers. Prisma used exclusively in API routes (never in Client Components). File uploads saved to `/public/uploads/[trip_id]/[dest_id]/`.

**Tech Stack:** Next.js 14 App Router, Prisma, NextAuth (auth()), shadcn/ui, Lucide icons, Next.js built-in file handling (no multer)

## Global Constraints

- Requires Plan 1 to be complete (auth, Prisma, layout)
- All API routes call `auth()` from `lib/auth.ts` — return 401 if no session
- Admin-only routes additionally check `session.user.role === 'ADMIN'` — return 403 if not
- Never import PrismaClient in Client Components — all DB access via API routes
- File upload: max 10MB, accept jpg/png/webp for PHOTO, jpg/png/pdf for BILL
- Upload path: `public/uploads/[tripId]/[destId]/[filename]`
- Amount values stored as Float (VND, no decimal needed but Float is fine)
- Dates stored as ISO strings in API, parsed to DateTime by Prisma

---

## File Structure

```
app/
├── (app)/
│   ├── trips/
│   │   ├── page.tsx                    # Trip list (redirect to dashboard — trips shown there)
│   │   ├── new/
│   │   │   └── page.tsx                # Create trip form
│   │   └── [tripId]/
│   │       ├── page.tsx                # Trip detail — days + destinations timeline
│   │       └── destination/
│   │           └── [destId]/
│   │               └── page.tsx        # Destination detail — 4 tabs
├── api/
│   ├── trips/
│   │   ├── route.ts                    # GET list, POST create
│   │   └── [tripId]/
│   │       ├── route.ts                # GET detail, PUT update, DELETE
│   │       └── days/
│   │           ├── route.ts            # GET list, POST create
│   │           └── [dayId]/
│   │               └── route.ts        # PUT update, DELETE
│   └── days/
│       └── [dayId]/
│           └── destinations/
│               └── route.ts            # GET list, POST create
├── api/
│   └── destinations/
│       └── [destId]/
│           ├── route.ts                # PUT update, DELETE
│           ├── status/
│           │   └── route.ts            # PATCH status
│           ├── replace/
│           │   └── route.ts            # POST replace
│           ├── expenses/
│           │   ├── route.ts            # GET list, POST create
│           │   └── split/
│           │       └── route.ts        # POST split
│           ├── media/
│           │   └── route.ts            # POST upload
│           └── feedbacks/
│               └── route.ts            # GET list, POST upsert
├── api/
│   ├── expenses/
│   │   └── [expId]/
│   │       └── route.ts                # PUT update, DELETE
│   └── media/
│       └── [mediaId]/
│           ├── route.ts                # DELETE
│           └── best-shot/
│               └── route.ts            # PATCH toggle
components/
├── trips/
│   ├── trip-card.tsx                   # Card for trip in list
│   ├── trip-form.tsx                   # Create/edit trip form
│   ├── day-block.tsx                   # A day's block in timeline
│   └── destination-card.tsx            # Card for destination in day
├── destinations/
│   ├── info-tab.tsx                    # Tab 1: info + status
│   ├── media-tab.tsx                   # Tab 2: photos + bills
│   ├── expense-tab.tsx                 # Tab 3: expenses + split
│   └── feedback-tab.tsx                # Tab 4: feedback form + list
└── ui/
    ├── status-badge.tsx                # Reusable DestStatus badge
    ├── expense-progress.tsx            # Budget progress bar
    └── upload-zone.tsx                 # File upload dropzone
lib/
└── format.ts                           # formatVND(), formatDate() helpers
```

---

### Task 1: Trip CRUD API + Trip List/Create Pages

**Files:**
- Create: `app/api/trips/route.ts`
- Create: `app/api/trips/[tripId]/route.ts`
- Create: `lib/format.ts`
- Create: `app/(app)/trips/new/page.tsx`
- Create: `components/trips/trip-form.tsx`

**Interfaces:**
- Produces:
  - `GET /api/trips` → `Trip[]` with member count and day count
  - `POST /api/trips` → created `Trip`
  - `GET /api/trips/[tripId]` → `Trip` with days, members, destinations
  - `PUT /api/trips/[tripId]` → updated `Trip`
  - `DELETE /api/trips/[tripId]` → `{ ok: true }`
- Produces: `formatVND(amount: number): string` — e.g. "1,200,000đ"
- Produces: `formatDate(date: string | Date): string` — e.g. "20/06/2026"

- [ ] **Step 1: Create format helpers**

Create `lib/format.ts`:

```typescript
export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + 'đ'
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatTime(date: string | Date | null | undefined): string {
  if (!date) return ''
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(date))
}
```

- [ ] **Step 2: Create trips list + create API**

Create `app/api/trips/route.ts`:

```typescript
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const trips = await prisma.trip.findMany({
    where: {
      OR: [
        { created_by: session.user.id },
        { members: { some: { user_id: session.user.id } } },
      ],
    },
    include: {
      _count: { select: { members: true, days: true } },
    },
    orderBy: { start_date: 'desc' },
  })
  return NextResponse.json(trips)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { title, description, start_date, end_date } = body

  if (!title || !start_date || !end_date)
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

  const trip = await prisma.trip.create({
    data: {
      title,
      description,
      start_date: new Date(start_date),
      end_date: new Date(end_date),
      created_by: session.user.id,
      members: { create: { user_id: session.user.id } },
    },
  })
  return NextResponse.json(trip, { status: 201 })
}
```

- [ ] **Step 3: Create trip detail/update/delete API**

Create `app/api/trips/[tripId]/route.ts`:

```typescript
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(_: Request, { params }: { params: { tripId: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const trip = await prisma.trip.findUnique({
    where: { id: params.tripId },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true, avatar_url: true } } } },
      days: {
        orderBy: { day_number: 'asc' },
        include: {
          destinations: {
            orderBy: { order_index: 'asc' },
            include: {
              _count: { select: { feedbacks: true } },
              expenses: { select: { amount: true } },
            },
          },
        },
      },
    },
  })
  if (!trip) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(trip)
}

export async function PUT(req: Request, { params }: { params: { tripId: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const trip = await prisma.trip.update({
    where: { id: params.tripId },
    data: {
      title: body.title,
      description: body.description,
      start_date: body.start_date ? new Date(body.start_date) : undefined,
      end_date: body.end_date ? new Date(body.end_date) : undefined,
    },
  })
  return NextResponse.json(trip)
}

export async function DELETE(_: Request, { params }: { params: { tripId: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.trip.delete({ where: { id: params.tripId } })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: Create TripForm component**

Create `components/trips/trip-form.tsx`:

```typescript
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface TripFormProps {
  defaultValues?: {
    id?: string
    title?: string
    description?: string
    start_date?: string
    end_date?: string
  }
  onSuccess?: (trip: any) => void
}

export function TripForm({ defaultValues, onSuccess }: TripFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const isEdit = !!defaultValues?.id

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const form = new FormData(e.currentTarget)
    const body = {
      title: form.get('title'),
      description: form.get('description'),
      start_date: form.get('start_date'),
      end_date: form.get('end_date'),
    }

    const url = isEdit ? `/api/trips/${defaultValues!.id}` : '/api/trips'
    const method = isEdit ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    setLoading(false)
    if (!res.ok) {
      setError('Có lỗi xảy ra, vui lòng thử lại')
      return
    }
    const trip = await res.json()
    if (onSuccess) onSuccess(trip)
    else router.push(`/trips/${trip.id}`)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="title">Tên chuyến đi *</Label>
        <Input
          id="title"
          name="title"
          defaultValue={defaultValues?.title}
          placeholder="VD: Đà Nẵng - Hội An 4 ngày"
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="description">Mô tả</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={defaultValues?.description ?? ''}
          placeholder="Ghi chú về chuyến đi..."
          rows={3}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="start_date">Ngày bắt đầu *</Label>
          <Input
            id="start_date"
            name="start_date"
            type="date"
            defaultValue={defaultValues?.start_date?.slice(0, 10)}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="end_date">Ngày kết thúc *</Label>
          <Input
            id="end_date"
            name="end_date"
            type="date"
            defaultValue={defaultValues?.end_date?.slice(0, 10)}
            required
          />
        </div>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Hủy
        </Button>
        <Button type="submit" className="bg-sky-500 hover:bg-sky-600" disabled={loading}>
          {loading ? 'Đang lưu...' : isEdit ? 'Cập nhật' : 'Tạo chuyến đi'}
        </Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 5: Create "New Trip" page**

Create `app/(app)/trips/new/page.tsx`:

```typescript
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TripForm } from '@/components/trips/trip-form'

export default async function NewTripPage() {
  const session = await auth()
  if ((session?.user as any)?.role !== 'ADMIN') redirect('/dashboard')

  return (
    <div className="max-w-lg mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Tạo chuyến đi mới</CardTitle>
        </CardHeader>
        <CardContent>
          <TripForm />
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 6: Manual test**

1. POST `http://localhost:3000/api/trips` with Postman or fetch — should return 403 as VIEWER
2. Login as admin, navigate to `/trips/new`
3. Fill form and submit → should redirect to `/trips/[newId]` (will 404 until Task 2)
4. GET `/api/trips` → should return the created trip

- [ ] **Step 7: Commit**

```bash
git add app/api/trips/ app/\(app\)/trips/new/ components/trips/trip-form.tsx lib/format.ts
git commit -m "feat: add trip CRUD API and create trip page"
```

---

### Task 2: Trip Detail Page + Day CRUD API

**Files:**
- Create: `app/api/trips/[tripId]/days/route.ts`
- Create: `app/api/trips/[tripId]/days/[dayId]/route.ts`
- Create: `app/(app)/trips/[tripId]/page.tsx`
- Create: `components/trips/day-block.tsx`
- Create: `components/trips/destination-card.tsx`
- Create: `components/ui/status-badge.tsx`

**Interfaces:**
- Consumes: `GET /api/trips/[tripId]` from Task 1
- Produces:
  - `GET /api/trips/[tripId]/days` → `Day[]` with destinations
  - `POST /api/trips/[tripId]/days` → created `Day`
  - `PUT /api/trips/[tripId]/days/[dayId]` → updated `Day`
  - `DELETE /api/trips/[tripId]/days/[dayId]` → `{ ok: true }`
- Produces: `<StatusBadge status="PENDING"|"DONE"|"REJECTED"|"REPLACED" />`
- Produces: `<DayBlock day={...} isAdmin={bool} />` — renders day header + destination cards
- Produces: `<DestinationCard destination={...} tripId={string} />` — clickable card

- [ ] **Step 1: Create StatusBadge component**

Create `components/ui/status-badge.tsx`:

```typescript
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const statusConfig = {
  PENDING:  { label: 'Chưa đi',    className: 'border-yellow-400 text-yellow-700 bg-yellow-50' },
  DONE:     { label: 'Đã đi',      className: 'border-green-400 text-green-700 bg-green-50' },
  REJECTED: { label: 'Không đi',   className: 'border-red-400 text-red-700 bg-red-50' },
  REPLACED: { label: 'Thay thế',   className: 'border-gray-400 text-gray-500 bg-gray-50 line-through' },
} as const

type DestStatus = keyof typeof statusConfig

export function StatusBadge({ status }: { status: DestStatus }) {
  const { label, className } = statusConfig[status]
  return (
    <Badge variant="outline" className={cn('text-xs font-medium', className)}>
      {label}
    </Badge>
  )
}
```

- [ ] **Step 2: Create Day CRUD API**

Create `app/api/trips/[tripId]/days/route.ts`:

```typescript
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(_: Request, { params }: { params: { tripId: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const days = await prisma.day.findMany({
    where: { trip_id: params.tripId },
    orderBy: { day_number: 'asc' },
    include: {
      destinations: {
        orderBy: { order_index: 'asc' },
        include: {
          expenses: { select: { amount: true } },
          _count: { select: { feedbacks: true } },
        },
      },
    },
  })
  return NextResponse.json(days)
}

export async function POST(req: Request, { params }: { params: { tripId: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { date, label } = body

  const lastDay = await prisma.day.findFirst({
    where: { trip_id: params.tripId },
    orderBy: { day_number: 'desc' },
  })
  const day_number = (lastDay?.day_number ?? 0) + 1

  const day = await prisma.day.create({
    data: {
      trip_id: params.tripId,
      date: new Date(date),
      day_number,
      label,
    },
  })
  return NextResponse.json(day, { status: 201 })
}
```

Create `app/api/trips/[tripId]/days/[dayId]/route.ts`:

```typescript
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function PUT(req: Request, { params }: { params: { tripId: string; dayId: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const day = await prisma.day.update({
    where: { id: params.dayId },
    data: { label: body.label, date: body.date ? new Date(body.date) : undefined },
  })
  return NextResponse.json(day)
}

export async function DELETE(_: Request, { params }: { params: { tripId: string; dayId: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.day.delete({ where: { id: params.dayId } })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Create DestinationCard component**

Create `components/trips/destination-card.tsx`:

```typescript
import Link from 'next/link'
import { StatusBadge } from '@/components/ui/status-badge'
import { formatVND, formatTime } from '@/lib/format'
import { Clock, MessageSquare } from 'lucide-react'

interface DestinationCardProps {
  destination: {
    id: string
    name: string
    start_time: string | null
    end_time: string | null
    status: 'PENDING' | 'DONE' | 'REJECTED' | 'REPLACED'
    budget_estimate: number | null
    expenses: { amount: number }[]
    _count: { feedbacks: number }
  }
  tripId: string
}

export function DestinationCard({ destination, tripId }: DestinationCardProps) {
  const actualTotal = destination.expenses.reduce((s, e) => s + e.amount, 0)
  const overBudget = destination.budget_estimate != null && actualTotal > destination.budget_estimate

  return (
    <Link
      href={`/trips/${tripId}/destination/${destination.id}`}
      className="block p-3 rounded-lg border bg-white hover:shadow-sm transition-shadow"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-medium text-sm ${destination.status === 'REPLACED' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
              {destination.name}
            </span>
            <StatusBadge status={destination.status} />
          </div>
          {(destination.start_time || destination.end_time) && (
            <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
              <Clock className="h-3 w-3" />
              {formatTime(destination.start_time)}
              {destination.end_time && ` → ${formatTime(destination.end_time)}`}
            </div>
          )}
        </div>
        <div className="text-right shrink-0">
          {destination.budget_estimate != null && (
            <p className={`text-xs font-medium ${overBudget ? 'text-red-500' : 'text-gray-500'}`}>
              {formatVND(actualTotal)} / {formatVND(destination.budget_estimate)}
            </p>
          )}
          {destination._count.feedbacks > 0 && (
            <div className="flex items-center gap-1 justify-end mt-1 text-xs text-gray-400">
              <MessageSquare className="h-3 w-3" />
              {destination._count.feedbacks}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
```

- [ ] **Step 4: Create DayBlock component**

Create `components/trips/day-block.tsx`:

```typescript
import { DestinationCard } from './destination-card'
import { formatDate, formatVND } from '@/lib/format'
import { CalendarDays } from 'lucide-react'

interface DayBlockProps {
  day: {
    id: string
    date: string
    day_number: number
    label: string | null
    destinations: any[]
  }
  tripId: string
}

export function DayBlock({ day, tripId }: DayBlockProps) {
  const totalBudget = day.destinations.reduce((s: number, d: any) => s + (d.budget_estimate ?? 0), 0)
  const totalActual = day.destinations.reduce(
    (s: number, d: any) => s + d.expenses.reduce((es: number, e: any) => es + e.amount, 0),
    0
  )

  return (
    <div className="relative pl-8">
      {/* Timeline line */}
      <div className="absolute left-3 top-0 bottom-0 w-px bg-sky-200" />
      {/* Timeline dot */}
      <div className="absolute left-1.5 top-1.5 w-3 h-3 rounded-full bg-sky-400 border-2 border-white" />

      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-sky-500" />
              <h3 className="font-semibold text-sky-900">
                Ngày {day.day_number} — {formatDate(day.date)}
              </h3>
            </div>
            {day.label && (
              <p className="text-sm text-gray-500 ml-6">{day.label}</p>
            )}
          </div>
          {totalBudget > 0 && (
            <div className="text-right text-xs text-gray-400">
              <p>{formatVND(totalActual)} / {formatVND(totalBudget)}</p>
              <p>{day.destinations.length} điểm đến</p>
            </div>
          )}
        </div>

        {day.destinations.length === 0 ? (
          <p className="text-sm text-gray-400 italic ml-1">Chưa có điểm đến nào.</p>
        ) : (
          <div className="space-y-2">
            {day.destinations.map((dest: any) => (
              <DestinationCard key={dest.id} destination={dest} tripId={tripId} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create Trip Detail page**

Create `app/(app)/trips/[tripId]/page.tsx`:

```typescript
import { auth } from '@/lib/auth'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { DayBlock } from '@/components/trips/day-block'
import { formatDate, formatVND } from '@/lib/format'
import { Settings, Users, Trophy, CalendarDays, MapPin } from 'lucide-react'

export default async function TripDetailPage({ params }: { params: { tripId: string } }) {
  const session = await auth()
  const isAdmin = (session?.user as any)?.role === 'ADMIN'

  const trip = await prisma.trip.findUnique({
    where: { id: params.tripId },
    include: {
      members: { include: { user: { select: { id: true, name: true } } } },
      days: {
        orderBy: { day_number: 'asc' },
        include: {
          destinations: {
            orderBy: { order_index: 'asc' },
            include: {
              expenses: { select: { amount: true } },
              _count: { select: { feedbacks: true } },
            },
          },
        },
      },
    },
  })

  if (!trip) notFound()

  const totalBudget = trip.days.flatMap(d => d.destinations).reduce((s, d) => s + (d.budget_estimate ?? 0), 0)
  const totalActual = trip.days.flatMap(d => d.destinations).flatMap(d => d.expenses).reduce((s, e) => s + e.amount, 0)
  const totalDests = trip.days.flatMap(d => d.destinations).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-sky-900">{trip.title}</h1>
            {trip.description && <p className="text-gray-500 mt-1">{trip.description}</p>}
            <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <CalendarDays className="h-4 w-4" />
                {formatDate(trip.start_date)} – {formatDate(trip.end_date)}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {trip.members.length} thành viên
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {totalDests} điểm đến
              </span>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {isAdmin && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/trips/${trip.id}/config`}>
                  <Settings className="h-4 w-4 mr-1" /> Cấu hình
                </Link>
              </Button>
            )}
            <Button asChild variant="outline" size="sm">
              <Link href={`/trips/${trip.id}/members`}>
                <Users className="h-4 w-4 mr-1" /> Thành viên
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/trips/${trip.id}/summary`}>
                <Trophy className="h-4 w-4 mr-1" /> Tổng kết
              </Link>
            </Button>
          </div>
        </div>

        {/* Budget summary */}
        {totalBudget > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-500">Chi tiêu</span>
              <span className={totalActual > totalBudget ? 'text-red-500 font-medium' : 'text-gray-700'}>
                {formatVND(totalActual)} / {formatVND(totalBudget)}
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  totalActual / totalBudget > 1 ? 'bg-red-400' :
                  totalActual / totalBudget > 0.8 ? 'bg-yellow-400' : 'bg-sky-400'
                }`}
                style={{ width: `${Math.min((totalActual / totalBudget) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Days timeline */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-sky-900">Lịch trình</h2>
        {trip.days.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center border">
            <CalendarDays className="h-10 w-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-400">Chưa có ngày nào. {isAdmin && 'Vào Cấu hình để thêm ngày.'}</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl p-6 border">
            {trip.days.map((day) => (
              <DayBlock key={day.id} day={day as any} tripId={trip.id} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Manual test**

1. Navigate to `/trips/[id]` of the trip created in Task 1
2. See trip header with title, dates, member count
3. See "Chưa có ngày nào" empty state
4. GET `/api/trips/[id]/days` → returns empty array

- [ ] **Step 7: Commit**

```bash
git add app/api/trips/ app/\(app\)/trips/\[tripId\]/ components/trips/ components/ui/status-badge.tsx
git commit -m "feat: trip detail page with day timeline and destination cards"
```

---

### Task 3: Destination CRUD API + Config Page (Drag & Drop)

**Files:**
- Create: `app/api/days/[dayId]/destinations/route.ts`
- Create: `app/api/destinations/[destId]/route.ts`
- Create: `app/api/destinations/[destId]/status/route.ts`
- Create: `app/api/destinations/[destId]/replace/route.ts`
- Create: `app/(app)/trips/[tripId]/config/page.tsx`

**Interfaces:**
- Produces:
  - `GET /api/days/[dayId]/destinations` → `Destination[]`
  - `POST /api/days/[dayId]/destinations` → created `Destination`
  - `PUT /api/destinations/[destId]` → updated `Destination`
  - `DELETE /api/destinations/[destId]` → `{ ok: true }`
  - `PATCH /api/destinations/[destId]/status` body `{ status }` → updated `Destination`
  - `POST /api/destinations/[destId]/replace` body `{ name, start_time?, end_time?, budget_estimate? }` → `{ old, new: Destination }`

- [ ] **Step 1: Create Destination CRUD API**

Create `app/api/days/[dayId]/destinations/route.ts`:

```typescript
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(_: Request, { params }: { params: { dayId: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const destinations = await prisma.destination.findMany({
    where: { day_id: params.dayId },
    orderBy: { order_index: 'asc' },
  })
  return NextResponse.json(destinations)
}

export async function POST(req: Request, { params }: { params: { dayId: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { name, description, start_time, end_time, budget_estimate } = body

  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const last = await prisma.destination.findFirst({
    where: { day_id: params.dayId },
    orderBy: { order_index: 'desc' },
  })

  const dest = await prisma.destination.create({
    data: {
      day_id: params.dayId,
      name,
      description,
      order_index: (last?.order_index ?? -1) + 1,
      start_time: start_time ? new Date(start_time) : null,
      end_time: end_time ? new Date(end_time) : null,
      budget_estimate: budget_estimate ? Number(budget_estimate) : null,
    },
  })
  return NextResponse.json(dest, { status: 201 })
}
```

Create `app/api/destinations/[destId]/route.ts`:

```typescript
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function PUT(req: Request, { params }: { params: { destId: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const dest = await prisma.destination.update({
    where: { id: params.destId },
    data: {
      name: body.name,
      description: body.description,
      start_time: body.start_time ? new Date(body.start_time) : null,
      end_time: body.end_time ? new Date(body.end_time) : null,
      budget_estimate: body.budget_estimate != null ? Number(body.budget_estimate) : null,
      order_index: body.order_index != null ? Number(body.order_index) : undefined,
    },
  })
  return NextResponse.json(dest)
}

export async function DELETE(_: Request, { params }: { params: { destId: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.destination.delete({ where: { id: params.destId } })
  return NextResponse.json({ ok: true })
}
```

Create `app/api/destinations/[destId]/status/route.ts`:

```typescript
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function PATCH(req: Request, { params }: { params: { destId: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { status } = await req.json()
  const valid = ['PENDING', 'DONE', 'REJECTED', 'REPLACED']
  if (!valid.includes(status))
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })

  const dest = await prisma.destination.update({
    where: { id: params.destId },
    data: { status },
  })
  return NextResponse.json(dest)
}
```

Create `app/api/destinations/[destId]/replace/route.ts`:

```typescript
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST(req: Request, { params }: { params: { destId: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { name, start_time, end_time, budget_estimate } = body
  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const old = await prisma.destination.findUnique({ where: { id: params.destId } })
  if (!old) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const [newDest, updatedOld] = await prisma.$transaction([
    prisma.destination.create({
      data: {
        day_id: old.day_id,
        name,
        description: null,
        order_index: old.order_index + 1,
        start_time: start_time ? new Date(start_time) : null,
        end_time: end_time ? new Date(end_time) : null,
        budget_estimate: budget_estimate ? Number(budget_estimate) : null,
        status: 'PENDING',
      },
    }),
    prisma.destination.update({
      where: { id: params.destId },
      data: { status: 'REPLACED' },
    }),
  ])

  await prisma.destination.update({
    where: { id: updatedOld.id },
    data: { replaced_by_id: newDest.id },
  })

  return NextResponse.json({ old: updatedOld, new: newDest }, { status: 201 })
}
```

- [ ] **Step 2: Create Config Page with drag & drop**

Create `app/(app)/trips/[tripId]/config/page.tsx`:

```typescript
'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StatusBadge } from '@/components/ui/status-badge'
import { GripVertical, Plus, Trash2, Edit2, AlertTriangle } from 'lucide-react'
import { formatDate, formatTime } from '@/lib/format'

// Sortable destination item
function SortableDestItem({ dest, onEdit, onDelete, onReplace }: any) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: dest.id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 p-2 bg-white border rounded-lg">
      <button {...attributes} {...listeners} className="cursor-grab text-gray-300 hover:text-gray-500">
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium truncate block">{dest.name}</span>
        {dest.start_time && (
          <span className="text-xs text-gray-400">{formatTime(dest.start_time)}</span>
        )}
      </div>
      <StatusBadge status={dest.status} />
      <button onClick={() => onEdit(dest)} className="text-gray-400 hover:text-sky-500">
        <Edit2 className="h-4 w-4" />
      </button>
      <button onClick={() => onDelete(dest.id)} className="text-gray-400 hover:text-red-500">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}

export default function ConfigPage() {
  const params = useParams()
  const tripId = params.tripId as string
  const [days, setDays] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [editingDest, setEditingDest] = useState<any>(null)
  const [destForm, setDestForm] = useState({ name: '', description: '', start_time: '', end_time: '', budget_estimate: '' })
  const [conflict, setConflict] = useState('')

  useEffect(() => {
    fetch(`/api/trips/${tripId}/days`).then(r => r.json()).then(data => {
      setDays(data)
      setLoading(false)
    })
  }, [tripId])

  function checkConflict(dayId: string, start: string, end: string, excludeId?: string) {
    const day = days.find(d => d.id === dayId)
    if (!day || !start || !end) { setConflict(''); return }

    const s = new Date(start).getTime()
    const e = new Date(end).getTime()

    const conflicting = day.destinations.find((d: any) => {
      if (d.id === excludeId) return false
      if (!d.start_time || !d.end_time) return false
      const ds = new Date(d.start_time).getTime()
      const de = new Date(d.end_time).getTime()
      return s < de && e > ds
    })
    setConflict(conflicting ? `Trùng giờ với "${conflicting.name}"` : '')
  }

  async function addDay() {
    const lastDay = days[days.length - 1]
    const trip = await fetch(`/api/trips/${tripId}`).then(r => r.json())
    const nextDate = lastDay
      ? new Date(new Date(lastDay.date).getTime() + 86400000).toISOString()
      : trip.start_date

    const res = await fetch(`/api/trips/${tripId}/days`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: nextDate }),
    })
    const day = await res.json()
    setDays([...days, { ...day, destinations: [] }])
    setSelectedDay(day.id)
  }

  async function deleteDay(dayId: string) {
    if (!confirm('Xóa ngày này sẽ xóa toàn bộ điểm đến. Tiếp tục?')) return
    await fetch(`/api/trips/${tripId}/days/${dayId}`, { method: 'DELETE' })
    setDays(days.filter(d => d.id !== dayId))
    if (selectedDay === dayId) setSelectedDay(null)
  }

  async function saveDest() {
    if (!selectedDay || !destForm.name) return
    const body = {
      name: destForm.name,
      description: destForm.description || null,
      start_time: destForm.start_time ? `${days.find(d=>d.id===selectedDay)?.date.slice(0,10)}T${destForm.start_time}` : null,
      end_time: destForm.end_time ? `${days.find(d=>d.id===selectedDay)?.date.slice(0,10)}T${destForm.end_time}` : null,
      budget_estimate: destForm.budget_estimate ? Number(destForm.budget_estimate) : null,
    }

    if (editingDest) {
      const res = await fetch(`/api/destinations/${editingDest.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const updated = await res.json()
      setDays(days.map(d => d.id === selectedDay
        ? { ...d, destinations: d.destinations.map((x: any) => x.id === updated.id ? updated : x) }
        : d
      ))
    } else {
      const res = await fetch(`/api/days/${selectedDay}/destinations`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const created = await res.json()
      setDays(days.map(d => d.id === selectedDay
        ? { ...d, destinations: [...d.destinations, created] }
        : d
      ))
    }
    setDestForm({ name: '', description: '', start_time: '', end_time: '', budget_estimate: '' })
    setEditingDest(null)
    setConflict('')
  }

  async function deleteDest(destId: string) {
    if (!confirm('Xóa điểm đến này?')) return
    await fetch(`/api/destinations/${destId}`, { method: 'DELETE' })
    setDays(days.map(d => ({ ...d, destinations: d.destinations.filter((x: any) => x.id !== destId) })))
  }

  async function handleDragEnd(event: DragEndEvent, dayId: string) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const day = days.find(d => d.id === dayId)
    const oldIdx = day.destinations.findIndex((d: any) => d.id === active.id)
    const newIdx = day.destinations.findIndex((d: any) => d.id === over.id)
    const reordered = arrayMove(day.destinations, oldIdx, newIdx)

    setDays(days.map(d => d.id === dayId ? { ...d, destinations: reordered } : d))

    // Persist new order_index values
    await Promise.all(
      reordered.map((dest: any, idx: number) =>
        fetch(`/api/destinations/${dest.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_index: idx }),
        })
      )
    )
  }

  function startEdit(dest: any) {
    setEditingDest(dest)
    setDestForm({
      name: dest.name,
      description: dest.description ?? '',
      start_time: dest.start_time ? new Date(dest.start_time).toTimeString().slice(0,5) : '',
      end_time: dest.end_time ? new Date(dest.end_time).toTimeString().slice(0,5) : '',
      budget_estimate: dest.budget_estimate?.toString() ?? '',
    })
  }

  if (loading) return <div className="text-center py-12 text-gray-400">Đang tải...</div>

  const currentDay = days.find(d => d.id === selectedDay)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-sky-900">Cấu hình lịch trình</h1>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Left: Days list */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-700">Các ngày</h2>
            <Button size="sm" onClick={addDay} className="bg-sky-500 hover:bg-sky-600">
              <Plus className="h-4 w-4 mr-1" /> Thêm ngày
            </Button>
          </div>

          {days.map(day => (
            <div key={day.id}
              className={`border rounded-xl p-4 cursor-pointer transition-colors ${selectedDay === day.id ? 'border-sky-400 bg-sky-50' : 'bg-white hover:border-sky-200'}`}
              onClick={() => setSelectedDay(day.id)}
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="font-medium text-sm">Ngày {day.day_number} — {formatDate(day.date)}</span>
                  {day.label && <p className="text-xs text-gray-400">{day.label}</p>}
                </div>
                <button onClick={(e) => { e.stopPropagation(); deleteDay(day.id) }}
                  className="text-gray-300 hover:text-red-400">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Destinations with drag & drop */}
              <DndContext collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, day.id)}>
                <SortableContext items={day.destinations.map((d: any) => d.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-1" onClick={e => e.stopPropagation()}>
                    {day.destinations.map((dest: any) => (
                      <SortableDestItem
                        key={dest.id}
                        dest={dest}
                        onEdit={(d: any) => { setSelectedDay(day.id); startEdit(d) }}
                        onDelete={deleteDest}
                        onReplace={() => {}}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              {selectedDay === day.id && (
                <Button size="sm" variant="outline" className="mt-2 w-full"
                  onClick={(e) => { e.stopPropagation(); setEditingDest(null); setDestForm({ name:'',description:'',start_time:'',end_time:'',budget_estimate:'' }) }}>
                  <Plus className="h-3 w-3 mr-1" /> Thêm điểm đến
                </Button>
              )}
            </div>
          ))}

          {days.length === 0 && (
            <div className="text-center py-8 text-gray-400 border rounded-xl bg-white">
              Chưa có ngày nào. Nhấn "+ Thêm ngày" để bắt đầu.
            </div>
          )}
        </div>

        {/* Right: Destination form */}
        {selectedDay && (
          <div className="bg-white rounded-xl border p-5 space-y-4 h-fit sticky top-20">
            <h2 className="font-semibold text-gray-700">
              {editingDest ? 'Sửa điểm đến' : 'Thêm điểm đến'} — Ngày {currentDay?.day_number}
            </h2>
            <div className="space-y-1">
              <Label>Tên điểm đến *</Label>
              <Input value={destForm.name} onChange={e => setDestForm({...destForm, name: e.target.value})} placeholder="VD: Bà Nà Hills" />
            </div>
            <div className="space-y-1">
              <Label>Mô tả / ghi chú</Label>
              <Input value={destForm.description} onChange={e => setDestForm({...destForm, description: e.target.value})} placeholder="Lưu ý khi đến..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Giờ bắt đầu</Label>
                <Input type="time" value={destForm.start_time}
                  onChange={e => {
                    setDestForm({...destForm, start_time: e.target.value})
                    checkConflict(selectedDay, `${currentDay?.date.slice(0,10)}T${e.target.value}`, `${currentDay?.date.slice(0,10)}T${destForm.end_time}`, editingDest?.id)
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label>Giờ kết thúc</Label>
                <Input type="time" value={destForm.end_time}
                  onChange={e => {
                    setDestForm({...destForm, end_time: e.target.value})
                    checkConflict(selectedDay, `${currentDay?.date.slice(0,10)}T${destForm.start_time}`, `${currentDay?.date.slice(0,10)}T${e.target.value}`, editingDest?.id)
                  }}
                />
              </div>
            </div>
            {conflict && (
              <div className="flex items-center gap-2 text-yellow-600 text-sm bg-yellow-50 p-2 rounded-lg border border-yellow-200">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {conflict}
              </div>
            )}
            <div className="space-y-1">
              <Label>Ngân sách dự tính (VND)</Label>
              <Input type="number" value={destForm.budget_estimate} onChange={e => setDestForm({...destForm, budget_estimate: e.target.value})} placeholder="500000" />
            </div>
            <div className="flex gap-2">
              <Button onClick={saveDest} className="flex-1 bg-sky-500 hover:bg-sky-600">
                {editingDest ? 'Cập nhật' : 'Thêm'}
              </Button>
              <Button variant="outline" onClick={() => { setEditingDest(null); setDestForm({ name:'',description:'',start_time:'',end_time:'',budget_estimate:'' }); setConflict('') }}>
                Hủy
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Manual test Config page**

1. Navigate to `/trips/[id]/config`
2. Click "+ Thêm ngày" — day appears in list
3. Click on the day, click "+ Thêm điểm đến"
4. Fill form and save — destination appears in day
5. Drag destination to reorder — reorder persists on refresh
6. Set overlapping times on 2 destinations — yellow conflict warning appears
7. Delete destination with confirm dialog

- [ ] **Step 4: Commit**

```bash
git add app/api/days/ app/api/destinations/ app/\(app\)/trips/\[tripId\]/config/
git commit -m "feat: destination CRUD API and config page with drag-and-drop"
```

---

### Task 4: Expense API + Feedback API + Destination Detail Page

**Files:**
- Create: `app/api/destinations/[destId]/expenses/route.ts`
- Create: `app/api/destinations/[destId]/expenses/split/route.ts`
- Create: `app/api/expenses/[expId]/route.ts`
- Create: `app/api/destinations/[destId]/feedbacks/route.ts`
- Create: `app/(app)/trips/[tripId]/destination/[destId]/page.tsx`
- Create: `components/destinations/info-tab.tsx`
- Create: `components/destinations/expense-tab.tsx`
- Create: `components/destinations/feedback-tab.tsx`
- Create: `components/ui/expense-progress.tsx`

**Interfaces:**
- Produces:
  - `GET /api/destinations/[destId]/expenses` → `DestinationExpense[]` with user name
  - `POST /api/destinations/[destId]/expenses` body `{ user_id, amount, note }` → created expense
  - `POST /api/destinations/[destId]/expenses/split` body `{ total, note, user_ids[] }` → created expenses array
  - `PUT /api/expenses/[expId]` body `{ amount, note }` → updated expense
  - `DELETE /api/expenses/[expId]` → `{ ok: true }`
  - `GET /api/destinations/[destId]/feedbacks` → `DestinationFeedback[]` with user name
  - `POST /api/destinations/[destId]/feedbacks` body `{ status, note }` → upserted feedback
- Produces: `<ExpenseProgress actual={n} budget={n} />` — progress bar with color logic

- [ ] **Step 1: Create ExpenseProgress component**

Create `components/ui/expense-progress.tsx`:

```typescript
import { formatVND } from '@/lib/format'

interface ExpenseProgressProps {
  actual: number
  budget: number | null
}

export function ExpenseProgress({ actual, budget }: ExpenseProgressProps) {
  if (!budget) return (
    <div className="text-sm text-gray-500">
      Chi tiêu thực tế: <span className="font-medium text-gray-800">{formatVND(actual)}</span>
    </div>
  )

  const pct = Math.min((actual / budget) * 100, 100)
  const color = actual > budget ? 'bg-red-400' : actual / budget > 0.8 ? 'bg-yellow-400' : 'bg-sky-400'

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-500">Thực tế / Dự tính</span>
        <span className={actual > budget ? 'text-red-500 font-medium' : 'text-gray-700'}>
          {formatVND(actual)} / {formatVND(budget)}
        </span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create Expense APIs**

Create `app/api/destinations/[destId]/expenses/route.ts`:

```typescript
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(_: Request, { params }: { params: { destId: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const expenses = await prisma.destinationExpense.findMany({
    where: { destination_id: params.destId },
    include: { user: { select: { id: true, name: true, avatar_url: true } } },
    orderBy: { created_at: 'asc' },
  })
  return NextResponse.json(expenses)
}

export async function POST(req: Request, { params }: { params: { destId: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { user_id, amount, note } = await req.json()
  if (!user_id || !amount) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const expense = await prisma.destinationExpense.create({
    data: { destination_id: params.destId, user_id, amount: Number(amount), note },
    include: { user: { select: { id: true, name: true, avatar_url: true } } },
  })
  return NextResponse.json(expense, { status: 201 })
}
```

Create `app/api/destinations/[destId]/expenses/split/route.ts`:

```typescript
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST(req: Request, { params }: { params: { destId: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { total, note, user_ids } = await req.json()
  if (!total || !user_ids?.length) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const perPerson = Math.floor(Number(total) / user_ids.length)

  const expenses = await prisma.$transaction(
    user_ids.map((uid: string) =>
      prisma.destinationExpense.create({
        data: { destination_id: params.destId, user_id: uid, amount: perPerson, note },
        include: { user: { select: { id: true, name: true, avatar_url: true } } },
      })
    )
  )
  return NextResponse.json(expenses, { status: 201 })
}
```

Create `app/api/expenses/[expId]/route.ts`:

```typescript
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function PUT(req: Request, { params }: { params: { expId: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { amount, note } = await req.json()
  const expense = await prisma.destinationExpense.update({
    where: { id: params.expId },
    data: { amount: Number(amount), note },
    include: { user: { select: { id: true, name: true } } },
  })
  return NextResponse.json(expense)
}

export async function DELETE(_: Request, { params }: { params: { expId: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.destinationExpense.delete({ where: { id: params.expId } })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Create Feedback API**

Create `app/api/destinations/[destId]/feedbacks/route.ts`:

```typescript
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(_: Request, { params }: { params: { destId: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const feedbacks = await prisma.destinationFeedback.findMany({
    where: { destination_id: params.destId },
    include: { user: { select: { id: true, name: true, avatar_url: true } } },
    orderBy: { updated_at: 'desc' },
  })
  return NextResponse.json(feedbacks)
}

export async function POST(req: Request, { params }: { params: { destId: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check user is a TripMember
  const dest = await prisma.destination.findUnique({
    where: { id: params.destId },
    include: { day: { include: { trip: { include: { members: true } } } } },
  })
  const isMember = dest?.day.trip.members.some(m => m.user_id === session.user.id)
  if (!isMember) return NextResponse.json({ error: 'Not a trip member' }, { status: 403 })

  const { status, note } = await req.json()
  const valid = ['OK', 'NOT_OK', 'MAYBE']
  if (!valid.includes(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })

  const feedback = await prisma.destinationFeedback.upsert({
    where: { destination_id_user_id: { destination_id: params.destId, user_id: session.user.id } },
    create: { destination_id: params.destId, user_id: session.user.id, status, note },
    update: { status, note },
    include: { user: { select: { id: true, name: true, avatar_url: true } } },
  })
  return NextResponse.json(feedback)
}
```

- [ ] **Step 4: Create Destination Detail page**

Create `app/(app)/trips/[tripId]/destination/[destId]/page.tsx`:

```typescript
import { auth } from '@/lib/auth'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
        include: { user: { select: { id: true, name: true, avatar_url: true } } },
        orderBy: { created_at: 'asc' },
      },
      media: {
        include: { uploader: { select: { name: true } } },
        orderBy: { created_at: 'asc' },
      },
      feedbacks: {
        include: { user: { select: { id: true, name: true, avatar_url: true } } },
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
      <nav className="flex items-center gap-1 text-sm text-gray-400">
        <Link href={`/trips/${params.tripId}`} className="hover:text-sky-500">
          {dest.day.trip.title}
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span>Ngày {dest.day.day_number}</span>
        <ChevronRight className="h-3 w-3" />
        <span className="text-gray-700 font-medium">{dest.name}</span>
      </nav>

      {/* Header */}
      <div className="bg-white rounded-xl p-5 border shadow-sm">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className={`text-xl font-bold ${dest.status === 'REPLACED' ? 'line-through text-gray-400' : 'text-sky-900'}`}>
                {dest.name}
              </h1>
              <StatusBadge status={dest.status} />
            </div>
            {(dest.start_time || dest.end_time) && (
              <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
                <Clock className="h-4 w-4" />
                {formatTime(dest.start_time)}
                {dest.end_time && ` → ${formatTime(dest.end_time)}`}
              </div>
            )}
            {dest.replaced_by && (
              <p className="text-sm text-gray-400 mt-1">
                Thay thế bởi:{' '}
                <Link href={`/trips/${params.tripId}/destination/${dest.replaced_by.id}`}
                  className="text-sky-500 hover:underline">
                  {dest.replaced_by.name}
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info" className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <TabsList className="w-full rounded-none border-b bg-gray-50 h-11">
          <TabsTrigger value="info" className="flex-1">Thông tin</TabsTrigger>
          <TabsTrigger value="media" className="flex-1">Ảnh & Bill</TabsTrigger>
          <TabsTrigger value="expense" className="flex-1">Chi tiêu</TabsTrigger>
          <TabsTrigger value="feedback" className="flex-1">Feedback</TabsTrigger>
        </TabsList>
        <div className="p-5">
          <TabsContent value="info">
            <InfoTab dest={dest as any} isAdmin={isAdmin} tripId={params.tripId} members={members} />
          </TabsContent>
          <TabsContent value="media">
            <MediaTab media={dest.media as any} destId={dest.id} isAdmin={isAdmin} />
          </TabsContent>
          <TabsContent value="expense">
            <ExpenseTab
              expenses={dest.expenses as any}
              members={members as any}
              budget={dest.budget_estimate}
              destId={dest.id}
              isAdmin={isAdmin}
            />
          </TabsContent>
          <TabsContent value="feedback">
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
```

- [ ] **Step 5: Create tab components (Info, Expense, Feedback)**

Create `components/destinations/info-tab.tsx`:

```typescript
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatVND } from '@/lib/format'

export function InfoTab({ dest, isAdmin, tripId, members }: any) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    name: dest.name,
    description: dest.description ?? '',
    budget_estimate: dest.budget_estimate?.toString() ?? '',
  })
  const [status, setStatus] = useState(dest.status)
  const [saving, setSaving] = useState(false)

  async function saveInfo() {
    setSaving(true)
    await fetch(`/api/destinations/${dest.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, budget_estimate: form.budget_estimate ? Number(form.budget_estimate) : null }),
    })
    setSaving(false)
    setEditing(false)
    router.refresh()
  }

  async function updateStatus(newStatus: string) {
    setStatus(newStatus)
    await fetch(`/api/destinations/${dest.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {isAdmin && !editing && (
        <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Sửa thông tin</Button>
      )}

      {editing ? (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Tên điểm đến</Label>
            <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          </div>
          <div className="space-y-1">
            <Label>Mô tả / ghi chú</Label>
            <Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3} />
          </div>
          <div className="space-y-1">
            <Label>Ngân sách dự tính (VND)</Label>
            <Input type="number" value={form.budget_estimate} onChange={e => setForm({...form, budget_estimate: e.target.value})} />
          </div>
          <div className="flex gap-2">
            <Button onClick={saveInfo} disabled={saving} className="bg-sky-500 hover:bg-sky-600">
              {saving ? 'Đang lưu...' : 'Lưu'}
            </Button>
            <Button variant="outline" onClick={() => setEditing(false)}>Hủy</Button>
          </div>
        </div>
      ) : (
        <dl className="space-y-3">
          {dest.description && (
            <div>
              <dt className="text-xs text-gray-400 mb-0.5">Ghi chú</dt>
              <dd className="text-sm text-gray-700">{dest.description}</dd>
            </div>
          )}
          {dest.budget_estimate != null && (
            <div>
              <dt className="text-xs text-gray-400 mb-0.5">Ngân sách dự tính</dt>
              <dd className="text-sm font-medium text-gray-700">{formatVND(dest.budget_estimate)}</dd>
            </div>
          )}
        </dl>
      )}

      {isAdmin && (
        <div className="pt-3 border-t space-y-1">
          <Label className="text-xs text-gray-400">Trạng thái</Label>
          <Select value={status} onValueChange={updateStatus}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDING">Chưa đi</SelectItem>
              <SelectItem value="DONE">Đã đi</SelectItem>
              <SelectItem value="REJECTED">Không đi</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  )
}
```

Create `components/destinations/expense-tab.tsx`:

```typescript
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ExpenseProgress } from '@/components/ui/expense-progress'
import { formatVND } from '@/lib/format'
import { Plus, Trash2, Split } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

export function ExpenseTab({ expenses, members, budget, destId, isAdmin }: any) {
  const router = useRouter()
  const [addForm, setAddForm] = useState({ user_id: '', amount: '', note: '' })
  const [splitForm, setSplitForm] = useState({ total: '', note: '', user_ids: members.map((m: any) => m.user_id) })
  const [splitOpen, setSplitOpen] = useState(false)

  const actual = expenses.reduce((s: number, e: any) => s + e.amount, 0)

  // Group expenses by user
  const byUser: Record<string, { user: any; items: any[]; total: number }> = {}
  for (const exp of expenses) {
    if (!byUser[exp.user_id]) byUser[exp.user_id] = { user: exp.user, items: [], total: 0 }
    byUser[exp.user_id].items.push(exp)
    byUser[exp.user_id].total += exp.amount
  }

  async function addExpense() {
    if (!addForm.user_id || !addForm.amount) return
    await fetch(`/api/destinations/${destId}/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: addForm.user_id, amount: Number(addForm.amount), note: addForm.note }),
    })
    setAddForm({ user_id: '', amount: '', note: '' })
    router.refresh()
  }

  async function deleteExpense(id: string) {
    await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  async function splitExpense() {
    await fetch(`/api/destinations/${destId}/expenses/split`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ total: Number(splitForm.total), note: splitForm.note, user_ids: splitForm.user_ids }),
    })
    setSplitOpen(false)
    router.refresh()
  }

  return (
    <div className="space-y-5">
      <ExpenseProgress actual={actual} budget={budget} />

      {/* Per-user breakdown */}
      {Object.values(byUser).map(({ user, items, total }: any) => (
        <div key={user.id} className="space-y-1">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs bg-sky-100 text-sky-700">
                {user.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{user.name}</span>
            <span className="ml-auto text-sm text-gray-500">{formatVND(total)}</span>
          </div>
          {items.map((item: any) => (
            <div key={item.id} className="flex items-center gap-2 pl-8 text-xs text-gray-500">
              <span className="flex-1">{item.note || '—'}</span>
              <span>{formatVND(item.amount)}</span>
              {isAdmin && (
                <button onClick={() => deleteExpense(item.id)} className="text-gray-300 hover:text-red-400">
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      ))}

      {expenses.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">Chưa có khoản chi tiêu nào.</p>
      )}

      {/* Admin actions */}
      {isAdmin && (
        <div className="pt-4 border-t space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">Thành viên</Label>
              <select className="w-full border rounded-md text-sm px-2 py-1.5 mt-1"
                value={addForm.user_id} onChange={e => setAddForm({...addForm, user_id: e.target.value})}>
                <option value="">Chọn...</option>
                {members.map((m: any) => (
                  <option key={m.user_id} value={m.user_id}>{m.user.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Số tiền (VND)</Label>
              <Input type="number" className="mt-1" value={addForm.amount}
                onChange={e => setAddForm({...addForm, amount: e.target.value})} placeholder="50000" />
            </div>
            <div>
              <Label className="text-xs">Ghi chú</Label>
              <Input className="mt-1" value={addForm.note}
                onChange={e => setAddForm({...addForm, note: e.target.value})} placeholder="Ăn trưa..." />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={addExpense} className="bg-sky-500 hover:bg-sky-600">
              <Plus className="h-3 w-3 mr-1" /> Thêm chi tiêu
            </Button>

            <Dialog open={splitOpen} onOpenChange={setSplitOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Split className="h-3 w-3 mr-1" /> Chia tiền nhóm
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Chia tiền nhóm</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Tổng số tiền (VND)</Label>
                    <Input type="number" value={splitForm.total}
                      onChange={e => setSplitForm({...splitForm, total: e.target.value})} placeholder="300000" />
                  </div>
                  <div>
                    <Label>Ghi chú</Label>
                    <Input value={splitForm.note}
                      onChange={e => setSplitForm({...splitForm, note: e.target.value})} placeholder="Vé tham quan..." />
                  </div>
                  <div>
                    <Label>Chia cho</Label>
                    <div className="space-y-1 mt-1">
                      {members.map((m: any) => (
                        <label key={m.user_id} className="flex items-center gap-2 text-sm cursor-pointer">
                          <input type="checkbox"
                            checked={splitForm.user_ids.includes(m.user_id)}
                            onChange={e => setSplitForm({
                              ...splitForm,
                              user_ids: e.target.checked
                                ? [...splitForm.user_ids, m.user_id]
                                : splitForm.user_ids.filter((id: string) => id !== m.user_id)
                            })}
                          />
                          {m.user.name}
                        </label>
                      ))}
                    </div>
                    {splitForm.user_ids.length > 0 && splitForm.total && (
                      <p className="text-xs text-sky-600 mt-2">
                        Mỗi người: {formatVND(Math.floor(Number(splitForm.total) / splitForm.user_ids.length))}
                      </p>
                    )}
                  </div>
                  <Button onClick={splitExpense} className="w-full bg-sky-500 hover:bg-sky-600">
                    Xác nhận chia tiền
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      )}
    </div>
  )
}
```

Create `components/destinations/feedback-tab.tsx`:

```typescript
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

const feedbackConfig = {
  OK:     { icon: '👍', label: 'Ổn',         color: 'border-green-400 bg-green-50 text-green-700' },
  NOT_OK: { icon: '👎', label: 'Không ổn',   color: 'border-red-400 bg-red-50 text-red-700' },
  MAYBE:  { icon: '🤔', label: 'Bình thường', color: 'border-yellow-400 bg-yellow-50 text-yellow-700' },
} as const

export function FeedbackTab({ feedbacks, members, destId, currentUserId }: any) {
  const router = useRouter()
  const [selected, setSelected] = useState<string | null>(
    feedbacks.find((f: any) => f.user_id === currentUserId)?.status ?? null
  )
  const [note, setNote] = useState(feedbacks.find((f: any) => f.user_id === currentUserId)?.note ?? '')
  const [saving, setSaving] = useState(false)

  const counts = { OK: 0, NOT_OK: 0, MAYBE: 0 }
  feedbacks.forEach((f: any) => { if (f.status in counts) counts[f.status as keyof typeof counts]++ })

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
      <div className="flex gap-4">
        {(['OK', 'NOT_OK', 'MAYBE'] as const).map(s => (
          <div key={s} className={cn('flex-1 text-center p-3 rounded-lg border', feedbackConfig[s].color)}>
            <div className="text-2xl">{feedbackConfig[s].icon}</div>
            <div className="text-xl font-bold">{counts[s]}</div>
            <div className="text-xs">{feedbackConfig[s].label}</div>
          </div>
        ))}
      </div>

      {/* Current user's feedback form */}
      <div className="border rounded-lg p-4 space-y-3 bg-sky-50">
        <p className="text-sm font-medium text-gray-700">Feedback của bạn</p>
        <div className="flex gap-2">
          {(['OK', 'NOT_OK', 'MAYBE'] as const).map(s => (
            <button key={s} onClick={() => setSelected(s)}
              className={cn('flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-colors',
                selected === s ? feedbackConfig[s].color + ' border-current' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
              )}>
              {feedbackConfig[s].icon} {feedbackConfig[s].label}
            </button>
          ))}
        </div>
        <Textarea value={note} onChange={e => setNote(e.target.value)}
          placeholder="Ghi chú thêm (tuỳ chọn)..." rows={2} />
        <Button onClick={saveFeedback} disabled={!selected || saving}
          className="w-full bg-sky-500 hover:bg-sky-600">
          {saving ? 'Đang lưu...' : 'Lưu feedback'}
        </Button>
      </div>

      {/* All feedbacks */}
      <div className="space-y-2">
        {feedbacks.map((fb: any) => (
          <div key={fb.id} className="flex items-start gap-3 p-3 bg-white border rounded-lg">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="text-xs bg-sky-100 text-sky-700">
                {fb.user.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{fb.user.name}</span>
                <span className={cn('text-xs px-2 py-0.5 rounded-full border', feedbackConfig[fb.status as keyof typeof feedbackConfig].color)}>
                  {feedbackConfig[fb.status as keyof typeof feedbackConfig].icon} {feedbackConfig[fb.status as keyof typeof feedbackConfig].label}
                </span>
              </div>
              {fb.note && <p className="text-xs text-gray-500 mt-1">{fb.note}</p>}
            </div>
          </div>
        ))}

        {/* Members who haven't feedback yet */}
        {members
          .filter((m: any) => !feedbacks.some((f: any) => f.user_id === m.user_id))
          .map((m: any) => (
            <div key={m.user_id} className="flex items-center gap-3 p-3 bg-gray-50 border border-dashed rounded-lg opacity-50">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs bg-gray-100 text-gray-400">
                  {m.user.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-gray-400">{m.user.name} — Chưa feedback</span>
            </div>
          ))
        }
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Create MediaTab placeholder (full implementation in Task 5)**

Create `components/destinations/media-tab.tsx`:

```typescript
export function MediaTab({ media, destId, isAdmin }: any) {
  return (
    <div className="text-center py-8 text-gray-400">
      <p>Chức năng upload ảnh sẽ được thêm vào Task 5.</p>
    </div>
  )
}
```

- [ ] **Step 7: Manual test**

1. Navigate to `/trips/[id]/destination/[destId]`
2. See 4 tabs: Thông tin, Ảnh & Bill, Chi tiêu, Feedback
3. Admin: edit info, change status to DONE — page refreshes with updated badge
4. Admin: add expense for a member — appears in Chi tiêu tab
5. Admin: split 300,000đ among 3 members — each gets 100,000đ
6. Member: submit feedback OK with note — appears in feedback list

- [ ] **Step 8: Commit**

```bash
git add app/api/destinations/ app/api/expenses/ components/destinations/ components/ui/expense-progress.tsx
git commit -m "feat: expense and feedback APIs, destination detail page with tabs"
```

---

### Task 5: File Upload (Photos + Bills)

**Files:**
- Create: `app/api/destinations/[destId]/media/route.ts`
- Create: `app/api/media/[mediaId]/route.ts`
- Create: `app/api/media/[mediaId]/best-shot/route.ts`
- Modify: `components/destinations/media-tab.tsx`
- Create: `components/ui/upload-zone.tsx`

**Interfaces:**
- Consumes: `FormData` with `file` (File) and `type` ("PHOTO" | "BILL")
- Produces:
  - `POST /api/destinations/[destId]/media` multipart → created `DestinationMedia`
  - `DELETE /api/media/[mediaId]` → `{ ok: true }`, deletes file from disk
  - `PATCH /api/media/[mediaId]/best-shot` → updated `DestinationMedia`

- [ ] **Step 1: Create media upload API**

Create `app/api/destinations/[destId]/media/route.ts`:

```typescript
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

const MAX_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_PHOTO = ['image/jpeg', 'image/png', 'image/webp']
const ALLOWED_BILL  = ['image/jpeg', 'image/png', 'application/pdf']

export async function POST(req: Request, { params }: { params: { destId: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const dest = await prisma.destination.findUnique({
    where: { id: params.destId },
    include: { day: { select: { trip_id: true } } },
  })
  if (!dest) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const type = formData.get('type') as string | null

  if (!file || !type) return NextResponse.json({ error: 'Missing file or type' }, { status: 400 })
  if (file.size > MAX_SIZE) return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })

  const allowed = type === 'PHOTO' ? ALLOWED_PHOTO : ALLOWED_BILL
  if (!allowed.includes(file.type))
    return NextResponse.json({ error: `Invalid file type for ${type}` }, { status: 400 })

  const ext = file.name.split('.').pop() ?? 'bin'
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', dest.day.trip_id, params.destId)

  await mkdir(uploadDir, { recursive: true })
  const bytes = await file.arrayBuffer()
  await writeFile(path.join(uploadDir, filename), Buffer.from(bytes))

  const filePath = `/uploads/${dest.day.trip_id}/${params.destId}/${filename}`

  const media = await prisma.destinationMedia.create({
    data: {
      destination_id: params.destId,
      file_path: filePath,
      file_name: file.name,
      file_size: file.size,
      type: type as 'PHOTO' | 'BILL',
      uploaded_by: session.user.id,
    },
    include: { uploader: { select: { name: true } } },
  })
  return NextResponse.json(media, { status: 201 })
}
```

Create `app/api/media/[mediaId]/route.ts`:

```typescript
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { unlink } from 'fs/promises'
import path from 'path'

export async function DELETE(_: Request, { params }: { params: { mediaId: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const media = await prisma.destinationMedia.findUnique({ where: { id: params.mediaId } })
  if (!media) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Delete file from disk (ignore error if file missing)
  try {
    await unlink(path.join(process.cwd(), 'public', media.file_path))
  } catch {}

  await prisma.destinationMedia.delete({ where: { id: params.mediaId } })
  return NextResponse.json({ ok: true })
}
```

Create `app/api/media/[mediaId]/best-shot/route.ts`:

```typescript
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function PATCH(_: Request, { params }: { params: { mediaId: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const media = await prisma.destinationMedia.findUnique({ where: { id: params.mediaId } })
  if (!media) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = await prisma.destinationMedia.update({
    where: { id: params.mediaId },
    data: { is_best_shot: !media.is_best_shot },
  })
  return NextResponse.json(updated)
}
```

- [ ] **Step 2: Replace MediaTab placeholder with real implementation**

Replace `components/destinations/media-tab.tsx`:

```typescript
'use client'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Upload, Trash2, Star, FileText, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

export function MediaTab({ media, destId, isAdmin }: any) {
  const router = useRouter()
  const photoRef = useRef<HTMLInputElement>(null)
  const billRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const photos = media.filter((m: any) => m.type === 'PHOTO')
  const bills  = media.filter((m: any) => m.type === 'BILL')

  async function upload(files: FileList | null, type: 'PHOTO' | 'BILL') {
    if (!files?.length) return
    setUploading(true)
    for (const file of Array.from(files)) {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('type', type)
      await fetch(`/api/destinations/${destId}/media`, { method: 'POST', body: fd })
    }
    setUploading(false)
    router.refresh()
  }

  async function deleteMedia(id: string) {
    if (!confirm('Xóa file này?')) return
    await fetch(`/api/media/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  async function toggleBestShot(id: string) {
    await fetch(`/api/media/${id}/best-shot`, { method: 'PATCH' })
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Photos section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-gray-700">Ảnh ({photos.length})</h3>
          {isAdmin && (
            <>
              <Button size="sm" variant="outline" onClick={() => photoRef.current?.click()} disabled={uploading}>
                <Upload className="h-3 w-3 mr-1" /> {uploading ? 'Đang upload...' : 'Thêm ảnh'}
              </Button>
              <input ref={photoRef} type="file" multiple accept="image/jpeg,image/png,image/webp"
                className="hidden" onChange={e => upload(e.target.files, 'PHOTO')} />
            </>
          )}
        </div>

        {photos.length === 0 ? (
          <div className="border-2 border-dashed rounded-xl p-8 text-center text-gray-300">
            <Upload className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">Chưa có ảnh nào.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {photos.map((photo: any) => (
              <div key={photo.id} className="relative group aspect-square rounded-lg overflow-hidden border bg-gray-100">
                <Image src={photo.file_path} alt={photo.file_name} fill className="object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  {isAdmin && (
                    <>
                      <button onClick={() => toggleBestShot(photo.id)}
                        className={cn('p-1.5 rounded-full', photo.is_best_shot ? 'bg-yellow-400 text-white' : 'bg-white/80 text-gray-600')}>
                        <Star className="h-4 w-4" />
                      </button>
                      <button onClick={() => deleteMedia(photo.id)}
                        className="p-1.5 rounded-full bg-red-500 text-white">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
                {photo.is_best_shot && (
                  <div className="absolute top-1 right-1 bg-yellow-400 rounded-full p-0.5">
                    <Star className="h-3 w-3 text-white" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bills section */}
      <div className="border-t pt-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-gray-700">Hóa đơn / Bill ({bills.length})</h3>
          {isAdmin && (
            <>
              <Button size="sm" variant="outline" onClick={() => billRef.current?.click()} disabled={uploading}>
                <Upload className="h-3 w-3 mr-1" /> Thêm bill
              </Button>
              <input ref={billRef} type="file" multiple accept="image/jpeg,image/png,application/pdf"
                className="hidden" onChange={e => upload(e.target.files, 'BILL')} />
            </>
          )}
        </div>

        {bills.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Chưa có bill nào.</p>
        ) : (
          <div className="space-y-2">
            {bills.map((bill: any) => (
              <div key={bill.id} className="flex items-center gap-3 p-3 border rounded-lg bg-white">
                <div className="bg-orange-50 p-2 rounded-lg">
                  <FileText className="h-5 w-5 text-orange-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{bill.file_name}</p>
                  <p className="text-xs text-gray-400">
                    {bill.uploader.name} · {(bill.file_size / 1024).toFixed(0)} KB
                  </p>
                </div>
                <a href={bill.file_path} target="_blank" rel="noopener noreferrer"
                  className="text-sky-500 hover:text-sky-600">
                  <ExternalLink className="h-4 w-4" />
                </a>
                {isAdmin && (
                  <button onClick={() => deleteMedia(bill.id)} className="text-gray-300 hover:text-red-400">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Manual test**

1. Navigate to destination detail page → Ảnh & Bill tab
2. Upload 2 photos → appear in grid
3. Hover photo → see star (best shot) and delete buttons
4. Mark one as best shot → star icon appears on photo
5. Upload a bill (jpg or pdf) → appears in bills list with filename
6. Delete a photo → removed from grid, file deleted from `/public/uploads/`
7. Try uploading file > 10MB → get error

- [ ] **Step 4: Commit**

```bash
git add app/api/destinations/\[destId\]/media/ app/api/media/ components/destinations/media-tab.tsx
git commit -m "feat: photo and bill upload with local storage and best-shot toggle"
```

---

## Self-Review

**Spec coverage:**
- ✅ Trip CRUD (create, read, update, delete)
- ✅ Day CRUD with auto day_number
- ✅ Destination CRUD with order_index
- ✅ Drag & drop reordering on config page
- ✅ Destination status update (PENDING/DONE/REJECTED)
- ✅ Replace destination — old gets REPLACED, new created
- ✅ Conflict warning for overlapping times
- ✅ Expense CRUD per member per destination
- ✅ Split expense across members
- ✅ Budget estimate vs actual with progress bar colors
- ✅ Feedback upsert (one per user per destination)
- ✅ Feedback summary counts (ok/not_ok/maybe)
- ✅ Photo upload with grid, lightbox-ready
- ✅ Bill upload with list view
- ✅ Best shot toggle
- ✅ File delete removes from disk + DB
- ✅ All API routes check auth + admin role server-side
- ✅ Member-only feedback enforced in API

**No placeholders found.**

**Type consistency:** `session.user.id`, `session.user.role` (via `as any`) consistent across all API routes. `DestStatus`, `MediaType`, `FeedbackStatus` enums from `@prisma/client` used correctly throughout.
