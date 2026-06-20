'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatVND } from '@/lib/format'
import { Pencil, MapPin, Navigation } from 'lucide-react'

export function InfoTab({ dest, isAdmin }: any) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    name: dest.name,
    description: dest.description ?? '',
    address: dest.address ?? '',
    budget_estimate: dest.budget_estimate?.toString() ?? '',
  })

  const mapsUrl = dest.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        dest.address
      )}`
    : null
  const [status, setStatus] = useState(dest.status)
  const [saving, setSaving] = useState(false)

  async function saveInfo() {
    setSaving(true)
    await fetch(`/api/destinations/${dest.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        start_time: dest.start_time,
        end_time: dest.end_time,
        budget_estimate: form.budget_estimate
          ? Number(form.budget_estimate)
          : null,
      }),
    })
    setSaving(false)
    setEditing(false)
    router.refresh()
  }

  async function updateStatus(newStatus: string) {
    setStatus(newStatus)
    await fetch(`/api/destinations/${dest.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    router.refresh()
  }

  return (
    <div className="space-y-5">
      {isAdmin && !editing && (
        <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
          <Pencil className="mr-1.5 h-3.5 w-3.5" /> Sửa thông tin
        </Button>
      )}

      {editing ? (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Tên điểm đến</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Mô tả / ghi chú</Label>
            <Textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Địa chỉ</Label>
            <Input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="VD: Núi Chúa, Hòa Ninh, Đà Nẵng"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Ngân sách dự tính (VND)</Label>
            <Input
              type="number"
              value={form.budget_estimate}
              onChange={(e) =>
                setForm({ ...form, budget_estimate: e.target.value })
              }
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={saveInfo} disabled={saving}>
              {saving ? 'Đang lưu…' : 'Lưu'}
            </Button>
            <Button variant="outline" onClick={() => setEditing(false)}>
              Hủy
            </Button>
          </div>
        </div>
      ) : (
        <dl className="space-y-4">
          {dest.description ? (
            <div>
              <dt className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Ghi chú
              </dt>
              <dd className="text-sm leading-relaxed text-ink">
                {dest.description}
              </dd>
            </div>
          ) : (
            <p className="text-sm italic text-muted-foreground">
              Chưa có ghi chú cho điểm đến này.
            </p>
          )}
          {dest.address && (
            <div>
              <dt className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Địa chỉ
              </dt>
              <dd className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="flex items-start gap-1.5 text-sm text-ink">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-sea" />
                  {dest.address}
                </span>
                {mapsUrl && (
                  <Button asChild size="sm" variant="outline">
                    <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                      <Navigation className="mr-1.5 h-3.5 w-3.5" /> Chỉ đường
                    </a>
                  </Button>
                )}
              </dd>
            </div>
          )}
          {dest.budget_estimate != null && (
            <div>
              <dt className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Ngân sách dự tính
              </dt>
              <dd className="tabular text-sm font-semibold text-ink">
                {formatVND(dest.budget_estimate)}
              </dd>
            </div>
          )}
        </dl>
      )}

      {isAdmin && (
        <div className="space-y-1.5 border-t border-line pt-4">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Trạng thái
          </Label>
          <Select value={status} onValueChange={updateStatus}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDING">Chưa đi</SelectItem>
              <SelectItem value="DONE">Đã đi</SelectItem>
              <SelectItem value="REJECTED">Bỏ qua</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  )
}
