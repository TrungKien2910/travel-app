import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { UserManager } from '@/components/admin/user-manager'

export default async function AdminUsersPage() {
  const session = await auth()
  if ((session?.user as any)?.role !== 'ADMIN') redirect('/dashboard')

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatar_url: true,
      created_at: true,
      _count: { select: { trip_memberships: true, trips_created: true } },
    },
    orderBy: { created_at: 'asc' },
  })

  return (
    <UserManager
      initialUsers={JSON.parse(JSON.stringify(users))}
      currentUserId={session!.user.id}
    />
  )
}
