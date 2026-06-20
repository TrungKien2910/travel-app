'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import {
  Upload,
  Trash2,
  Star,
  FileText,
  ExternalLink,
  ImageIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function MediaTab({ media, destId, isAdmin }: any) {
  const router = useRouter()
  const photoRef = useRef<HTMLInputElement>(null)
  const billRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const photos = media.filter((m: any) => m.type === 'PHOTO')
  const bills = media.filter((m: any) => m.type === 'BILL')

  async function upload(files: FileList | null, type: 'PHOTO' | 'BILL') {
    if (!files?.length) return
    setUploading(true)
    setError('')
    for (const file of Array.from(files)) {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('type', type)
      const res = await fetch(`/api/destinations/${destId}/media`, {
        method: 'POST',
        body: fd,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Upload thất bại')
      }
    }
    setUploading(false)
    router.refresh()
  }

  async function deleteMedia(id: string) {
    if (!confirm('Xóa file này?')) return
    await fetch(`/api/media/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  async function toggleBestShot(id: string) {
    await fetch(`/api/media/${id}/best-shot`, { method: 'PATCH' })
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Photos */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-medium text-ink">Ảnh ({photos.length})</h3>
          {isAdmin && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => photoRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="mr-1 h-3.5 w-3.5" />
                {uploading ? 'Đang tải…' : 'Thêm ảnh'}
              </Button>
              <input
                ref={photoRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => upload(e.target.files, 'PHOTO')}
              />
            </>
          )}
        </div>

        {photos.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-line p-8 text-center text-muted-foreground/60">
            <ImageIcon className="mx-auto mb-2 h-8 w-8" />
            <p className="text-sm">Chưa có ảnh nào.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {photos.map((photo: any) => (
              <div
                key={photo.id}
                className="group relative aspect-square overflow-hidden rounded-xl border border-line bg-muted"
              >
                <Image
                  src={photo.file_path}
                  alt={photo.file_name}
                  fill
                  sizes="(max-width: 768px) 50vw, 33vw"
                  className="object-cover"
                />
                {isAdmin && (
                  <div className="absolute inset-0 flex items-center justify-center gap-2 bg-ink/40 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => toggleBestShot(photo.id)}
                      className={cn(
                        'rounded-full p-2',
                        photo.is_best_shot
                          ? 'bg-sun text-white'
                          : 'bg-white/85 text-ink'
                      )}
                      aria-label="Đánh dấu ảnh đẹp"
                    >
                      <Star className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteMedia(photo.id)}
                      className="rounded-full bg-rose-500 p-2 text-white"
                      aria-label="Xóa ảnh"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
                {photo.is_best_shot && (
                  <div className="absolute right-1.5 top-1.5 rounded-full bg-sun p-1 shadow-sm">
                    <Star className="h-3 w-3 fill-white text-white" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bills */}
      <div className="border-t border-line pt-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-medium text-ink">
            Hóa đơn / Bill ({bills.length})
          </h3>
          {isAdmin && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => billRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="mr-1 h-3.5 w-3.5" /> Thêm bill
              </Button>
              <input
                ref={billRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,application/pdf"
                className="hidden"
                onChange={(e) => upload(e.target.files, 'BILL')}
              />
            </>
          )}
        </div>

        {bills.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Chưa có bill nào.
          </p>
        ) : (
          <div className="space-y-2">
            {bills.map((bill: any) => (
              <div
                key={bill.id}
                className="flex items-center gap-3 rounded-xl border border-line bg-card p-3"
              >
                <div className="rounded-lg bg-sun-soft p-2">
                  <FileText className="h-5 w-5 text-sun-deep" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">
                    {bill.file_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {bill.uploader?.name} ·{' '}
                    {(bill.file_size / 1024).toFixed(0)} KB
                  </p>
                </div>
                <a
                  href={bill.file_path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sea hover:text-sea-deep"
                  aria-label="Mở bill"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
                {isAdmin && (
                  <button
                    onClick={() => deleteMedia(bill.id)}
                    className="text-muted-foreground/40 hover:text-rose-500"
                    aria-label="Xóa bill"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
