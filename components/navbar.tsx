'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import {
  Compass,
  LayoutDashboard,
  Menu,
  LogOut,
  Plus,
  Users,
  UserCog,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

type NavLink = {
  href: string
  label: string
  icon: typeof LayoutDashboard
  adminOnly?: boolean
}

const navLinks: NavLink[] = [
  { href: '/dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { href: '/trips/new', label: 'Chuyến đi mới', icon: Plus, adminOnly: true },
  { href: '/admin/users', label: 'Quản lý', icon: Users, adminOnly: true },
]

export function Navbar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [mobileOpen, setMobileOpen] = useState(false)

  const isAdmin = (session?.user as any)?.role === 'ADMIN'
  const links = navLinks.filter((l) => !l.adminOnly || isAdmin)

  const initials =
    session?.user?.name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) ?? '?'

  function isActive(href: string) {
    return href === '/dashboard'
      ? pathname === href
      : pathname.startsWith(href)
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-line bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-content items-center justify-between px-4">
        {/* Logo */}
        <Link
          href="/dashboard"
          className="group flex items-center gap-2.5"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-golden-hour text-white shadow-sm transition-transform group-hover:scale-105">
            <Compass className="h-5 w-5" />
          </span>
          <span className="font-display text-base font-bold tracking-tight text-ink">
            Hải trình
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive(href)
                  ? 'bg-sea-soft text-sea-deep'
                  : 'text-muted-foreground hover:bg-secondary hover:text-ink'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>

        {/* Desktop user menu */}
        <div className="hidden md:flex">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex h-10 items-center gap-2 px-2"
              >
                <Avatar className="h-8 w-8 ring-1 ring-line">
                  <AvatarFallback className="bg-sea-soft text-xs font-semibold text-sea-deep">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-ink">
                  {session?.user?.name}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="font-normal">
                <p className="text-sm font-medium text-ink">
                  {session?.user?.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {session?.user?.email}
                </p>
                <span className="mt-1.5 inline-flex rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-secondary-foreground">
                  {isAdmin ? 'Quản trị' : 'Thành viên'}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/account">
                  <UserCog className="mr-2 h-4 w-4" />
                  Tài khoản
                </Link>
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem asChild>
                  <Link href="/admin/users">
                    <Users className="mr-2 h-4 w-4" />
                    Quản lý người dùng
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
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
          <SheetContent side="left" className="w-72 p-0">
            <SheetTitle className="sr-only">Điều hướng</SheetTitle>
            <div className="bg-golden-hour px-6 pb-6 pt-7 text-white">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
                  <Compass className="h-5 w-5" />
                </span>
                <span className="font-display text-base font-bold">
                  Hải trình
                </span>
              </div>
              <p className="mt-3 text-sm font-medium">{session?.user?.name}</p>
              <p className="text-xs text-white/75">{session?.user?.email}</p>
            </div>

            <nav className="flex flex-col gap-1 p-4">
              {links.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium',
                    isActive(href)
                      ? 'bg-sea-soft text-sea-deep'
                      : 'text-muted-foreground hover:bg-secondary hover:text-ink'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              ))}
              <Link
                href="/account"
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium',
                  pathname === '/account'
                    ? 'bg-sea-soft text-sea-deep'
                    : 'text-muted-foreground hover:bg-secondary hover:text-ink'
                )}
              >
                <UserCog className="h-4 w-4" />
                Tài khoản
              </Link>
            </nav>

            <div className="absolute inset-x-4 bottom-4">
              <Button
                variant="outline"
                className="w-full justify-start text-destructive hover:text-destructive"
                onClick={() => signOut({ callbackUrl: '/login' })}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Đăng xuất
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
