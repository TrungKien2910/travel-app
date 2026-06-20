# Travel App — Plan 1: Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the Next.js project, configure PostgreSQL + Prisma schema, set up NextAuth.js authentication, and build the shared layout/navbar — producing a working login flow and authenticated shell.

**Architecture:** Next.js 14 App Router monorepo. Prisma manages DB schema and migrations. NextAuth handles credential-based auth with JWT sessions. All pages share a root layout with sticky navbar.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, Prisma, PostgreSQL, NextAuth.js v5, bcryptjs

## Global Constraints

- Node.js >= 18
- Next.js 14 App Router (not Pages Router) — all routes under `app/`
- TypeScript strict mode
- Tailwind CSS + shadcn/ui for all UI components — no custom CSS files
- Primary color: `#0ea5e9` (sky-500), Accent: `#f97316` (orange-500), Background: `#f0f9ff` (sky-50)
- Font: Inter from Google Fonts
- All API routes check auth server-side — never trust client-only guards
- Admin role check: `session.user.role === 'ADMIN'`
- File: `prisma/schema.prisma` is the single source of truth for DB shape

---

## File Structure

```
d:\travel\
├── app/
│   ├── layout.tsx                  # Root layout — font, global styles, SessionProvider
│   ├── page.tsx                    # Root redirect → /dashboard or /login
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx            # Login page UI
│   ├── (app)/
│   │   ├── layout.tsx              # Authenticated layout — Navbar + content wrapper
│   │   └── dashboard/
│   │       └── page.tsx            # Dashboard placeholder (Plan 3)
├── components/
│   ├── navbar.tsx                  # Top sticky navbar, responsive hamburger
│   └── providers.tsx               # SessionProvider wrapper
├── lib/
│   ├── auth.ts                     # NextAuth config — credentials provider, callbacks
│   ├── prisma.ts                   # Prisma client singleton
│   └── utils.ts                    # cn() helper (shadcn standard)
├── prisma/
│   ├── schema.prisma               # Full DB schema
│   └── seed.ts                     # Seed: 1 admin + 2 viewer users
├── app/api/
│   └── auth/
│       └── [...nextauth]/
│           └── route.ts            # NextAuth route handler
├── middleware.ts                   # Redirect unauthenticated users to /login
├── .env.local                      # DATABASE_URL, NEXTAUTH_SECRET (gitignored)
├── tailwind.config.ts              # Custom colors + Inter font
└── components.json                 # shadcn/ui config
```

---

### Task 1: Project Scaffold + Dependencies

**Files:**
- Create: `package.json` (via CLI)
- Create: `tailwind.config.ts`
- Create: `components.json`
- Create: `.env.local`
- Create: `lib/utils.ts`

**Interfaces:**
- Produces: working Next.js dev server at `http://localhost:3000`

- [ ] **Step 1: Scaffold Next.js project**

```bash
cd d:\travel
npx create-next-app@14 . --typescript --tailwind --eslint --app --src-dir=no --import-alias="@/*"
```

When prompted:
- Use src directory? → No
- Use App Router? → Yes
- Customize import alias? → Yes, `@/*`

- [ ] **Step 2: Install core dependencies**

```bash
npm install prisma @prisma/client next-auth@beta bcryptjs
npm install -D @types/bcryptjs
npm install recharts dnd-kit @dnd-kit/sortable @dnd-kit/utilities
```

- [ ] **Step 3: Init shadcn/ui**

```bash
npx shadcn@latest init
```

When prompted: style=default, base color=sky, CSS variables=yes.

- [ ] **Step 4: Add required shadcn components**

```bash
npx shadcn@latest add button input label card badge avatar progress tabs dialog dropdown-menu sheet separator skeleton toast
```

- [ ] **Step 5: Configure Tailwind with custom colors and Inter font**

