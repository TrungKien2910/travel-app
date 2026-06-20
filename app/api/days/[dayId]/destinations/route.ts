import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(
  _: Request,
  { params }: { params: { dayId: string } }
) {
  const session = await auth()
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const destinations = await prisma.destination.findMany({
    where: { day_id: params.dayId },
    orderBy: { order_index: 'asc' },
  })
  return NextResponse.json(destinations)
}

export async function POST(
  req: Request,
  { params }: { params: { dayId: string } }
) {
  const session = await auth()
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { name, description, address, start_time, end_time, budget_estimate } =
    body

  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const last = await prisma.destination.findFirst({
    where: { day_id: params.dayId },
    orderBy: { order_index: 'desc' },
  })

  const dest = await prisma.destination.create({
    data: {
      day_id: params.dayId,
      name,
      description,
      address: address?.trim() || null,
      order_index: (last?.order_index ?? -1) + 1,
      start_time: start_time ? new Date(start_time) : null,
      end_time: end_time ? new Date(end_time) : null,
      budget_estimate: budget_estimate ? Number(budget_estimate) : null,
    },
  })
  return NextResponse.json(dest, { status: 201 })
}
