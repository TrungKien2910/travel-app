'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  GripVertical,
  Plus,
  Trash2,
  Edit2,
  Replace,
  AlertTriangle,
  ArrowLeft,
  CalendarPlus,
} from 'lucide-react'
import { formatDate, formatTime, timeInputValue } from '@/lib/format'

function SortableDestItem({ dest, onEdit, onDelete, onReplace }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: dest.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-lg border border-line bg-card p-2 shadow-sm"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-muted-foreground/40 hover:text-muted-foreground active:cursor-grabbing"
        aria-label="Kéo để sắp xếp"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-ink">
          {dest.name}
        </span>
        {dest.start_time && (
          <span className="text-xs text-muted-foreground">
            {formatTime(dest.start_time)}
            {dest.end_time && ` → ${formatTime(dest.end_time)}`}
          </span>
        )}
      </div>
      <StatusBadge status={dest.status} />
      <button
        onClick={() => onEdit(dest)}
        className="text-muted-foreground/50 hover:text-sea"
        aria-label="Sửa"
      >
        <Edit2 className="h-4 w-4" />
      </button>
      {dest.status !== 'REPLACED' && (
        <button
          onClick={() => onReplace(dest)}
          className="text-muted-foreground/50 hover:text-sun-deep"
          aria-label="Thay thế"
          title="Thay bằng điểm đến khác"
        >
          <Replace className="h-4 w-4" />
        </button>
      )}
      <button
        onClick={() => onDelete(dest.id)}
        className="text-muted-foreground/50 hover:text-rose-500"
        aria-label="Xóa"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}

const emptyReplaceForm = {
  name: '',
  start_time: '',
  end_time: '',
  budget_estimate: '',
}

const emptyForm = {
  name: '',
  description: '',
  address: '',
  start_time: '',
  end_time: '',
  budget_estimate: '',
}

// Build an ISO datetime pinned to Vietnam time (UTC+7) from a date + "HH:mm",
// so the stored DateTime means the same wall-clock time on any server/browser.
function vnDateTime(date: string | undefined, hm: string): string | null {
  if (!date || !hm) return null
  return `${date}T${hm}:00+07:00`
}