Replace `tailwind.config.ts`:

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#0ea5e9', foreground: '#ffffff' },
        accent:  { DEFAULT: '#f97316', foreground: '#ffffff' },
        success: '#22c55e',
        danger:  '#ef4444',
        warning: '#eab308',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      maxWidth: {
        content: '1200px',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
export default config
```

- [ ] **Step 6: Add Inter font to root layout**

Replace `app/layout.tsx`:

```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Travel App',
  description: 'Quản lý chuyến đi nhóm',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className={`${inter.className} bg-sky-50 min-h-screen`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

- [ ] **Step 7: Create lib/utils.ts**

```typescript
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 8: Create .env.local**

```
DATABASE_URL="postgresql://postgres:password@localhost:5432/travelapp"
NEXTAUTH_SECRET="your-secret-change-this-in-production"
NEXTAUTH_URL="http://localhost:3000"
```

- [ ] **Step 9: Verify dev server starts**

```bash
npm run dev
```

Expected: server running at http://localhost:3000 with no errors.

- [ ] **Step 10: Commit**

```bash
git init
git add .
git commit -m "feat: scaffold Next.js 14 project with Tailwind and shadcn/ui"
```

---

### Task 2: Prisma Schema + Database

**Files:**
- Create: `prisma/schema.prisma`
- Create: `prisma/seed.ts`
- Create: `lib/prisma.ts`

**Interfaces:**
- Produces: `PrismaClient` singleton exported from `lib/prisma.ts`
- Produces: DB tables matching schema, seeded with 1 admin + 2 viewers
- Produces types: `User`, `Trip`, `TripMember`, `Day`, `Destination`, `DestinationExpense`, `DestinationMedia`, `DestinationFeedback` — all importable from `@prisma/client`

- [ ] **Step 1: Init Prisma**

```bash
npx prisma init --datasource-provider postgresql
```

- [ ] **Step 2: Write full schema**

Replace `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  ADMIN
  VIEWER
}

enum DestStatus {
  PENDING
  DONE
  REJECTED
  REPLACED
}

enum MediaType {
  PHOTO
  BILL
}

enum FeedbackStatus {
  OK
  NOT_OK
  MAYBE
}

model User {
  id            String   @id @default(cuid())
  email         String   @unique
  password_hash String
  name          String
  avatar_url    String?
  role          Role     @default(VIEWER)
  created_at    DateTime @default(now())

  trips_created    Trip[]
  trip_memberships TripMember[]
  expenses         DestinationExpense[]
  media_uploads    DestinationMedia[]
  feedbacks        DestinationFeedback[]
}

model Trip {
  id          String   @id @default(cuid())
  title       String
  description String?
  cover_image String?
  start_date  DateTime
  end_date    DateTime
  created_by  String
  created_at  DateTime @default(now())

  creator User       @relation(fields: [created_by], references: [id])
  members TripMember[]
  days    Day[]
}

model TripMember {
  trip_id   String
  user_id   String
  joined_at DateTime @default(now())

  trip Trip @relation(fields: [trip_id], references: [id], onDelete: Cascade)
  user User @relation(fields: [user_id], references: [id])

  @@id([trip_id, user_id])
}

model Day {
  id         String   @id @default(cuid())
  trip_id    String
  date       DateTime
  day_number Int
  label      String?

  trip         Trip          @relation(fields: [trip_id], references: [id], onDelete: Cascade)
  destinations Destination[]

  @@unique([trip_id, day_number])
}

model Destination {
  id              String     @id @default(cuid())
  day_id          String
  name            String
  description     String?
  order_index     Int
  start_time      DateTime?
  end_time        DateTime?
  status          DestStatus @default(PENDING)
  replaced_by_id  String?
  budget_estimate Float?
  created_at      DateTime   @default(now())

  day         Day                  @relation(fields: [day_id], references: [id], onDelete: Cascade)
  replaced_by Destination?         @relation("ReplacedBy", fields: [replaced_by_id], references: [id])
  replaces    Destination[]        @relation("ReplacedBy")
  expenses    DestinationExpense[]
  media       DestinationMedia[]
  feedbacks   DestinationFeedback[]
}

model DestinationExpense {
  id             String   @id @default(cuid())
  destination_id String
  user_id        String
  amount         Float
  note           String?
  created_at     DateTime @default(now())
  updated_at     DateTime @updatedAt

  destination Destination @relation(fields: [destination_id], references: [id], onDelete: Cascade)
  user        User        @relation(fields: [user_id], references: [id])
}

model DestinationMedia {
  id             String    @id @default(cuid())
  destination_id String
  file_path      String
  file_name      String
  file_size      Int
  type           MediaType
  is_best_shot   Boolean   @default(false)
  uploaded_by    String
  created_at     DateTime  @default(now())

  destination Destination @relation(fields: [destination_id], references: [id], onDelete: Cascade)
  uploader    User        @relation(fields: [uploaded_by], references: [id])
}

model DestinationFeedback {
  id             String         @id @default(cuid())
  destination_id String
  user_id        String
  status         FeedbackStatus
  note           String?
  created_at     DateTime       @default(now())
  updated_at     DateTime       @updatedAt

  destination Destination @relation(fields: [destination_id], references: [id], onDelete: Cascade)
  user        User        @relation(fields: [user_id], references: [id])

  @@unique([destination_id, user_id])
}
```

- [ ] **Step 3: Create Prisma client singleton**

Create `lib/prisma.ts`:

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **Step 4: Run migration**

```bash
npx prisma migrate dev --name init
```

Expected: migration created and applied, all tables created in PostgreSQL.

- [ ] **Step 5: Create seed file**

Create `prisma/seed.ts`:

```typescript
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const adminHash = await bcrypt.hash('admin123', 10)
  const viewerHash = await bcrypt.hash('viewer123', 10)

  await prisma.user.upsert({
    where: { email: 'admin@travel.app' },
    update: {},
    create: {
      email: 'admin@travel.app',
      password_hash: adminHash,
      name: 'Admin',
      role: 'ADMIN',
    },
  })

  await prisma.user.upsert({
    where: { email: 'minh@travel.app' },
    update: {},
    create: {
      email: 'minh@travel.app',
      password_hash: viewerHash,
      name: 'Minh',
      role: 'VIEWER',
    },
  })

  await prisma.user.upsert({
    where: { email: 'lan@travel.app' },
    update: {},
    create: {
      email: 'lan@travel.app',
      password_hash: viewerHash,
      name: 'Lan',
      role: 'VIEWER',
    },
  })

  console.log('Seeded: admin@travel.app / admin123')
}

