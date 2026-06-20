import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function DELETE(
  _: Request,
  { params }: { params: { tripId: string; userId: string } }
) {
  const session = await auth()
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const expenseCount = await prisma.destinationExpense.count({
    where: {
      user_id: params.userId,
      destination: { day: { trip_id: params.tripId } },
    },
  })

  await prisma.tripMember.delete({
    where: {
      trip_id_user_id: { trip_id: params.tripId, user_id: params.userId },
    },
  })
  return NextResponse.json({ ok: true, had_expenses: expenseCount > 0 })
}
