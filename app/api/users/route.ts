import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

export async function GET() {
  const session = await auth()
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      created_at: true,
      _count: { select: { trip_memberships: true, trips_created: true } },
    },
    orderBy: { created_at: 'asc' },
  })
  return NextResponse.json(users)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name, email, password, role } = await req.json()

  if (!name?.trim() || !email?.trim() || !password)
    return NextResponse.json(
      { error: 'Vui lòng nhập đủ tên, email và mật khẩu.' },
      { status: 400 }
    )
  if (password.length < 6)
    return NextResponse.json(
      { error: 'Mật khẩu phải có ít nhất 6 ký tự.' },
      { status: 400 }
    )
  if (role !== 'ADMIN' && role !== 'VIEWER')
    return NextResponse.json({ error: 'Vai trò không hợp lệ.' }, { status: 400 })

  const normalizedEmail = email.trim().toLowerCase()
  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  })
  if (existing)
    return NextResponse.json(
      { error: 'Email này đã được dùng.' },
      { status: 409 }
    )

  try {
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        role,
        password_hash: await bcrypt.hash(password, 10),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        created_at: true,
      },
    })
    return NextResponse.json(user, { status: 201 })
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    )
      return NextResponse.json(
        { error: 'Email này đã được dùng.' },
        { status: 409 }
      )
    throw e
  }
}
