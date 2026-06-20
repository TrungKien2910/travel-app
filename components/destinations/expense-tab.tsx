'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UserAvatar } from '@/components/ui/user-avatar'
import { ExpenseProgress } from '@/components/ui/expense-progress'
import { formatVND } from '@/lib/format'
import { Plus, Trash2, Split } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export function ExpenseTab({ expenses, members, budget, destId, isAdmin }: any) {
  const router = useRouter()
  const [addForm, setAddForm] = useState({ user_id: '', amount: '', note: '' })
  const [splitForm, setSplitForm] = useState<{
    total: string
    note: string
    user_ids: string[]
  }>({
    total: '',
    note: '',
    user_ids: members.map((m: any) => m.user_id),
  })
  const [splitOpen, setSplitOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const actual = expenses.reduce((s: number, e: any) => s + e.amount, 0)

  const byUser: Record<string, { user: any; items: any[]; total: number }> = {}
  for (const exp of expenses) {
    if (!byUser[exp.user_id])
      byUser[exp.user_id] = { user: exp.user, items: [], total: 0 }
    byUser[exp.user_id].items.push(exp)
    byUser[exp.user_id].total += exp.amount
  }

  async function addExpense() {
    if (!addForm.user_id || !addForm.amount) return
    setBusy(true)
    await fetch(`/api/destinations/${destId}/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: addForm.user_id,
        amount: Number(addForm.amount),
        note: addForm.note,
      }),
    })
    setAddForm({ user_id: '', amount: '', note: '' })
    setBusy(false)
    router.refresh()
  }

  async function deleteExpense(id: string) {
    await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  async function splitExpense() {
    if (!splitForm.total || !splitForm.user_ids.length) return
    setBusy(true)
    await fetch(`/api/destinations/${destId}/expenses/split`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        total: Number(splitForm.total),
        note: splitForm.note,
        user_ids: splitForm.user_ids,
      }),
    })
    setSplitOpen(false)
    setSplitForm({
      total: '',
      note: '',
      user_ids: members.map((m: any) => m.user_id),
    })
    setBusy(false)
    router.refresh()
  }

  return (
    <div className="space-y-5">
      <ExpenseProgress actual={actual} budget={budget} />

      {Object.values(byUser).map(({ user, items, total }: any) => (
        <div key={user.id} className="space-y-1.5">
          <div className="flex items-center gap-2">
            <UserAvatar
              user={user}
              className="h-6 w-6"
              fallbackClassName="text-[10px]"
            />
            <span className="text-sm font-medium text-ink">{user.name}</span>
            <span className="tabular ml-auto text-sm font-medium text-ink">
              {formatVND(total)}
            </span>
          </div>
          {items.map((item: any) => (
            <div
              key={item.id}
              className="flex items-center gap-2 pl-8 text-xs text-muted-foreground"
            >
              <span className="flex-1 truncate">{item.note || '—'}</span>
              <span className="tabular">{formatVND(item.amount)}</span>
              {isAdmin && (
                <button
                  onClick={() => deleteExpense(item.id)}
                  className="text-muted-foreground/40 hover:text-rose-500"
                  aria-label="Xóa khoản chi"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      ))}

      {expenses.length === 0 && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Chưa có khoản chi tiêu nào.
        </p>
      )}

      {isAdmin && (
        <div className="space-y-3 border-t border-line pt-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div>
              <Label className="text-xs">Thành viên</Label>
              <select
                className="mt-1 h-10 w-full rounded-md border border-input bg-card px-2 text-sm"
                value={addForm.user_id}
                onChange={(e) =>
                  setAddForm({ ...addForm, user_id: e.target.value })
                }
              >
                <option value="">Chọn…</option>
                {members.map((m: any) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.user.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Số tiền (VND)</Label>
              <Input
                type="number"
                className="mt-1"
                value={addForm.amount}
                onChange={(e) =>
                  setAddForm({ ...addForm, amount: e.target.value })
                }
                placeholder="50000"
              />
            </div>
            <div>
              <Label className="text-xs">Ghi chú</Label>
              <Input
                className="mt-1"
                value={addForm.note}
                onChange={(e) =>
                  setAddForm({ ...addForm, note: e.target.value })
                }
                placeholder="Ăn trưa…"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={addExpense} disabled={busy}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Thêm chi tiêu
            </Button>

            <Dialog open={splitOpen} onOpenChange={setSplitOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Split className="mr-1 h-3.5 w-3.5" /> Chia tiền nhóm
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Chia tiền nhóm</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Tổng số tiền (VND)</Label>
                    <Input
                      type="number"
                      value={splitForm.total}
                      onChange={(e) =>
                        setSplitForm({ ...splitForm, total: e.target.value })
                      }
                      placeholder="300000"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Ghi chú</Label>
                    <Input
                      value={splitForm.note}
                      onChange={(e) =>
                        setSplitForm({ ...splitForm, note: e.target.value })
                      }
                      placeholder="Vé tham quan…"
                    />
                  </div>
                  <div>
                    <Label>Chia cho</Label>
                    <div className="mt-1.5 space-y-1.5">
                      {members.map((m: any) => (
                        <label
                          key={m.user_id}
                          className="flex cursor-pointer items-center gap-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-[#0E7C9D]"
                            checked={splitForm.user_ids.includes(m.user_id)}
                            onChange={(e) =>
                              setSplitForm({
                                ...splitForm,
                                user_ids: e.target.checked
                                  ? [...splitForm.user_ids, m.user_id]
                                  : splitForm.user_ids.filter(
                                      (id) => id !== m.user_id
                                    ),
                              })
                            }
                          />
                          {m.user.name}
                        </label>
                      ))}
                    </div>
                    {splitForm.user_ids.length > 0 && splitForm.total && (
                      <p className="mt-2 text-xs font-medium text-sea-deep">
                        Mỗi người:{' '}
                        {formatVND(
                          Math.floor(
                            Number(splitForm.total) / splitForm.user_ids.length
                          )
                        )}
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={splitExpense}
                    disabled={busy}
                    className="w-full"
                  >
                    Xác nhận chia tiền
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      )}
    </div>
  )
}
