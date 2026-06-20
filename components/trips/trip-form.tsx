'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'

interface TripFormProps {
  defaultValues?: {
    id?: string
    title?: string
    description?: string
    start_date?: string
    end_date?: string
  }
  onSuccess?: (trip: any) => void
}

export function TripForm({ defaultValues, onSuccess }: TripFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const isEdit = !!defaultValues?.id

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    const form = new FormData(e.currentTarget)
    const body = {
      title: form.get('title'),
      description: form.get('description'),
      start_date: form.get('start_date'),
      end_date: form.get('end_date'),
    }

    if (
      body.start_date &&
      body.end_date &&
      new Date(body.end_date as string) < new Date(body.start_date as string)
    ) {
      setError('Ngày kết thúc phải sau ngày bắt đầu.')
      return
    }

    setLoading(true)
    const url = isEdit ? `/api/trips/${defaultValues!.id}` : '/api/trips'
    const method = isEdit ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    setLoading(false)
    if (!res.ok) {
      setError('Không lưu được. Thử lại nhé.')
      return
    }
    const trip = await res.json()
    if (onSuccess) onSuccess(trip)
    else {
      router.push(`/trips/${trip.id}`)
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="title">Tên chuyến đi *</Label>
        <Input
          id="title"
          name="title"
          defaultValue={defaultValues?.title}
          placeholder="VD: Đà Nẵng – Hội An 4 ngày"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description">Mô tả</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={defaultValues?.description ?? ''}
          placeholder="Ghi chú nhanh về chuyến đi…"
          rows={3}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="start_date">Ngày bắt đầu *</Label>
          <Input
            id="start_date"
            name="start_date"
            type="date"
            defaultValue={defaultValues?.start_date?.slice(0, 10)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="end_date">Ngày kết thúc *</Label>
          <Input
            id="end_date"
            name="end_date"
            type="date"
            defaultValue={defaultValues?.end_date?.slice(0, 10)}
            required
          />
        </div>
      </div>
      {error && (
        <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Hủy
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEdit ? 'Lưu thay đổi' : 'Tạo chuyến đi'}
        </Button>
      </div>
    </form>
  )
}