main().catch(console.error).finally(() => prisma.$disconnect())
```

Add to `package.json`:
```json
"prisma": {
  "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
}
```

- [ ] **Step 6: Run seed**

```bash
npx prisma db seed
```

Expected: "Seeded: admin@travel.app / admin123"

- [ ] **Step 7: Verify with Prisma Studio**

```bash
npx prisma studio
```

Expected: opens at http://localhost:5555, Users table has 3 rows.

- [ ] **Step 8: Commit**

```bash
git add prisma/ lib/prisma.ts
git commit -m "feat: add Prisma schema and seed users"
```

---

### Task 3: NextAuth Authentication

**Files:**
- Create: `lib/auth.ts`
- Create: `app/api/auth/[...nextauth]/route.ts`
- Create: `components/providers.tsx`
- Create: `middleware.ts`
- Modify: `app/layout.tsx` (wrap with Providers)

**Interfaces:**
- Produces: `auth()` function from `lib/auth.ts` — returns session or null in Server Components
- Produces: `session.user.id`, `session.user.name`, `session.user.email`, `session.user.role` ('ADMIN' | 'VIEWER')
- Produces: `signIn()`, `signOut()` importable from `next-auth/react`
- Consumes: `prisma` from `lib/prisma.ts`, `bcrypt` from `bcryptjs`

- [ ] **Step 1: Create NextAuth config**

Create `lib/auth.ts`:

```typescript
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        ;(session.user as any).role = token.role
      }
      return session
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })
        if (!user) return null

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password_hash
        )
        if (!valid) return null

        return { id: user.id, email: user.email, name: user.name, role: user.role }
      },
    }),
  ],
})
```

- [ ] **Step 2: Create NextAuth route handler**

Create `app/api/auth/[...nextauth]/route.ts`:

```typescript
import { handlers } from '@/lib/auth'
export const { GET, POST } = handlers
```

- [ ] **Step 3: Create SessionProvider wrapper**

Create `components/providers.tsx`:

```typescript
'use client'
import { SessionProvider } from 'next-auth/react'

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}
```

- [ ] **Step 4: Create middleware for route protection**

Create `middleware.ts`:

```typescript
import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isAuthPage = req.nextUrl.pathname.startsWith('/login')
  const isApiAuth = req.nextUrl.pathname.startsWith('/api/auth')

  if (isApiAuth) return NextResponse.next()
  if (!isLoggedIn && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }
  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
}
```

- [ ] **Step 5: Wrap root layout with Providers**

Update `app/layout.tsx` — body already wraps `{children}` with `<Providers>` from Task 1 Step 6. Verify it's there — no change needed if Task 1 was done correctly.

- [ ] **Step 6: Create root redirect**

Create `app/page.tsx`:

```typescript
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

export default async function RootPage() {
  const session = await auth()
  if (session) redirect('/dashboard')
  redirect('/login')
}
```

- [ ] **Step 7: Commit**

```bash
git add lib/auth.ts app/api/ components/providers.tsx middleware.ts app/page.tsx
git commit -m "feat: add NextAuth credentials authentication with JWT"
```

---

### Task 4: Login Page

**Files:**
- Create: `app/(auth)/login/page.tsx`
- Create: `app/(auth)/layout.tsx`

**Interfaces:**
- Consumes: `signIn` from `next-auth/react`
- Produces: working login form that redirects to `/dashboard` on success

- [ ] **Step 1: Create auth group layout (centered, no navbar)**

Create `app/(auth)/layout.tsx`:

```typescript
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-sky-50">
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Create login page**

Create `app/(auth)/login/page.tsx`:

