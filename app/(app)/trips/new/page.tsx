import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TripForm } from '@/components/trips/trip-form'
import { ArrowLeft } from 'lucide-react'

export default async function NewTripPage() {
  const session = await auth()
  if ((session?.user as any)?.role !== 'ADMIN') redirect('/dashboard')

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/dashboard">
          <ArrowLeft className="mr-1 h-4 w-4" /> Tổng quan
        </Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>Tạo chuyến đi mới</CardTitle>
          <CardDescription>
            Đặt tên và khoảng thời gian. Lịch trình từng ngày thêm sau.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TripForm />
        </CardContent>
      </Card>
    </div>
  )
}
