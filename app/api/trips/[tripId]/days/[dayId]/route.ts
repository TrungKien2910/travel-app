import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function PUT(
  req: Request,
  { params }: { params: { tripId: string; dayId: string } }
) {
  const session = await auth()
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const day = await prisma.day.update({
    where: { id: params.dayId },
    data: {
      label: body.label,
      date: body.date ? new Date(body.date) : undefined,
    },
  })
  return NextResponse.json(day)
}

export async function DELETE(
  _: Request,
  { params }: { params: { tripId: string; dayId: string } }
) {
  const session = await auth()
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.day.delete({ where: { id: params.dayId } })
  return NextResponse.json({ ok: true })
}
