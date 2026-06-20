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

  const { total, note, user_ids } = await req.json()
  if (!total || !user_ids?.length)
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const perPerson = Math.floor(Number(total) / user_ids.length)

  const expenses = await prisma.$transaction(
    user_ids.map((uid: string) =>
      prisma.destinationExpense.create({
        data: {
          destination_id: params.destId,
          user_id: uid,
          amount: perPerson,
          note,
        },
        include: {
          user: { select: { id: true, name: true, avatar_url: true } },
        },
      })
    )
  )
  return NextResponse.json(expenses, { status: 201 })
}
