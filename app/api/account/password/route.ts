import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

export async function POST(req: Request) {
  const session = await auth()
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { current_password, new_password } = await req.json()
  if (!current_password || !new_password)
    return NextResponse.json(
      { error: 'Vui lòng nhập mật khẩu hiện tại và mật khẩu mới.' },
      { status: 400 }
    )
  if (new_password.length < 6)
    return NextResponse.json(
      { error: 'Mật khẩu mới phải có ít nhất 6 ký tự.' },
      { status: 400 }
    )

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  })
  if (!user)
    return NextResponse.json({ error: 'Không tìm thấy user.' }, { status: 404 })

  const valid = await bcrypt.compare(current_password, user.password_hash)
  if (!valid)
    return NextResponse.json(
      { error: 'Mật khẩu hiện tại không đúng.' },
      { status: 400 }
    )

  await prisma.user.update({
    where: { id: session.user.id },
    data: { password_hash: await bcrypt.hash(new_password, 10) },
  })
  return NextResponse.json({ ok: true })
}
