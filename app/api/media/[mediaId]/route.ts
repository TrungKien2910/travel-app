import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { deleteMedia, pathFromUrl } from '@/lib/storage'

export async function DELETE(
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

  // Remove the object from Storage; ignore if it isn't a Storage URL or is gone.
  const objectPath = pathFromUrl(media.file_path)
  if (objectPath) {
    try {
      await deleteMedia(objectPath)
    } catch {}
  }

  await prisma.destinationMedia.delete({ where: { id: params.mediaId } })
  return NextResponse.json({ ok: true })
}
