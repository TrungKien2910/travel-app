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

  const days = await prisma.day.findMany({
    where: { trip_id: params.tripId },
    orderBy: { day_number: 'asc' },
    include: {
      destinations: {
        orderBy: { order_index: 'asc' },
        include: {
          expenses: { select: { amount: true } },
          _count: { select: { feedbacks: true } },
        },
      },
    },
  })
  return NextResponse.json(days)
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

  const body = await req.json()
  const { date, label } = body

  const lastDay = await prisma.day.findFirst({
    where: { trip_id: params.tripId },
    orderBy: { day_number: 'desc' },
  })
  const day_number = (lastDay?.day_number ?? 0) + 1

  const day = await prisma.day.create({
    data: {
      trip_id: params.tripId,
      date: new Date(date),
      day_number,
      label,
    },
  })
  return NextResponse.json(day, { status: 201 })
}
