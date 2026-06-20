import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const trips = await prisma.trip.findMany({
    where: {
      OR: [
        { created_by: session.user.id },
        { members: { some: { user_id: session.user.id } } },
      ],
    },
    include: {
      _count: { select: { members: true, days: true } },
    },
    orderBy: { start_date: 'desc' },
  })
  return NextResponse.json(trips)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { title, description, start_date, end_date } = body

  if (!title || !start_date || !end_date)
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    )

  const trip = await prisma.trip.create({
    data: {
      title,
      description,
      start_date: new Date(start_date),
      end_date: new Date(end_date),
      created_by: session.user.id,
      members: { create: { user_id: session.user.id } },
    },
  })
  return NextResponse.json(trip, { status: 201 })
}
