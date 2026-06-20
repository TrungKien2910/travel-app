import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function PATCH(
  req: Request,
  { params }: { params: { destId: string } }
) {
  const session = await auth()
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { status } = await req.json()
  const valid = ['PENDING', 'DONE', 'REJECTED', 'REPLACED']
  if (!valid.includes(status))
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })

  const dest = await prisma.destination.update({
    where: { id: params.destId },
    data: { status },
  })
  return NextResponse.json(dest)
}
