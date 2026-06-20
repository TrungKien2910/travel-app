import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(
  _: Request,
  { params }: { params: { destId: string } }
) {
  const session = await auth()
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const feedbacks = await prisma.destinationFeedback.findMany({
    where: { destination_id: params.destId },
    include: { user: { select: { id: true, name: true, avatar_url: true } } },
    orderBy: { updated_at: 'desc' },
  })
  return NextResponse.json(feedbacks)
}

export async function POST(
  req: Request,
  { params }: { params: { destId: string } }
) {
  const session = await auth()
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Only trip members may leave feedback
  const dest = await prisma.destination.findUnique({
    where: { id: params.destId },
    include: { day: { include: { trip: { include: { members: true } } } } },
  })
  const isMember = dest?.day.trip.members.some(
    (m) => m.user_id === session.user.id
  )
  if (!isMember)
    return NextResponse.json({ error: 'Not a trip member' }, { status: 403 })

  const { status, note } = await req.json()
  const valid = ['OK', 'NOT_OK', 'MAYBE']
  if (!valid.includes(status))
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })

  const feedback = await prisma.destinationFeedback.upsert({
    where: {
      destination_id_user_id: {
        destination_id: params.destId,
        user_id: session.user.id,
      },
    },
    create: {
      destination_id: params.destId,
      user_id: session.user.id,
      status,
      note,
    },
    update: { status, note },
    include: { user: { select: { id: true, name: true, avatar_url: true } } },
  })
  return NextResponse.json(feedback)
}
