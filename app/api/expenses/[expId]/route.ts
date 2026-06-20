import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function PUT(
  req: Request,
  { params }: { params: { expId: string } }
) {
  const session = await auth()
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { amount, note } = await req.json()
  const expense = await prisma.destinationExpense.update({
    where: { id: params.expId },
    data: { amount: Number(amount), note },
    include: { user: { select: { id: true, name: true } } },
  })
  return NextResponse.json(expense)
}

export async function DELETE(
  _: Request,
  { params }: { params: { expId: string } }
) {
  const session = await auth()
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.destinationExpense.delete({ where: { id: params.expId } })
  return NextResponse.json({ ok: true })
}
