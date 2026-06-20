import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'

export async function GET(
  _: Request,
  { params }: { params: { tripId: string } }
) {
  const session = await auth()
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const members = await prisma.tripMember.findMany({
    where: { trip_id: params.tripId },
    include: {
      user: {
        select: { id: true, name: true, email: true, avatar_url: true },
      },
    },
    orderBy: { joined_at: 'asc' },
  })
  return NextResponse.json(members)
}

export async function POST(
  req: Request,
  { params }: { params: { tripId: string } }
) {
  const session = await auth()
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { user_id } = await req.json()
  if (!user_id)
    return NextResponse.json({ error: 'user_id required' }, { status: 400 })

  // Fast path: friendly message if already a member.
  const existing = await prisma.tripMember.findUnique({
    where: { trip_id_user_id: { trip_id: params.tripId, user_id } },
  })
  if (existing)
    return NextResponse.json({ error: 'Already a member' }, { status: 409 })

  // The create is the real guard: catch the unique violation (P2002) so a
  // concurrent/double-clicked request returns 409 instead of crashing.
  try {
    const member = await prisma.tripMember.create({
      data: { trip_id: params.tripId, user_id },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar_url: true },
        },
      },
    })
    return NextResponse.json(member, { status: 201 })
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    )
      return NextResponse.json({ error: 'Already a member' }, { status: 409 })
    throw e
  }
}
