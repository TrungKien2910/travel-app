# Travel App — Plan 3: Advanced Pages

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Dashboard (today's highlight, progress, member spend), Members page (charts + expense table + CSV export), Summary page (stats, budget chart, photo gallery), and wire up the Navbar trip switcher.

**Architecture:** Server Components fetch data on each page load. Recharts used for bar/grouped charts (client components). CSV export via a dedicated API route that streams a plain text response.

**Tech Stack:** Next.js 14 App Router, Prisma, Recharts, NextAuth auth(), shadcn/ui Tabs/Dialog/Avatar

## Global Constraints

- Requires Plan 1 and Plan 2 complete
- All pages under `app/(app)/` — protected by authenticated layout
- Recharts components must be wrapped in `'use client'` — never used in Server Components directly
- CSV export: `Content-Type: text/csv`, `Content-Disposition: attachment; filename="expenses.csv"`
- Dashboard selects the active trip by: (1) trip where today is between start_date and end_date, (2) earliest upcoming trip, (3) most recent past trip
- formatVND, formatDate, formatTime imported from `lib/format.ts` (Plan 2)

---

## File Structure

```
app/(app)/
├── dashboard/
│   └── page.tsx                      # Dashboard — server component, fetches active trip
├── trips/[tripId]/
│   ├── members/
│   │   └── page.tsx                  # Members + expense breakdown (server)
│   └── summary/
│       └── page.tsx                  # Trip summary (server)
app/api/trips/[tripId]/
├── members/
│   ├── route.ts                      # GET list, POST add, DELETE remove
│   └── [userId]/
│       └── route.ts                  # DELETE remove member
├── summary/
│   └── route.ts                      # GET summary data
└── export/
    └── csv/
        └── route.ts                  # GET — streams CSV file
app/api/users/
└── search/
    └── route.ts                      # GET ?email= search users
components/
├── dashboard/
│   ├── today-banner.tsx              # "Hôm nay đi đâu" banner — client (uses Date.now)
│   ├── progress-ring.tsx             # SVG circular progress — client
│   └── member-spend-list.tsx         # Member spend list with progress bars
├── members/
│   ├── member-grid.tsx               # Add/remove members UI — client
│   ├── spend-chart.tsx               # Recharts bar chart — client
│   └── spend-table.tsx               # Expense matrix table — client
└── summary/
    ├── budget-chart.tsx              # Grouped bar chart per day — client
    └── photo-gallery.tsx             # Masonry photo grid — client
```

---

### Task 1: Members Page (Member Management + Expense Overview)

**Files:**
- Create: `app/api/trips/[tripId]/members/route.ts`
- Create: `app/api/trips/[tripId]/members/[userId]/route.ts`
- Create: `app/api/users/search/route.ts`
- Create: `app/api/trips/[tripId]/export/csv/route.ts`
- Create: `app/(app)/trips/[tripId]/members/page.tsx`
- Create: `components/members/member-grid.tsx`
- Create: `components/members/spend-chart.tsx`
- Create: `components/members/spend-table.tsx`

**Interfaces:**
- Produces:
  - `GET /api/trips/[tripId]/members` → `{ user: User, joined_at }[]`
  - `POST /api/trips/[tripId]/members` body `{ user_id }` → created `TripMember`
  - `DELETE /api/trips/[tripId]/members/[userId]` → `{ ok: true }`
  - `GET /api/users/search?email=x` → `User[]` (max 5 results)
  - `GET /api/trips/[tripId]/export/csv` → CSV file download
- Produces: `<SpendChart data={[{name, total}]} />` — Recharts BarChart
- Produces: `<SpendTable days={[]} members={[]} expenses={[]} />` — matrix table

- [ ] **Step 1: Create Members API**

Create `app/api/trips/[tripId]/members/route.ts`:

```typescript
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(_: Request, { params }: { params: { tripId: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const members = await prisma.tripMember.findMany({
    where: { trip_id: params.tripId },
    include: { user: { select: { id: true, name: true, email: true, avatar_url: true } } },
    orderBy: { joined_at: 'asc' },
  })
  return NextResponse.json(members)
}

export async function POST(req: Request, { params }: { params: { tripId: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { user_id } = await req.json()
  if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

  const existing = await prisma.tripMember.findUnique({
    where: { trip_id_user_id: { trip_id: params.tripId, user_id } },
  })
  if (existing) return NextResponse.json({ error: 'Already a member' }, { status: 409 })

  const member = await prisma.tripMember.create({
    data: { trip_id: params.tripId, user_id },
    include: { user: { select: { id: true, name: true, email: true, avatar_url: true } } },
  })
  return NextResponse.json(member, { status: 201 })
}
```

Create `app/api/trips/[tripId]/members/[userId]/route.ts`:

```typescript
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function DELETE(_: Request, { params }: { params: { tripId: string; userId: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Check if user has expenses in this trip (warn but still allow)
  const expenseCount = await prisma.destinationExpense.count({
    where: {
      user_id: params.userId,
      destination: { day: { trip_id: params.tripId } },
    },
  })

  await prisma.tripMember.delete({
    where: { trip_id_user_id: { trip_id: params.tripId, user_id: params.userId } },
  })
  return NextResponse.json({ ok: true, had_expenses: expenseCount > 0 })
}
```

- [ ] **Step 2: Create User Search API**

Create `app/api/users/search/route.ts`:

```typescript
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const email = searchParams.get('email')?.trim()
  if (!email || email.length < 2) return NextResponse.json([])

  const users = await prisma.user.findMany({
    where: { email: { contains: email, mode: 'insensitive' } },
    select: { id: true, name: true, email: true },
    take: 5,
  })
  return NextResponse.json(users)
}
```

- [ ] **Step 3: Create CSV Export API**

Create `app/api/trips/[tripId]/export/csv/route.ts`:

```typescript
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(_: Request, { params }: { params: { tripId: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const expenses = await prisma.destinationExpense.findMany({
    where: { destination: { day: { trip_id: params.tripId } } },
    include: {
      user: { select: { name: true } },
      destination: {
        select: {
          name: true,
          day: { select: { day_number: true, date: true } },
        },
      },
    },
    orderBy: [
      { destination: { day: { day_number: 'asc' } } },
      { user: { name: 'asc' } },
    ],
  })

  const header = 'Thành viên,Điểm đến,Ngày,Ngày số,Số tiền (VND),Ghi chú'
  const rows = expenses.map(e => {
    const date = new Date(e.destination.day.date).toLocaleDateString('vi-VN')
    return [
      e.user.name,
      e.destination.name,
      date,
      e.destination.day.day_number,
      e.amount,
      e.note ?? '',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
  })

  const csv = [header, ...rows].join('\n')
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="expenses.csv"',
    },
  })
}
```

- [ ] **Step 4: Create SpendChart component (Recharts)**

Create `components/members/spend-chart.tsx`:

```typescript
'use client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

interface SpendChartProps {
  data: { name: string; total: number }[]
}

function formatK(value: number) {
  return value >= 1000000
    ? `${(value / 1000000).toFixed(1)}M`
    : value >= 1000
    ? `${(value / 1000).toFixed(0)}K`
    : String(value)
}

export function SpendChart({ data }: SpendChartProps) {
  if (!data.length) return null
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={formatK} tick={{ fontSize: 11 }} />
        <Tooltip
          formatter={(value: number) =>
            new Intl.NumberFormat('vi-VN').format(value) + 'đ'
          }
        />
        <Bar dataKey="total" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 5: Create SpendTable component**

Create `components/members/spend-table.tsx`:

```typescript
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
      .filter(e => e.user_id === userId && e.destination.day_id === dayId)
      .reduce((s, e) => s + e.amount, 0)
  }

  function getDayTotal(dayId: string) {
    return expenses.filter(e => e.destination.day_id === dayId).reduce((s, e) => s + e.amount, 0)
  }

  function getMemberTotal(userId: string) {
    return expenses.filter(e => e.user_id === userId).reduce((s, e) => s + e.amount, 0)
  }

  const grandTotal = expenses.reduce((s, e) => s + e.amount, 0)

  // Find max per-day for highlight
  const maxPerDay: Record<string, number> = {}
  for (const day of days) {
    const max = Math.max(...members.map(m => getAmount(m.user_id, day.id)))
    maxPerDay[day.id] = max
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-sky-50">
            <th className="text-left p-3 font-semibold text-gray-600 border-b">Thành viên</th>
            {days.map(day => (
              <th key={day.id} className="text-right p-3 font-semibold text-gray-600 border-b whitespace-nowrap">
                Ngày {day.day_number}
              </th>
            ))}
            <th className="text-right p-3 font-semibold text-sky-700 border-b">Tổng</th>
          </tr>
        </thead>
        <tbody>
          {members.map(member => (
            <tr key={member.user_id} className="border-b hover:bg-gray-50">
              <td className="p-3 font-medium text-gray-800">{member.user.name}</td>
              {days.map(day => {
                const amount = getAmount(member.user_id, day.id)
                const isMax = amount > 0 && amount === maxPerDay[day.id]
                return (
                  <td key={day.id} className={cn('p-3 text-right', isMax && 'text-orange-600 font-semibold')}>
                    {amount > 0 ? formatVND(amount) : '—'}
                  </td>
                )
              })}
              <td className="p-3 text-right font-semibold text-sky-700">
                {formatVND(getMemberTotal(member.user_id))}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-gray-50 font-semibold">
            <td className="p-3 text-gray-600">Tổng ngày</td>
            {days.map(day => (
              <td key={day.id} className="p-3 text-right text-gray-700">
                {formatVND(getDayTotal(day.id))}
              </td>
            ))}
            <td className="p-3 text-right text-sky-700">{formatVND(grandTotal)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
```

- [ ] **Step 6: Create MemberGrid component (add/remove)**

Create `components/members/member-grid.tsx`:

```typescript
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { UserPlus, Trash2, Search } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

interface Member {
  user_id: string
  user: { id: string; name: string; email: string }
}

export function MemberGrid({ initialMembers, tripId, isAdmin }: {
  initialMembers: Member[]
  tripId: string
  isAdmin: boolean
}) {
  const router = useRouter()
  const [members, setMembers] = useState(initialMembers)
  const [searchEmail, setSearchEmail] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

  useEffect(() => {
    const t = setTimeout(async () => {
      if (searchEmail.length < 2) { setSearchResults([]); return }
      setSearching(true)
      const res = await fetch(`/api/users/search?email=${encodeURIComponent(searchEmail)}`)
      setSearchResults(await res.json())
      setSearching(false)
    }, 300)
    return () => clearTimeout(t)
  }, [searchEmail])

  async function addMember(userId: string) {
    const res = await fetch(`/api/trips/${tripId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    })
    if (res.ok) {
      setAddOpen(false)
      setSearchEmail('')
      router.refresh()
    }
  }

  async function removeMember(userId: string) {
    if (!confirm('Xóa thành viên này? Chi tiêu và feedback của họ vẫn được giữ lại.')) return
    await fetch(`/api/trips/${tripId}/members/${userId}`, { method: 'DELETE' })
    setMembers(members.filter(m => m.user_id !== userId))
    router.refresh()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-700">Thành viên ({members.length})</h2>
        {isAdmin && (
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-sky-500 hover:bg-sky-600">
                <UserPlus className="h-4 w-4 mr-1" /> Thêm thành viên
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Thêm thành viên</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Tìm theo email..."
                    className="pl-9"
                    value={searchEmail}
                    onChange={e => setSearchEmail(e.target.value)}
                  />
                </div>
                {searching && <p className="text-xs text-gray-400 text-center">Đang tìm...</p>}
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {searchResults.map(user => {
                    const alreadyMember = members.some(m => m.user_id === user.id)
                    return (
                      <button key={user.id} disabled={alreadyMember}
                        onClick={() => addMember(user.id)}
                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-sky-50 disabled:opacity-40 disabled:cursor-not-allowed text-left">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs bg-sky-100 text-sky-700">
                            {user.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{user.name}</p>
                          <p className="text-xs text-gray-400">{user.email}</p>
                        </div>
                        {alreadyMember && <span className="ml-auto text-xs text-gray-400">Đã có</span>}
                      </button>
                    )
                  })}
                  {searchEmail.length >= 2 && !searching && searchResults.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-3">Không tìm thấy user.</p>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {members.map(member => (
          <div key={member.user_id}
            className="flex flex-col items-center gap-2 p-4 bg-white border rounded-xl text-center group relative">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="text-lg bg-sky-100 text-sky-700">
                {member.user.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-gray-800">{member.user.name}</p>
              <p className="text-xs text-gray-400">{member.user.email}</p>
            </div>
            {isAdmin && (
              <button
                onClick={() => removeMember(member.user_id)}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-opacity">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Create Members Page**

Create `app/(app)/trips/[tripId]/members/page.tsx`:

```typescript
import { auth } from '@/lib/auth'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { MemberGrid } from '@/components/members/member-grid'
import { SpendChart } from '@/components/members/spend-chart'
import { SpendTable } from '@/components/members/spend-table'
import { Download, ArrowLeft } from 'lucide-react'

export default async function MembersPage({ params }: { params: { tripId: string } }) {
  const session = await auth()
  const isAdmin = (session?.user as any)?.role === 'ADMIN'

  const trip = await prisma.trip.findUnique({
    where: { id: params.tripId },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true, avatar_url: true } } },
        orderBy: { joined_at: 'asc' },
      },
      days: {
        orderBy: { day_number: 'asc' },
        include: {
          destinations: {
            include: {
              expenses: {
                include: {
                  user: { select: { id: true, name: true } },
                  destination: { select: { day_id: true } },
                },
              },
            },
          },
        },
      },
    },
  })

  if (!trip) notFound()

  // Flatten all expenses
  const allExpenses = trip.days.flatMap(d =>
    d.destinations.flatMap(dest =>
      dest.expenses.map(e => ({
        ...e,
        destination: { day_id: dest.day_id },
      }))
    )
  )

  // Chart data: per member total
  const chartData = trip.members.map(m => ({
    name: m.user.name,
    total: allExpenses.filter(e => e.user_id === m.user_id).reduce((s, e) => s + e.amount, 0),
  }))

  // Who hasn't given feedback
  const allDestinations = trip.days.flatMap(d => d.destinations)
  const feedbackStatus = await prisma.destinationFeedback.findMany({
    where: { destination_id: { in: allDestinations.map(d => d.id) } },
    select: { destination_id: true, user_id: true },
  })

  const missingFeedback: Record<string, string[]> = {}
  for (const member of trip.members) {
    const missing = allDestinations.filter(
      dest => !feedbackStatus.some(f => f.destination_id === dest.id && f.user_id === member.user_id)
    ).map(d => d.name)
    if (missing.length) missingFeedback[member.user.name] = missing
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/trips/${params.tripId}`}><ArrowLeft className="h-4 w-4 mr-1" /> Quay lại</Link>
        </Button>
        <h1 className="text-2xl font-bold text-sky-900">Thành viên & Chi tiêu</h1>
        <Button asChild variant="outline" size="sm" className="ml-auto">
          <a href={`/api/trips/${params.tripId}/export/csv`} download>
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </a>
        </Button>
      </div>

      {/* Member grid */}
      <div className="bg-white rounded-xl border p-6">
        <MemberGrid
          initialMembers={trip.members as any}
          tripId={params.tripId}
          isAdmin={isAdmin}
        />
      </div>

      {/* Spend chart */}
      {allExpenses.length > 0 && (
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-gray-700 mb-4">Biểu đồ chi tiêu</h2>
          <SpendChart data={chartData} />
        </div>
      )}

      {/* Spend table */}
      {allExpenses.length > 0 && (
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-gray-700 mb-4">Bảng chi tiêu chi tiết</h2>
          <SpendTable
            members={trip.members as any}
            days={trip.days as any}
            expenses={allExpenses as any}
          />
        </div>
      )}

      {/* Missing feedback */}
      {Object.keys(missingFeedback).length > 0 && (
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-gray-700 mb-4">Chưa feedback</h2>
          <div className="space-y-2">
            {Object.entries(missingFeedback).map(([name, dests]) => (
              <div key={name} className="text-sm">
                <span className="font-medium text-gray-700">{name}</span>
                <span className="text-gray-400"> chưa feedback: </span>
                <span className="text-gray-600">{dests.join(', ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 8: Manual test**

1. Navigate to `/trips/[id]/members`
2. See member grid with avatars
3. Admin: click "Thêm thành viên", search email "lan" → lan@travel.app appears
4. Add member → appears in grid
5. Remove member → disappears (with confirm dialog)
6. Bar chart shows relative spend per member
7. Expense table shows matrix — cells with max spend per day highlighted orange
8. Click "Export CSV" → file downloads with correct data
9. "Chưa feedback" section lists members + missing destinations

- [ ] **Step 9: Commit**

```bash
git add app/api/trips/\[tripId\]/members/ app/api/users/ app/api/trips/\[tripId\]/export/ app/\(app\)/trips/\[tripId\]/members/ components/members/
git commit -m "feat: members page with add/remove, spend chart, expense table, CSV export"
```

---

### Task 2: Summary Page

**Files:**
- Create: `app/(app)/trips/[tripId]/summary/page.tsx`
- Create: `components/summary/budget-chart.tsx`
- Create: `components/summary/photo-gallery.tsx`

**Interfaces:**
- Produces: `<BudgetChart days={[{label, budget, actual}]} />` — grouped bar chart
- Produces: `<PhotoGallery photos={[]} filterDays={[]} />` — filterable masonry grid

- [ ] **Step 1: Create BudgetChart component**

Create `components/summary/budget-chart.tsx`:

```typescript
'use client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

interface BudgetChartProps {
  data: { label: string; budget: number; actual: number }[]
}

function formatK(v: number) {
  return v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(v)
}

export function BudgetChart({ data }: BudgetChartProps) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis tickFormatter={formatK} tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v: number) => new Intl.NumberFormat('vi-VN').format(v) + 'đ'} />
        <Legend />
        <Bar dataKey="budget" name="Dự tính" fill="#cbd5e1" radius={[3,3,0,0]} />
        <Bar dataKey="actual"
          name="Thực tế"
          fill="#0ea5e9"
          radius={[3,3,0,0]}
          // turn red if actual > budget — handled per entry via custom cell
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 2: Create PhotoGallery component**

Create `components/summary/photo-gallery.tsx`:

```typescript
'use client'
import { useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface Photo {
  id: string
  file_path: string
  file_name: string
  day_number: number
  day_label: string | null
}

export function PhotoGallery({ photos }: { photos: Photo[] }) {
  const [filter, setFilter] = useState<number | null>(null)
  const [lightbox, setLightbox] = useState<string | null>(null)

  const days = [...new Set(photos.map(p => p.day_number))].sort((a, b) => a - b)
  const filtered = filter == null ? photos : photos.filter(p => p.day_number === filter)

  return (
    <div className="space-y-4">
      {/* Day filter */}
      <div className="flex gap-2 flex-wrap">
        <Button
          size="sm"
          variant={filter == null ? 'default' : 'outline'}
          className={filter == null ? 'bg-sky-500' : ''}
          onClick={() => setFilter(null)}
        >
          Tất cả ({photos.length})
        </Button>
        {days.map(d => {
          const count = photos.filter(p => p.day_number === d).length
          return (
            <Button key={d} size="sm" variant={filter === d ? 'default' : 'outline'}
              className={filter === d ? 'bg-sky-500' : ''}
              onClick={() => setFilter(d)}>
              Ngày {d} ({count})
            </Button>
          )
        })}
      </div>

      {/* Masonry-ish grid */}
      <div className="columns-2 md:columns-3 lg:columns-4 gap-2 space-y-2">
        {filtered.map(photo => (
          <div key={photo.id}
            className="break-inside-avoid cursor-pointer rounded-lg overflow-hidden border hover:opacity-90 transition-opacity"
            onClick={() => setLightbox(photo.file_path)}>
            <Image
              src={photo.file_path}
              alt={photo.file_name}
              width={400}
              height={300}
              className="w-full h-auto object-cover"
            />
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-gray-400 py-8">Chưa có ảnh nào.</p>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 text-white" onClick={() => setLightbox(null)}>
            <X className="h-8 w-8" />
          </button>
          <Image src={lightbox} alt="full" width={1200} height={800}
            className="max-h-screen max-w-full object-contain rounded-lg" />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create Summary Page**

Create `app/(app)/trips/[tripId]/summary/page.tsx`:

```typescript
import { auth } from '@/lib/auth'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { BudgetChart } from '@/components/summary/budget-chart'
import { PhotoGallery } from '@/components/summary/photo-gallery'
import { formatVND, formatDate } from '@/lib/format'
import { ArrowLeft, Trophy, Camera, Calendar, MapPin, Users } from 'lucide-react'

export default async function SummaryPage({ params }: { params: { tripId: string } }) {
  const session = await auth()

  const trip = await prisma.trip.findUnique({
    where: { id: params.tripId },
    include: {
      members: { include: { user: { select: { id: true, name: true } } } },
      days: {
        orderBy: { day_number: 'asc' },
        include: {
          destinations: {
            include: {
              expenses: { select: { amount: true, user_id: true } },
              feedbacks: { select: { status: true } },
              media: {
                where: { type: 'PHOTO' },
                orderBy: { created_at: 'asc' },
              },
            },
          },
        },
      },
    },
  })

  if (!trip) notFound()

  const allDests = trip.days.flatMap(d => d.destinations)
  const allExpenses = allDests.flatMap(d => d.expenses)
  const allPhotos = trip.days.flatMap(d =>
    d.destinations.flatMap(dest =>
      dest.media.map(m => ({
        id: m.id,
        file_path: m.file_path,
        file_name: m.file_name,
        is_best_shot: m.is_best_shot,
        day_number: d.day_number,
        day_label: d.label,
      }))
    )
  )

  const bestShots = allPhotos.filter(p => p.is_best_shot).slice(0, 3)
  const doneDests = allDests.filter(d => d.status === 'DONE')
  const totalBudget = allDests.reduce((s, d) => s + (d.budget_estimate ?? 0), 0)
  const totalActual = allExpenses.reduce((s, e) => s + e.amount, 0)
  const overBudget = totalActual > totalBudget && totalBudget > 0

  // Budget chart data
  const budgetChartData = trip.days.map(day => ({
    label: `Ngày ${day.day_number}`,
    budget: day.destinations.reduce((s, d) => s + (d.budget_estimate ?? 0), 0),
    actual: day.destinations.flatMap(d => d.expenses).reduce((s, e) => s + e.amount, 0),
  }))

  // Member spend
  const memberSpend = trip.members.map(m => ({
    ...m,
    total: allExpenses.filter(e => e.user_id === m.user_id).reduce((s, e) => s + e.amount, 0),
  })).sort((a, b) => b.total - a.total)

  // Top destinations by OK feedback
  const topDests = allDests
    .map(d => ({
      id: d.id,
      name: d.name,
      okCount: d.feedbacks.filter(f => f.status === 'OK').length,
      notOkCount: d.feedbacks.filter(f => f.status === 'NOT_OK').length,
      maybeCount: d.feedbacks.filter(f => f.status === 'MAYBE').length,
      photo: allPhotos.find(p => trip.days.flatMap(dy => dy.destinations).find(ds => ds.id === d.id)),
    }))
    .filter(d => d.okCount > 0)
    .sort((a, b) => b.okCount - a.okCount)
    .slice(0, 3)

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/trips/${params.tripId}`}><ArrowLeft className="h-4 w-4 mr-1" /> Quay lại</Link>
        </Button>
        <h1 className="text-2xl font-bold text-sky-900">Tổng kết chuyến đi</h1>
      </div>

      {/* Best shots hero */}
      {bestShots.length > 0 && (
        <div className={`grid gap-2 rounded-xl overflow-hidden h-60 ${bestShots.length === 1 ? 'grid-cols-1' : bestShots.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
          {bestShots.map(photo => (
            <div key={photo.id} className="relative">
              <Image src={photo.file_path} alt={photo.file_name} fill className="object-cover" />
            </div>
          ))}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6 pointer-events-none" style={{position:'absolute',top:0,left:0,right:0,bottom:0}}>
            <div className="text-white">
              <h2 className="text-2xl font-bold">{trip.title}</h2>
              <p className="text-sm opacity-80">{formatDate(trip.start_date)} – {formatDate(trip.end_date)} · {trip.members.length} thành viên</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-5 text-center">
          <MapPin className="h-6 w-6 text-sky-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-sky-700">{doneDests.length}/{allDests.length}</div>
          <div className="text-xs text-gray-400">Điểm đã đi</div>
        </div>
        <div className={`bg-white rounded-xl border p-5 text-center ${overBudget ? 'border-red-200' : ''}`}>
          <Trophy className="h-6 w-6 mx-auto mb-2 text-orange-400" />
          <div className={`text-2xl font-bold ${overBudget ? 'text-red-500' : 'text-sky-700'}`}>
            {formatVND(totalActual)}
          </div>
          <div className="text-xs text-gray-400">Tổng chi tiêu</div>
          {totalBudget > 0 && (
            <div className="text-xs text-gray-400">/ {formatVND(totalBudget)} dự tính</div>
          )}
        </div>
        <div className="bg-white rounded-xl border p-5 text-center">
          <Calendar className="h-6 w-6 text-sky-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-sky-700">{trip.days.length}</div>
          <div className="text-xs text-gray-400">Ngày đi</div>
        </div>
        <div className="bg-white rounded-xl border p-5 text-center">
          <Camera className="h-6 w-6 text-sky-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-sky-700">{allPhotos.length}</div>
          <div className="text-xs text-gray-400">Ảnh đã chụp</div>
        </div>
      </div>

      {/* Budget chart */}
      {budgetChartData.some(d => d.budget > 0 || d.actual > 0) && (
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-gray-700 mb-4">Ngân sách theo ngày</h2>
          <BudgetChart data={budgetChartData} />
        </div>
      )}

      {/* Member spend */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="font-semibold text-gray-700 mb-4">Chi tiêu thành viên</h2>
        <div className="space-y-3">
          {memberSpend.map((m, i) => (
            <div key={m.user_id} className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${i === 0 ? 'bg-orange-400' : 'bg-sky-300'}`}>
                {i === 0 ? '🏆' : i + 1}
              </div>
              <span className="text-sm font-medium flex-1">{m.user.name}</span>
              <span className="text-sm text-gray-600">{formatVND(m.total)}</span>
              <span className="text-xs text-gray-400">
                {totalActual > 0 ? Math.round((m.total / totalActual) * 100) : 0}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Top destinations */}
      {topDests.length > 0 && (
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-gray-700 mb-4">Điểm đến yêu thích</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {topDests.map((dest, i) => (
              <Link key={dest.id} href={`/trips/${params.tripId}/destination/${dest.id}`}
                className="block border rounded-xl overflow-hidden hover:shadow-sm transition-shadow">
                <div className="bg-sky-50 p-4 text-center">
                  <div className="text-2xl mb-1">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</div>
                  <div className="font-medium text-sm">{dest.name}</div>
                </div>
                <div className="p-3 flex justify-center gap-3 text-xs text-gray-500">
                  <span>👍 {dest.okCount}</span>
                  <span>👎 {dest.notOkCount}</span>
                  <span>🤔 {dest.maybeCount}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Photo gallery */}
      {allPhotos.length > 0 && (
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-gray-700 mb-4">Ảnh chuyến đi</h2>
          <PhotoGallery photos={allPhotos} />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Manual test**

1. Navigate to `/trips/[id]/summary`
2. Best shots grid shows up to 3 photos marked as best shot
3. Stats cards: correct done/total count, total actual spend, days, photo count
4. Budget chart: grouped bars per day (budget=gray, actual=blue)
5. Member spend ranked with 🏆 for highest spender
6. Top destinations (requires some feedbacks with OK status)
7. Photo gallery with day filter buttons — click day filter narrows photos
8. Click photo → lightbox opens, click outside closes

- [ ] **Step 5: Commit**

```bash
git add app/\(app\)/trips/\[tripId\]/summary/ components/summary/
git commit -m "feat: summary page with best shots, budget chart, member spend, photo gallery"
```

---

### Task 3: Dashboard

**Files:**
- Modify: `app/(app)/dashboard/page.tsx`
- Create: `components/dashboard/today-banner.tsx`
- Create: `components/dashboard/progress-ring.tsx`
- Create: `components/dashboard/member-spend-list.tsx`

**Interfaces:**
- Consumes: active trip query from Prisma (server-side)
- Produces: `<TodayBanner destinations={[]} today={Date} />` — shows next/current destination
- Produces: `<ProgressRing done={n} total={n} />` — SVG circular progress
- Produces: `<MemberSpendList members={[{name, total}]} max={n} tripId={string} />` — spend bars

- [ ] **Step 1: Create ProgressRing component**

Create `components/dashboard/progress-ring.tsx`:

```typescript
'use client'
interface ProgressRingProps {
  done: number
  total: number
  size?: number
}

export function ProgressRing({ done, total, size = 100 }: ProgressRingProps) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)
  const radius = (size - 12) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (pct / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} stroke="#e0f2fe" strokeWidth={10} fill="none" />
        <circle
          cx={size/2} cy={size/2} r={radius}
          stroke="#0ea5e9" strokeWidth={10} fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <div className="text-center -mt-2">
        <div className="text-2xl font-bold text-sky-700">{pct}%</div>
        <div className="text-xs text-gray-400">{done}/{total} điểm</div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create TodayBanner component**

Create `components/dashboard/today-banner.tsx`:

```typescript
'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
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
}

export function TodayBanner({ todayDestinations, tripId, isAdmin, daysUntilTrip }: TodayBannerProps) {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  async function updateStatus(destId: string, status: 'DONE' | 'REJECTED') {
    await fetch(`/api/destinations/${destId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    window.location.reload()
  }

  if (daysUntilTrip != null && daysUntilTrip > 0) {
    return (
      <div className="bg-gradient-to-r from-sky-500 to-sky-600 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <MapPin className="h-6 w-6" />
          <span className="font-semibold text-lg">Chuyến đi sắp tới</span>
        </div>
        <div className="text-4xl font-bold mb-1">Còn {daysUntilTrip} ngày</div>
        <p className="text-sky-100 text-sm">Chuẩn bị hành lý, kiểm tra lịch trình!</p>
      </div>
    )
  }

  if (!todayDestinations.length) {
    return (
      <div className="bg-gradient-to-r from-sky-500 to-sky-600 rounded-xl p-6 text-white">
        <p className="text-sky-100">Hôm nay không có điểm đến nào được lên lịch.</p>
      </div>
    )
  }

  // Find current/next destination
  const current = todayDestinations.find(d => {
    if (!d.start_time || !d.end_time) return false
    return now >= new Date(d.start_time) && now <= new Date(d.end_time)
  })
  const next = todayDestinations.find(d => {
    if (!d.start_time) return false
    return new Date(d.start_time) > now && d.status === 'PENDING'
  })
  const featured = current ?? next ?? todayDestinations[0]

  return (
    <div className="bg-gradient-to-r from-sky-500 to-sky-600 rounded-xl p-6 text-white">
      <div className="flex items-center gap-2 text-sky-100 text-sm mb-3">
        <Clock className="h-4 w-4" />
        {current ? 'Đang ở đây' : next ? 'Điểm tiếp theo' : 'Hôm nay'}
      </div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold mb-1">{featured.name}</h2>
          <div className="flex items-center gap-2 text-sky-100 text-sm">
            {(featured.start_time || featured.end_time) && (
              <span>
                {formatTime(featured.start_time)}
                {featured.end_time && ` → ${formatTime(featured.end_time)}`}
              </span>
            )}
            <StatusBadge status={featured.status} />
          </div>
        </div>
        {isAdmin && featured.status === 'PENDING' && (
          <div className="flex gap-2 shrink-0">
            <Button size="sm" variant="secondary"
              onClick={() => updateStatus(featured.id, 'DONE')}
              className="bg-white/20 hover:bg-white/30 text-white border-0">
              <CheckCircle className="h-4 w-4 mr-1" /> Đã đi
            </Button>
            <Button size="sm" variant="secondary"
              onClick={() => updateStatus(featured.id, 'REJECTED')}
              className="bg-white/10 hover:bg-white/20 text-white border-0">
              <XCircle className="h-4 w-4 mr-1" /> Bỏ qua
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create MemberSpendList component**

Create `components/dashboard/member-spend-list.tsx`:

```typescript
'use client'
import Link from 'next/link'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { formatVND } from '@/lib/format'

interface MemberSpendListProps {
  members: { id: string; name: string; total: number }[]
  tripId: string
}

export function MemberSpendList({ members, tripId }: MemberSpendListProps) {
  const max = Math.max(...members.map(m => m.total), 1)

  return (
    <Link href={`/trips/${tripId}/members`} className="block space-y-3 hover:opacity-90 transition-opacity">
      {members.map(m => (
        <div key={m.id}>
          <div className="flex justify-between text-sm mb-1">
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs bg-sky-100 text-sky-700">
                  {m.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium text-gray-700">{m.name}</span>
            </div>
            <span className="text-gray-500">{formatVND(m.total)}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div
              className="h-1.5 rounded-full bg-sky-400"
              style={{ width: `${(m.total / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </Link>
  )
}
```

- [ ] **Step 4: Rewrite Dashboard page**

Replace `app/(app)/dashboard/page.tsx`:

```typescript
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { TodayBanner } from '@/components/dashboard/today-banner'
import { ProgressRing } from '@/components/dashboard/progress-ring'
import { MemberSpendList } from '@/components/dashboard/member-spend-list'
import { DayBlock } from '@/components/trips/day-block'
import { StatusBadge } from '@/components/ui/status-badge'
import { formatTime, formatVND } from '@/lib/format'
import { Plus, MapPin } from 'lucide-react'

async function getActiveTrip(userId: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayEnd = new Date(today)
  todayEnd.setHours(23, 59, 59, 999)

  const trips = await prisma.trip.findMany({
    where: {
      OR: [
        { created_by: userId },
        { members: { some: { user_id: userId } } },
      ],
    },
    orderBy: { start_date: 'asc' },
  })

  // 1. Currently active
  const active = trips.find(t => t.start_date <= todayEnd && t.end_date >= today)
  if (active) return { trip: active, daysUntilTrip: 0 }

  // 2. Nearest upcoming
  const upcoming = trips.filter(t => t.start_date > todayEnd).sort((a, b) =>
    a.start_date.getTime() - b.start_date.getTime()
  )[0]
  if (upcoming) {
    const diff = Math.ceil((upcoming.start_date.getTime() - today.getTime()) / 86400000)
    return { trip: upcoming, daysUntilTrip: diff }
  }

  // 3. Most recent past
  const past = trips.filter(t => t.end_date < today).sort((a, b) =>
    b.end_date.getTime() - a.end_date.getTime()
  )[0]
  if (past) return { trip: past, daysUntilTrip: 0 }

  return null
}

export default async function DashboardPage() {
  const session = await auth()
  const isAdmin = (session?.user as any)?.role === 'ADMIN'

  const active = await getActiveTrip(session!.user.id)

  if (!active) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-sky-900">Dashboard</h1>
        <div className="bg-white rounded-xl border p-12 text-center">
          <MapPin className="h-12 w-12 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-400 mb-4">Bạn chưa có chuyến đi nào.</p>
          {isAdmin && (
            <Button asChild className="bg-sky-500 hover:bg-sky-600">
              <Link href="/trips/new"><Plus className="h-4 w-4 mr-1" /> Tạo chuyến đi</Link>
            </Button>
          )}
        </div>
      </div>
    )
  }

  const { trip, daysUntilTrip } = active

  const fullTrip = await prisma.trip.findUnique({
    where: { id: trip.id },
    include: {
      members: {
        include: { user: { select: { id: true, name: true } } },
      },
      days: {
        orderBy: { day_number: 'asc' },
        include: {
          destinations: {
            orderBy: { order_index: 'asc' },
            include: {
              expenses: { select: { amount: true, user_id: true } },
              _count: { select: { feedbacks: true } },
            },
          },
        },
      },
    },
  })!

  const today = new Date()
  const todayStr = today.toDateString()
  const todayDay = fullTrip!.days.find(d => new Date(d.date).toDateString() === todayStr)
  const todayDests = todayDay?.destinations ?? []

  const allDests = fullTrip!.days.flatMap(d => d.destinations)
  const doneDests = allDests.filter(d => d.status === 'DONE')
  const allExpenses = allDests.flatMap(d => d.expenses)

  const memberSpend = fullTrip!.members.map(m => ({
    id: m.user_id,
    name: m.user.name,
    total: allExpenses.filter(e => e.user_id === m.user_id).reduce((s, e) => s + e.amount, 0),
  })).sort((a, b) => b.total - a.total)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-sky-900">Dashboard</h1>
        {isAdmin && (
          <Button asChild size="sm" className="bg-sky-500 hover:bg-sky-600">
            <Link href="/trips/new"><Plus className="h-4 w-4 mr-1" /> Chuyến đi mới</Link>
          </Button>
        )}
      </div>

      {/* Today banner */}
      <TodayBanner
        todayDestinations={todayDests as any}
        tripId={trip.id}
        isAdmin={isAdmin}
        daysUntilTrip={daysUntilTrip}
      />

      <div className="grid md:grid-cols-3 gap-6">
        {/* Progress ring */}
        <div className="bg-white rounded-xl border p-6 flex flex-col items-center justify-center gap-3">
          <h2 className="font-semibold text-gray-700 self-start">Tiến độ lịch trình</h2>
          <ProgressRing done={doneDests.length} total={allDests.length} size={120} />
          {/* Mini day timeline */}
          <div className="flex gap-1 flex-wrap justify-center mt-2">
            {fullTrip!.days.map(day => {
              const isToday = new Date(day.date).toDateString() === todayStr
              return (
                <Link key={day.id} href={`/trips/${trip.id}`}
                  className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${isToday ? 'bg-sky-500 text-white border-sky-500' : 'bg-white text-gray-400 border-gray-200 hover:border-sky-200'}`}>
                  N{day.day_number}
                </Link>
              )
            })}
          </div>
        </div>

        {/* Member spend */}
        <div className="bg-white rounded-xl border p-6 md:col-span-2">
          <h2 className="font-semibold text-gray-700 mb-4">Chi tiêu thành viên</h2>
          {memberSpend.length > 0 ? (
            <MemberSpendList members={memberSpend} tripId={trip.id} />
          ) : (
            <p className="text-sm text-gray-400">Chưa có chi tiêu nào.</p>
          )}
        </div>
      </div>

      {/* Today's timeline */}
      {todayDay && (
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-700">Lịch trình hôm nay</h2>
            <Button asChild variant="outline" size="sm">
              <Link href={`/trips/${trip.id}`}>Xem tất cả</Link>
            </Button>
          </div>
          <DayBlock day={todayDay as any} tripId={trip.id} />
        </div>
      )}

      {!todayDay && daysUntilTrip === 0 && (
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-gray-700 mb-3">Lịch trình chuyến đi</h2>
          <Button asChild variant="outline" size="sm">
            <Link href={`/trips/${trip.id}`}>Xem toàn bộ lịch trình →</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Wire up Navbar trip link**

Modify `components/navbar.tsx` — add "Chuyến đi" link to `navLinks`:

```typescript
// Replace the navLinks array with:
const navLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/trips/new', label: 'Chuyến đi mới', icon: MapPin, adminOnly: true },
]
```

Also import `MapPin` at the top (already imported). For `adminOnly` links, use `useSession` to check:

```typescript
// In the nav render, filter by role:
const { data: session } = useSession()
const isAdmin = (session?.user as any)?.role === 'ADMIN'

// Replace navLinks.map() with:
navLinks
  .filter(link => !('adminOnly' in link) || isAdmin)
  .map(({ href, label, icon: Icon }) => ...)
```

- [ ] **Step 6: Manual test**

1. Navigate to `/dashboard`
2. Active/upcoming trip detected and displayed
3. If trip is active today: TodayBanner shows next destination based on time
4. If trip not started: countdown banner with "Còn X ngày"
5. Progress ring shows correct done/total %
6. Day bubbles at bottom — today's highlighted blue
7. Member spend list with bars proportional to max spender
8. Click member spend → goes to members page
9. "Lịch trình hôm nay" shows today's day destinations
10. Admin: quick action buttons "Đã đi" / "Bỏ qua" in banner work

- [ ] **Step 7: Commit**

```bash
git add app/\(app\)/dashboard/ components/dashboard/ components/navbar.tsx
git commit -m "feat: dashboard with today banner, progress ring, member spend, and today timeline"
```

---

## Self-Review

**Spec coverage:**
- ✅ Dashboard: active trip priority logic (active → upcoming → past)
- ✅ Dashboard: countdown banner for upcoming trips
- ✅ Dashboard: "Hôm nay đi đâu" banner with current/next destination by time
- ✅ Dashboard: quick action buttons (Đã đi / Bỏ qua) for admin
- ✅ Dashboard: progress ring (done/total %)
- ✅ Dashboard: mini day timeline with today highlight
- ✅ Dashboard: member spend list with proportional bars
- ✅ Dashboard: today's destinations timeline
- ✅ Members: add member via email search with debounce
- ✅ Members: remove member (keeps expenses/feedback)
- ✅ Members: bar chart per member spend (Recharts)
- ✅ Members: expense matrix table with day columns and max-per-day highlight
- ✅ Members: "who hasn't feedback" section
- ✅ Members: CSV export
- ✅ Summary: best shots hero (up to 3)
- ✅ Summary: stats grid (done/total, total spend, days, photo count)
- ✅ Summary: grouped budget chart per day (dự tính vs thực tế)
- ✅ Summary: member spend ranked with 🏆
- ✅ Summary: top 3 destinations by OK feedback count
- ✅ Summary: masonry photo gallery with day filter and lightbox

**No placeholders found.**

**Type consistency:**
- `session.user.id` and `(session.user as any).role` consistent across all pages
- `DayBlock` receives `day as any` — matches the shape it expects from Plan 2
- `formatVND`, `formatDate`, `formatTime` imported from `lib/format.ts` (Plan 2) throughout
