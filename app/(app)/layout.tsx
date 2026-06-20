import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Navbar } from '@/components/navbar'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect('/login')

  // JWT doesn't carry the avatar, so read the current photo for the navbar.
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { avatar_url: true },
  })

  return (
    <div className="min-h-screen bg-background">
      <Navbar avatarUrl={me?.avatar_url ?? null} />
      <main className="mx-auto max-w-content px-4 py-6 md:py-8">{children}</main>
    </div>
  )
}
