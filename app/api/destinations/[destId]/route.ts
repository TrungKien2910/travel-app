import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function PUT(
  req: Request,
  { params }: { params: { destId: string } }
) {
  const session = await auth()
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()

  // Order-only update (used by drag & drop) — don't clobber other fields
  if (
    body.order_index != null &&
    body.name === undefined &&
    body.start_time === undefined &&
    body.budget_estimate === undefined
  ) {
    const dest = await prisma.destination.update({
      where: { id: params.destId },
      data: { order_index: Number(body.order_index) },
    })
    return NextResponse.json(dest)
  }

  const dest = await prisma.destination.update({
    where: { id: params.destId },
    data: {
      name: body.name,
      description: body.description,
      address:
        body.address !== undefined ? body.address?.trim() || null : undefined,
      start_time: body.start_time ? new Date(body.start_time) : null,
      end_time: body.end_time ? new Date(body.end_time) : null,
      budget_estimate:
        body.budget_estimate != null ? Number(body.budget_estimate) : null,
      order_index:
        body.order_index != null ? Number(body.order_index) : undefined,
    },
  })
  return NextResponse.json(dest)
}

export async function DELETE(
  _: Request,
  { params }: { params: { destId: string } }
) {
  const session = await auth()
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.destination.delete({ where: { id: params.destId } })
  return NextResponse.json({ ok: true })
}
