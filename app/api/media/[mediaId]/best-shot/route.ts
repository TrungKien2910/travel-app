import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function PATCH(
  _: Request,
  { params }: { params: { mediaId: string } }
) {
  const session = await auth()
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const media = await prisma.destinationMedia.findUnique({
    where: { id: params.mediaId },
  })
  if (!media) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = await prisma.destinationMedia.update({
    where: { id: params.mediaId },
    data: { is_best_shot: !media.is_best_shot },
  })
  return NextResponse.json(updated)
}