```typescript
'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MapPin } from 'lucide-react'

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
      setError('Email hoặc mật khẩu không đúng')
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <Card className="w-full max-w-sm shadow-lg">
      <CardHeader className="text-center space-y-2">
        <div className="flex justify-center">
          <div className="bg-sky-500 p-3 rounded-full">
            <MapPin className="h-6 w-6 text-white" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold text-sky-900">Travel App</CardTitle>
        <p className="text-sm text-gray-500">Quản lý chuyến đi nhóm</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="admin@travel.app"
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Mật khẩu</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </div>
          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}
          <Button
            type="submit"
            className="w-full bg-sky-500 hover:bg-sky-600"
            disabled={loading}
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 3: Test login flow manually**

1. Navigate to `http://localhost:3000` → should redirect to `/login`
2. Enter `admin@travel.app` / `admin123` → should redirect to `/dashboard` (will 404 until Task 5)
3. Enter wrong password → should show "Email hoặc mật khẩu không đúng"
4. Navigate to `/login` while logged in → should redirect to `/dashboard`

- [ ] **Step 4: Commit**

```bash
git add app/\(auth\)/
git commit -m "feat: add login page with credential validation"
```

---

### Task 5: Navbar + Authenticated Layout

**Files:**
- Create: `components/navbar.tsx`
- Create: `app/(app)/layout.tsx`
- Create: `app/(app)/dashboard/page.tsx` (placeholder)

**Interfaces:**
- Consumes: `auth()` from `lib/auth.ts` (server), `useSession` / `signOut` from `next-auth/react` (client)
- Produces: sticky top navbar visible on all authenticated pages; hamburger menu on mobile

- [ ] **Step 1: Create Navbar component**

Create `components/navbar.tsx`:

```typescript
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { MapPin, LayoutDashboard, Menu, X, LogOut, User } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

const navLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
]

export function Navbar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [mobileOpen, setMobileOpen] = useState(false)

  const initials = session?.user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? '?'

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/90 backdrop-blur-sm shadow-sm">
      <div className="max-w-content mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-sky-600">
          <MapPin className="h-5 w-5" />
          <span>Travel App</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                pathname === href
                  ? 'bg-sky-50 text-sky-600'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>

        {/* Desktop user menu */}
        <div className="hidden md:flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 h-9 px-2">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-sky-100 text-sky-700 text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{session?.user?.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem className="text-xs text-gray-400 pointer-events-none">
                {session?.user?.email}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/login' })}>
                <LogOut className="h-4 w-4 mr-2" />
                Đăng xuất
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Mobile hamburger */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-4">
            <div className="flex items-center gap-2 mb-6 font-bold text-sky-600">
              <MapPin className="h-5 w-5" />
              <span>Travel App</span>
            </div>
            <nav className="flex flex-col gap-1">
              {navLinks.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium',
                    pathname === href
                      ? 'bg-sky-50 text-sky-600'
                      : 'text-gray-600 hover:bg-gray-100'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              ))}
            </nav>
            <div className="absolute bottom-4 left-4 right-4">
              <div className="flex items-center gap-2 mb-2 px-3">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-sky-100 text-sky-700 text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{session?.user?.name}</p>
                  <p className="text-xs text-gray-400">{session?.user?.email}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={() => signOut({ callbackUrl: '/login' })}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Đăng xuất
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Create authenticated app layout**

Create `app/(app)/layout.tsx`:

```typescript
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Navbar } from '@/components/navbar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div className="min-h-screen bg-sky-50">
      <Navbar />
      <main className="max-w-content mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 3: Create dashboard placeholder**

Create `app/(app)/dashboard/page.tsx`:

```typescript
import { auth } from '@/lib/auth'

export default async function DashboardPage() {
  const session = await auth()

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-sky-900">Dashboard</h1>
      <p className="text-gray-500">Xin chào, {session?.user?.name}!</p>
      <p className="text-sm text-gray-400">
        Role: {(session?.user as any)?.role}
      </p>
    </div>
  )
}
```

- [ ] **Step 4: Test full auth flow**

1. `http://localhost:3000` → redirects to `/login`
2. Login with `admin@travel.app` / `admin123` → redirects to `/dashboard`
3. Dashboard shows: "Xin chào, Admin!" and "Role: ADMIN"
4. Navbar visible with logo and user menu
5. On mobile (resize browser): hamburger icon, slide-out menu works
6. Logout → redirects to `/login`

- [ ] **Step 5: Commit**

```bash
git add components/navbar.tsx app/\(app\)/
git commit -m "feat: add navbar and authenticated app layout"
```

---

## Self-Review

**Spec coverage:**
- ✅ Next.js 14 App Router setup
- ✅ PostgreSQL + Prisma full schema (all 7 models)
- ✅ NextAuth credentials auth with JWT
- ✅ Role: ADMIN / VIEWER on session
- ✅ Middleware redirects unauthenticated → /login
- ✅ Login page with error handling
- ✅ Responsive navbar with hamburger on mobile
- ✅ Admin check available via `session.user.role`
- ✅ Seeded users for development

**No placeholders found.**

**Type consistency:** `session.user.role` accessed as `(session.user as any).role` — consistent across Task 3, 4, 5.
