import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { uploadMedia } from '@/lib/storage'

const MAX_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_PHOTO = ['image/jpeg', 'image/png', 'image/webp']
// Bills are images too, so they can be shown as thumbnails / in the lightbox.
const ALLOWED_BILL = ['image/jpeg', 'image/png', 'image/webp']

export async function POST(
  req: Request,
  { params }: { params: { destId: string } }
) {
  const session = await auth()
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const dest = await prisma.destination.findUnique({
    where: { id: params.destId },
    include: { day: { select: { trip_id: true } } },
  })
  if (!dest) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const type = formData.get('type') as string | null

  if (!file || !type)
    return NextResponse.json(
      { error: 'Thiếu file hoặc loại file' },
      { status: 400 }
    )
  if (file.size > MAX_SIZE)
    return NextResponse.json(
      { error: 'File quá lớn (tối đa 10MB)' },
      { status: 400 }
    )

  const allowed = type === 'PHOTO' ? ALLOWED_PHOTO : ALLOWED_BILL
  if (!allowed.includes(file.type))
    return NextResponse.json(
      { error: `Định dạng không hợp lệ cho ${type}` },
      { status: 400 }
    )

  const ext = file.name.split('.').pop() ?? 'bin'
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const objectPath = `${dest.day.trip_id}/${params.destId}/${filename}`

  const bytes = await file.arrayBuffer()
  let publicUrl: string
  try {
    publicUrl = await uploadMedia(objectPath, Buffer.from(bytes), file.type)
  } catch (e) {
    console.error('Storage upload failed:', e)
    return NextResponse.json(
      { error: 'Tải file lên thất bại. Thử lại nhé.' },
      { status: 500 }
    )
  }

  const media = await prisma.destinationMedia.create({
    data: {
      destination_id: params.destId,
      file_path: publicUrl,
      file_name: file.name,
      file_size: file.size,
      type: type as 'PHOTO' | 'BILL',
      uploaded_by: session.user.id,
    },
    include: { uploader: { select: { name: true } } },
  })
  return NextResponse.json(media, { status: 201 })
}
