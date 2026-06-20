import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

export async function PUT(
  req: Request,
  { params }: { params: { userId: string } }
) {
  const session = await auth()
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const target = await prisma.user.findUnique({ where: { id: params.userId } })
  if (!target)
    return NextResponse.json({ error: 'Không tìm thấy user.' }, { status: 404 })

  const { name, role, password } = await req.json()
  const isSelf = params.userId === session.user.id

  if (role && role !== 'ADMIN' && role !== 'VIEWER')
    return NextResponse.json({ error: 'Vai trò không hợp lệ.' }, { status: 400 })

  // Don't let an admin demote themselves and lock the system out
  if (isSelf && role && role !== 'ADMIN')
    return NextResponse.json(
      { error: 'Bạn không thể tự hạ vai trò của chính mình.' },
      { status: 400 }
    )

  if (password != null && password !== '' && password.length < 6)
    return NextResponse.json(
      { error: 'Mật khẩu phải có ít nhất 6 ký tự.' },
      { status: 400 }
    )

  const data: any = {}
  if (name?.trim()) data.name = name.trim()
  if (role) data.role = role
  if (password) data.password_hash = await bcrypt.hash(password, 10)

  const user = await prisma.user.update({
    where: { id: params.userId },
    data,
    select: { id: true, name: true, email: true, role: true, created_at: true },
  })
  return NextResponse.json(user)
}

export async function DELETE(
  _: Request,
  { params }: { params: { userId: string } }
) {
  const session = await auth()
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (params.userId === session.user.id)
    return NextResponse.json(
      { error: 'Bạn không thể tự xóa tài khoản của mình.' },
      { status: 400 }
    )

  const target = await prisma.user.findUnique({
    where: { id: params.userId },
    include: {
      _count: {
        select: {
          trips_created: true,
          expenses: true,
          media_uploads: true,
          feedbacks: true,
        },
      },
    },
  })
  if (!target)
    return NextResponse.json({ error: 'Không tìm thấy user.' }, { status: 404 })

  // A user who created trips or left data can't be hard-deleted (FK restrict).
  const c = target._count
  if (c.trips_created > 0 || c.expenses > 0 || c.media_uploads > 0 || c.feedbacks > 0)
    return NextResponse.json(
      {
        error:
          'Không thể xóa: tài khoản này đã tạo chuyến đi hoặc có chi tiêu/ảnh/cảm nhận. Hãy gỡ khỏi các chuyến đi thay vì xóa.',
      },
      { status: 409 }
    )

  // Remove trip memberships first (no cascade from User side), then the user.
  await prisma.$transaction([
    prisma.tripMember.deleteMany({ where: { user_id: params.userId } }),
    prisma.user.delete({ where: { id: params.userId } }),
  ])
  return NextResponse.json({ ok: true })
}