export default function ConfigPage() {
  const params = useParams()
  const tripId = params.tripId as string
  const [days, setDays] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [editingDest, setEditingDest] = useState<any>(null)
  const [destForm, setDestForm] = useState(emptyForm)
  const [conflict, setConflict] = useState('')
  const [replacing, setReplacing] = useState<any>(null)
  const [replaceForm, setReplaceForm] = useState(emptyReplaceForm)
  const [replaceBusy, setReplaceBusy] = useState(false)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  )

  useEffect(() => {
    fetch(`/api/trips/${tripId}/days`)
      .then((r) => r.json())
      .then((data) => {
        setDays(data)
        setLoading(false)
      })
  }, [tripId])

  function checkConflict(
    dayId: string,
    start: string,
    end: string,
    excludeId?: string
  ) {
    const day = days.find((d) => d.id === dayId)
    if (!day || !start || !end) {
      setConflict('')
      return
    }
    const s = new Date(start).getTime()
    const e = new Date(end).getTime()
    const conflicting = day.destinations.find((d: any) => {
      if (d.id === excludeId) return false
      if (!d.start_time || !d.end_time) return false
      const ds = new Date(d.start_time).getTime()
      const de = new Date(d.end_time).getTime()
      return s < de && e > ds
    })
    setConflict(conflicting ? `Trùng giờ với “${conflicting.name}”` : '')
  }

  async function addDay() {
    const lastDay = days[days.length - 1]
    const trip = await fetch(`/api/trips/${tripId}`).then((r) => r.json())
    const nextDate = lastDay
      ? new Date(new Date(lastDay.date).getTime() + 86400000).toISOString()
      : trip.start_date

    const res = await fetch(`/api/trips/${tripId}/days`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: nextDate }),
    })
    const day = await res.json()
    setDays([...days, { ...day, destinations: [] }])
    setSelectedDay(day.id)
  }

  async function deleteDay(dayId: string) {
    if (!confirm('Xóa ngày này sẽ xóa toàn bộ điểm đến bên trong. Tiếp tục?'))
      return
    await fetch(`/api/trips/${tripId}/days/${dayId}`, { method: 'DELETE' })
    setDays(days.filter((d) => d.id !== dayId))
    if (selectedDay === dayId) setSelectedDay(null)
  }

  function resetForm() {
    setDestForm(emptyForm)
    setEditingDest(null)
    setConflict('')
  }

  async function saveDest() {
    if (!selectedDay || !destForm.name) return
    const dayDate = days.find((d) => d.id === selectedDay)?.date.slice(0, 10)
    const body = {
      name: destForm.name,
      description: destForm.description || null,
      address: destForm.address || null,
      start_time: vnDateTime(dayDate, destForm.start_time),
      end_time: vnDateTime(dayDate, destForm.end_time),
      budget_estimate: destForm.budget_estimate
        ? Number(destForm.budget_estimate)
        : null,
    }

    if (editingDest) {
      const res = await fetch(`/api/destinations/${editingDest.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const updated = await res.json()
      setDays(
        days.map((d) =>
          d.id === selectedDay
            ? {
                ...d,
                destinations: d.destinations.map((x: any) =>
                  x.id === updated.id ? { ...x, ...updated } : x
                ),
              }
            : d
        )
      )
    } else {
      const res = await fetch(`/api/days/${selectedDay}/destinations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const created = await res.json()
      setDays(
        days.map((d) =>
          d.id === selectedDay
            ? { ...d, destinations: [...d.destinations, created] }
            : d
        )
      )
    }
    resetForm()
  }

  async function deleteDest(destId: string) {
    if (!confirm('Xóa điểm đến này?')) return
    await fetch(`/api/destinations/${destId}`, { method: 'DELETE' })
    setDays(
      days.map((d) => ({
        ...d,
        destinations: d.destinations.filter((x: any) => x.id !== destId),
      }))
    )
    if (editingDest?.id === destId) resetForm()
  }

  function startReplace(dest: any) {
    setReplacing(dest)
    setReplaceForm(emptyReplaceForm)
  }

  async function replaceDest() {
    if (!replacing || !replaceForm.name) return
    const dayId = replacing.day_id
    const dayDate = days
      .find((d) => d.id === dayId)
      ?.date.slice(0, 10)
    setReplaceBusy(true)
    const res = await fetch(`/api/destinations/${replacing.id}/replace`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: replaceForm.name,
        start_time: vnDateTime(dayDate, replaceForm.start_time),
        end_time: vnDateTime(dayDate, replaceForm.end_time),
        budget_estimate: replaceForm.budget_estimate
          ? Number(replaceForm.budget_estimate)
          : null,
      }),
    })
    setReplaceBusy(false)
    if (!res.ok) return
    const { old: updatedOld, new: newDest } = await res.json()

    // Old → REPLACED; insert new destination right after it
    setDays(
      days.map((d) => {
        if (d.id !== dayId) return d
        const next: any[] = []
        for (const x of d.destinations) {
          next.push(x.id === updatedOld.id ? { ...x, ...updatedOld } : x)
          if (x.id === updatedOld.id) next.push(newDest)
        }
        return { ...d, destinations: next }
      })
    )
    setReplacing(null)
    setReplaceForm(emptyReplaceForm)
  }

  async function handleDragEnd(event: DragEndEvent, dayId: string) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const day = days.find((d) => d.id === dayId)
    const oldIdx = day.destinations.findIndex((d: any) => d.id === active.id)
    const newIdx = day.destinations.findIndex((d: any) => d.id === over.id)
    const reordered = arrayMove(day.destinations, oldIdx, newIdx)

    setDays(days.map((d) => (d.id === dayId ? { ...d, destinations: reordered } : d)))

    await Promise.all(
      reordered.map((dest: any, idx: number) =>
        fetch(`/api/destinations/${dest.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_index: idx }),
        })
      )
    )
  }

  function startEdit(dest: any) {
    setEditingDest(dest)
    setDestForm({
      name: dest.name,
      description: dest.description ?? '',
      address: dest.address ?? '',
      start_time: timeInputValue(dest.start_time),
      end_time: timeInputValue(dest.end_time),
      budget_estimate: dest.budget_estimate?.toString() ?? '',
    })
  }

  if (loading)
    return (
      <div className="py-16 text-center text-muted-foreground">Đang tải…</div>
    )

  const currentDay = days.find((d) => d.id === selectedDay)

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href={`/trips/${tripId}`}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Lịch trình
          </Link>
        </Button>
        <h1 className="font-display text-xl font-bold text-ink sm:text-2xl">
          Cấu hình lịch trình
        </h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Left: Days */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-ink">Các ngày</h2>
            <Button size="sm" onClick={addDay}>
              <CalendarPlus className="mr-1 h-4 w-4" /> Thêm ngày
            </Button>
          </div>

          {days.map((day) => (
            <div
              key={day.id}
              className={`cursor-pointer rounded-xl border p-4 transition-colors ${
                selectedDay === day.id
                  ? 'border-sea/40 bg-sea-soft/50'
                  : 'border-line bg-card hover:border-sea/20'
              }`}
              onClick={() => setSelectedDay(day.id)}
            >
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <span className="text-sm font-semibold text-ink">
                    Ngày {day.day_number}{' '}
                    <span className="font-normal text-muted-foreground">
                      — {formatDate(day.date)}
                    </span>
                  </span>
                  {day.label && (
                    <p className="text-xs text-muted-foreground">{day.label}</p>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteDay(day.id)
                  }}
                  className="text-muted-foreground/40 hover:text-rose-500"
                  aria-label="Xóa ngày"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(e) => handleDragEnd(e, day.id)}
              >
                <SortableContext
                  items={day.destinations.map((d: any) => d.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div
                    className="space-y-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {day.destinations.map((dest: any) => (
                      <SortableDestItem
                        key={dest.id}
                        dest={dest}
                        onEdit={(d: any) => {
                          setSelectedDay(day.id)
                          startEdit(d)
                        }}
                        onDelete={deleteDest}
                        onReplace={(d: any) => {
                          setSelectedDay(day.id)
                          startReplace(d)
                        }}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              {selectedDay === day.id && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 w-full border-dashed"
                  onClick={(e) => {
                    e.stopPropagation()
                    resetForm()
                  }}
                >
                  <Plus className="mr-1 h-3 w-3" /> Thêm điểm đến
                </Button>
              )}
            </div>
          ))}

          {days.length === 0 && (
            <div className="rounded-xl border border-dashed border-line bg-card py-10 text-center text-muted-foreground">
              Chưa có ngày nào. Nhấn “Thêm ngày” để bắt đầu.
            </div>
          )}
        </div>

        {/* Right: Destination form */}
        {selectedDay && (
          <div className="h-fit space-y-4 rounded-xl border border-line bg-card p-5 md:sticky md:top-20">
            <h2 className="font-semibold text-ink">
              {editingDest ? 'Sửa điểm đến' : 'Thêm điểm đến'} — Ngày{' '}
              {currentDay?.day_number}
            </h2>
            <div className="space-y-1.5">
              <Label>Tên điểm đến *</Label>
              <Input
                value={destForm.name}
                onChange={(e) =>
                  setDestForm({ ...destForm, name: e.target.value })
                }
                placeholder="VD: Bà Nà Hills"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Mô tả / ghi chú</Label>
              <Input
                value={destForm.description}
                onChange={(e) =>
                  setDestForm({ ...destForm, description: e.target.value })
                }
                placeholder="Lưu ý khi đến…"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Địa chỉ</Label>
              <Input
                value={destForm.address}
                onChange={(e) =>
                  setDestForm({ ...destForm, address: e.target.value })
                }
                placeholder="VD: Núi Chúa, Hòa Ninh, Đà Nẵng"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Giờ bắt đầu</Label>
                <Input
                  type="time"
                  value={destForm.start_time}
                  onChange={(e) => {
                    setDestForm({ ...destForm, start_time: e.target.value })
                    const d = currentDay?.date.slice(0, 10)
                    checkConflict(
                      selectedDay,
                      `${d}T${e.target.value}`,
                      `${d}T${destForm.end_time}`,
                      editingDest?.id
                    )
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Giờ kết thúc</Label>
                <Input
                  type="time"
                  value={destForm.end_time}
                  onChange={(e) => {
                    setDestForm({ ...destForm, end_time: e.target.value })
                    const d = currentDay?.date.slice(0, 10)
                    checkConflict(
                      selectedDay,
                      `${d}T${destForm.start_time}`,
                      `${d}T${e.target.value}`,
                      editingDest?.id
                    )
                  }}
                />
              </div>
            </div>
            {conflict && (
              <div className="flex items-center gap-2 rounded-lg border border-sun/30 bg-sun-soft px-3 py-2 text-sm text-sun-deep">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {conflict}
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Ngân sách dự tính (VND)</Label>
              <Input
                type="number"
                value={destForm.budget_estimate}
                onChange={(e) =>
                  setDestForm({ ...destForm, budget_estimate: e.target.value })
                }
                placeholder="500000"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={saveDest} className="flex-1" disabled={!destForm.name}>
                {editingDest ? 'Cập nhật' : 'Thêm điểm đến'}
              </Button>
              <Button variant="outline" onClick={resetForm}>
                Hủy
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Replace destination dialog */}
      <Dialog
        open={!!replacing}
        onOpenChange={(open) => {
          if (!open) {
            setReplacing(null)
            setReplaceForm(emptyReplaceForm)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thay thế điểm đến</DialogTitle>
            <DialogDescription>
              “{replacing?.name}” sẽ chuyển sang trạng thái “Đã thay” và giữ lại
              lịch sử. Điểm mới được thêm ngay sau nó.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Tên điểm đến mới *</Label>
              <Input
                value={replaceForm.name}
                onChange={(e) =>
                  setReplaceForm({ ...replaceForm, name: e.target.value })
                }
                placeholder="VD: Núi Bà Đen"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Giờ bắt đầu</Label>
                <Input
                  type="time"
                  value={replaceForm.start_time}
                  onChange={(e) =>
                    setReplaceForm({
                      ...replaceForm,
                      start_time: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Giờ kết thúc</Label>
                <Input
                  type="time"
                  value={replaceForm.end_time}
                  onChange={(e) =>
                    setReplaceForm({
                      ...replaceForm,
                      end_time: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Ngân sách dự tính (VND)</Label>
              <Input
                type="number"
                value={replaceForm.budget_estimate}
                onChange={(e) =>
                  setReplaceForm({
                    ...replaceForm,
                    budget_estimate: e.target.value,
                  })
                }
                placeholder="500000"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={replaceDest}
                className="flex-1"
                disabled={!replaceForm.name || replaceBusy}
              >
                {replaceBusy ? 'Đang thay…' : 'Xác nhận thay thế'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setReplacing(null)
                  setReplaceForm(emptyReplaceForm)
                }}
              >
                Hủy
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
