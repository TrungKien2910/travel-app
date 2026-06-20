import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const session = await auth()
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
