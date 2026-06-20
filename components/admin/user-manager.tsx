'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UserAvatar } from '@/components/ui/user-avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { formatDate } from '@/lib/format'
import { UserPlus, Pencil, Trash2, ShieldCheck, User as UserIcon } from 'lucide-react'

interface ManagedUser {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'VIEWER'
  avatar_url?: string | null
  created_at: string
  _count: { trip_memberships: number; trips_created: number }
}

const emptyCreate = {
  name: '',
  email: '',
  password: '',
  role: 'VIEWER' as 'ADMIN' | 'VIEWER',
}

export function UserManager({
  initialUsers,
  currentUserId,
}: {
  initialUsers: ManagedUser[]
  currentUserId: string
}) {
  const [users, setUsers] = useState<ManagedUser[]>(initialUsers)
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState(emptyCreate)
  const [editing, setEditing] = useState<ManagedUser | null>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    role: 'VIEWER' as 'ADMIN' | 'VIEWER',
    password: '',
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function createUser() {
    setError('')
    setBusy(true)
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createForm),
    })
    setBusy(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Không tạo được tài khoản.')
      return
    }
    const created = await res.json()
    setUsers([
      ...users,
      { ...created, _count: { trip_memberships: 0, trips_created: 0 } },
    ])
    setCreateForm(emptyCreate)
    setCreateOpen(false)
  }

  function startEdit(u: ManagedUser) {
    setEditing(u)
    setEditForm({ name: u.name, role: u.role, password: '' })
    setError('')
  }

  async function saveEdit() {
    if (!editing) return
    setError('')
    setBusy(true)
    const res = await fetch(`/api/users/${editing.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editForm.name,
        role: editForm.role,
        password: editForm.password || undefined,
      }),
    })
    setBusy(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Không lưu được.')
      return
    }
    const updated = await res.json()
    setUsers(
      users.map((u) =>
        u.id === updated.id ? { ...u, name: updated.name, role: updated.role } : u
      )
    )
    setEditing(null)
  }

  async function deleteUser(u: ManagedUser) {
    if (!confirm(`Xóa tài khoản “${u.name}”? Hành động này không hoàn tác được.`))
      return
    const res = await fetch(`/api/users/${u.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      alert(d.error ?? 'Không xóa được tài khoản.')
      return
    }
    setUsers(users.filter((x) => x.id !== u.id))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">
            Quản lý tài khoản
          </h1>
          <p className="text-sm text-muted-foreground">
            {users.length} người dùng trong hệ thống
          </p>
        </div>
        <Button onClick={() => { setCreateForm(emptyCreate); setError(''); setCreateOpen(true) }}>
          <UserPlus className="mr-1.5 h-4 w-4" /> Thêm tài khoản
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-muted/40 text-left">
                <th className="p-3 font-semibold text-ink">Người dùng</th>
                <th className="p-3 font-semibold text-ink">Vai trò</th>
                <th className="hidden p-3 font-semibold text-ink sm:table-cell">
                  Chuyến đi
                </th>
                <th className="hidden p-3 font-semibold text-ink md:table-cell">
                  Tạo lúc
                </th>
                <th className="p-3 text-right font-semibold text-ink">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-line last:border-0 hover:bg-muted/30">
                  <td className="p-3">
                    <div className="flex items-center gap-2.5">
                      <UserAvatar
                        user={u}
                        className="h-9 w-9 ring-1 ring-line"
                      />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink">
                          {u.name}
                          {u.id === currentUserId && (
                            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                              (bạn)
                            </span>
                          )}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {u.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    {u.role === 'ADMIN' ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-sun/40 bg-sun-soft px-2 py-0.5 text-xs font-medium text-sun-deep">
                        <ShieldCheck className="h-3 w-3" /> Quản trị
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-line bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        <UserIcon className="h-3 w-3" /> Thành viên
                      </span>
                    )}
                  </td>
                  <td className="hidden p-3 text-muted-foreground sm:table-cell">
                    {u._count.trip_memberships}
                  </td>
                  <td className="hidden p-3 text-muted-foreground md:table-cell">
                    {formatDate(u.created_at)}
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => startEdit(u)}
                        className="rounded-md p-1.5 text-muted-foreground/60 hover:bg-sea-soft hover:text-sea"
                        aria-label="Sửa"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteUser(u)}
                        disabled={u.id === currentUserId}
                        className="rounded-md p-1.5 text-muted-foreground/60 hover:bg-rose-50 hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label="Xóa"
                        title={
                          u.id === currentUserId
                            ? 'Không thể tự xóa tài khoản của mình'
                            : 'Xóa'
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm tài khoản</DialogTitle>
            <DialogDescription>
              Tạo tài khoản mới cho thành viên trong nhóm.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Tên hiển thị *</Label>
              <Input
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm({ ...createForm, name: e.target.value })
                }
                placeholder="VD: Nguyễn Văn A"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input
                type="email"
                value={createForm.email}
                onChange={(e) =>
                  setCreateForm({ ...createForm, email: e.target.value })
                }
                placeholder="email@travel.app"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Mật khẩu * (≥ 6 ký tự)</Label>
              <Input
                type="text"
                value={createForm.password}
                onChange={(e) =>
                  setCreateForm({ ...createForm, password: e.target.value })
                }
                placeholder="Mật khẩu ban đầu"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Vai trò</Label>
              <Select
                value={createForm.role}
                onValueChange={(v) =>
                  setCreateForm({ ...createForm, role: v as 'ADMIN' | 'VIEWER' })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VIEWER">Thành viên (chỉ xem)</SelectItem>
                  <SelectItem value="ADMIN">Quản trị (toàn quyền)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && (
              <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            <div className="flex gap-2 pt-1">
              <Button onClick={createUser} className="flex-1" disabled={busy}>
                {busy ? 'Đang tạo…' : 'Tạo tài khoản'}
              </Button>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Hủy
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sửa tài khoản</DialogTitle>
            <DialogDescription>{editing?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Tên hiển thị</Label>
              <Input
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Vai trò</Label>
              <Select
                value={editForm.role}
                onValueChange={(v) =>
                  setEditForm({ ...editForm, role: v as 'ADMIN' | 'VIEWER' })
                }
                disabled={editing?.id === currentUserId}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VIEWER">Thành viên (chỉ xem)</SelectItem>
                  <SelectItem value="ADMIN">Quản trị (toàn quyền)</SelectItem>
                </SelectContent>
              </Select>
              {editing?.id === currentUserId && (
                <p className="text-xs text-muted-foreground">
                  Không thể tự đổi vai trò của chính mình.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Đặt lại mật khẩu</Label>
              <Input
                type="text"
                value={editForm.password}
                onChange={(e) =>
                  setEditForm({ ...editForm, password: e.target.value })
                }
                placeholder="Để trống nếu không đổi"
              />
            </div>
            {error && (
              <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            <div className="flex gap-2 pt-1">
              <Button onClick={saveEdit} className="flex-1" disabled={busy}>
                {busy ? 'Đang lưu…' : 'Lưu thay đổi'}
              </Button>
              <Button variant="outline" onClick={() => setEditing(null)}>
                Hủy
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
