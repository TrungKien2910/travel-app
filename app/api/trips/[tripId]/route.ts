import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(
  _: Request,
  { params }: { params: { tripId: string } }
) {
  const session = await auth()
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const trip = await prisma.trip.findUnique({
    where: { id: params.tripId },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true, avatar_url: true },
          },
        },
      },
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

export async function PUT(
  req: Request,
  { params }: { params: { tripId: string } }
) {
  const session = await auth()
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

export async function DELETE(
  _: Request,
  { params }: { params: { tripId: string } }
) {
  const session = await auth()
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.trip.delete({ where: { id: params.tripId } })
  return NextResponse.json({ ok: true })
}
