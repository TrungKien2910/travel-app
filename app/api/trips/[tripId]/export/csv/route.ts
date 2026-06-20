import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(
  _: Request,
  { params }: { params: { tripId: string } }
) {
  const session = await auth()
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const expenses = await prisma.destinationExpense.findMany({
    where: { destination: { day: { trip_id: params.tripId } } },
    include: {
      user: { select: { name: true } },
      destination: {
        select: {
          name: true,
          day: { select: { day_number: true, date: true } },
        },
      },
    },
    orderBy: [
      { destination: { day: { day_number: 'asc' } } },
      { user: { name: 'asc' } },
    ],
  })

  const header = 'Thành viên,Điểm đến,Ngày,Ngày số,Số tiền (VND),Ghi chú'
  const rows = expenses.map((e) => {
    const date = new Date(e.destination.day.date).toLocaleDateString('vi-VN')
    return [
      e.user.name,
      e.destination.name,
      date,
      e.destination.day.day_number,
      e.amount,
      e.note ?? '',
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(',')
  })

  // Prepend UTF-8 BOM so Excel reads Vietnamese correctly
  const csv = '\uFEFF' + [header, ...rows].join('\n')
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="chi-tieu.csv"',
    },
  })
}
