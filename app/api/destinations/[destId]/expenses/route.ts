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

  const expenses = await prisma.destinationExpense.findMany({
    where: { destination_id: params.destId },
    include: { user: { select: { id: true, name: true, avatar_url: true } } },
    orderBy: { created_at: 'asc' },
  })
  return NextResponse.json(expenses)
}

export async function POST(
  req: Request,
  { params }: { params: { destId: string } }
) {
  const session = await auth()
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { user_id, amount, note } = await req.json()
  if (!user_id || !amount)
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const expense = await prisma.destinationExpense.create({
    data: {
      destination_id: params.destId,
      user_id,
      amount: Number(amount),
      note,
    },
    include: { user: { select: { id: true, name: true, avatar_url: true } } },
  })
  return NextResponse.json(expense, { status: 201 })
}
