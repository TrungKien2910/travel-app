'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { UserAvatar } from '@/components/ui/user-avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { UserPlus, Trash2, Search } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface Member {
  user_id: string
  user: { id: string; name: string; email: string; avatar_url?: string | null }
}

export function MemberGrid({
  initialMembers,
  tripId,
  isAdmin,
}: {
  initialMembers: Member[]
  tripId: string
  isAdmin: boolean
}) {
  const router = useRouter()
  const [members, setMembers] = useState(initialMembers)
  const [searchEmail, setSearchEmail] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    const t = setTimeout(async () => {
      if (searchEmail.length < 2) {
        setSearchResults([])
        return
      }
      setSearching(true)
      const res = await fetch(
        `/api/users/search?email=${encodeURIComponent(searchEmail)}`
      )
      setSearchResults(await res.json())
      setSearching(false)
    }, 300)
    return () => clearTimeout(t)
  }, [searchEmail])

  async function addMember(userId: string) {
    if (adding) return
    setAdding(true)
    const res = await fetch(`/api/trips/${tripId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    })
    setAdding(false)
    if (res.ok) {
      setAddOpen(false)
      setSearchEmail('')
      router.refresh()
    }
  }

  async function removeMember(userId: string) {
    if (
      !confirm(
        'Xóa thành viên này? Chi tiêu và cảm nhận của họ vẫn được giữ lại.'
      )
    )
      return
    await fetch(`/api/trips/${tripId}/members/${userId}`, { method: 'DELETE' })
    setMembers(members.filter((m) => m.user_id !== userId))
    router.refresh()
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold text-ink">
          Thành viên ({members.length})
        </h2>
        {isAdmin && (
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <UserPlus className="mr-1 h-4 w-4" /> Thêm thành viên
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Thêm thành viên</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm theo email…"
                    className="pl-9"
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    autoFocus
                  />
                </div>
                {searching && (
                  <p className="text-center text-xs text-muted-foreground">
                    Đang tìm…
                  </p>
                )}
                <div className="max-h-56 space-y-1 overflow-y-auto">
                  {searchResults.map((user) => {
                    const alreadyMember = members.some(
                      (m) => m.user_id === user.id
                    )
                    return (
                      <button
                        key={user.id}
                        disabled={alreadyMember || adding}
                        onClick={() => addMember(user.id)}
                        className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-sea-soft disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-sea-soft text-xs font-semibold text-sea-deep">
                            {user.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-ink">
                            {user.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                        {alreadyMember && (
                          <span className="ml-auto text-xs text-muted-foreground">
                            Đã có
                          </span>
                        )}
                      </button>
                    )
                  })}
                  {searchEmail.length >= 2 &&
                    !searching &&
                    searchResults.length === 0 && (
                      <p className="py-3 text-center text-sm text-muted-foreground">
                        Không tìm thấy người dùng.
                      </p>
                    )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {members.map((member) => (
          <div
            key={member.user_id}
            className="group relative flex flex-col items-center gap-2 rounded-xl border border-line bg-card p-4 text-center"
          >
            <UserAvatar
              user={member.user}
              className="h-12 w-12 ring-1 ring-line"
              fallbackClassName="text-base"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">
                {member.user.name}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {member.user.email}
              </p>
            </div>
            {isAdmin && (
              <button
                onClick={() => removeMember(member.user_id)}
                className="absolute right-2 top-2 text-muted-foreground/40 opacity-0 transition-opacity hover:text-rose-500 group-hover:opacity-100"
                aria-label="Xóa thành viên"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
