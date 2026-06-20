import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST(
  req: Request,
  { params }: { params: { destId: string } }
) {
  const session = await auth()
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { name, address, start_time, end_time, budget_estimate } = body
  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const old = await prisma.destination.findUnique({
    where: { id: params.destId },
  })
  if (!old) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const result = await prisma.$transaction(async (tx) => {
    const newDest = await tx.destination.create({
      data: {
        day_id: old.day_id,
        name,
        description: null,
        address: address?.trim() || null,
        order_index: old.order_index + 1,
        start_time: start_time ? new Date(start_time) : null,
        end_time: end_time ? new Date(end_time) : null,
        budget_estimate: budget_estimate ? Number(budget_estimate) : null,
        status: 'PENDING',
      },
    })
    const updatedOld = await tx.destination.update({
      where: { id: params.destId },
      data: { status: 'REPLACED', replaced_by_id: newDest.id },
    })
    return { old: updatedOld, new: newDest }
  })

  return NextResponse.json(result, { status: 201 })
}
