import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const raw = body.avatar_url

  let avatar_url: string | null = null
  if (raw != null && String(raw).trim() !== '') {
    const url = String(raw).trim()
    if (url.length > 2048)
      return NextResponse.json(
        { error: 'Đường dẫn ảnh quá dài.' },
        { status: 400 }
      )
    if (!/^https?:\/\//i.test(url))
      return NextResponse.json(
        { error: 'Đường dẫn ảnh phải bắt đầu bằng http:// hoặc https://' },
        { status: 400 }
      )
    avatar_url = url
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { avatar_url },
    select: { id: true, name: true, avatar_url: true },
  })
  return NextResponse.json(user)
}
