import { auth } from '@/lib/auth'

export default async function DashboardPage() {
  const session = await auth()

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold text-ink">Tổng quan</h1>
      <p className="text-muted-foreground">
        Xin chào, {session?.user?.name}!
      </p>
      <p className="text-sm text-muted-foreground">
        Vai trò: {(session?.user as any)?.role}
      </p>
    </div>
  )
}
