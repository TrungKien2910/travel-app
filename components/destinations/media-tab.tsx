'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Lightbox } from '@/components/ui/lightbox'
import {
  Upload,
  Trash2,
  Star,
  ReceiptText,
  ImageIcon,
  Maximize2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function MediaTab({ media, destId, isAdmin }: any) {
  const router = useRouter()
  const photoRef = useRef<HTMLInputElement>(null)
  const billRef = useRef<HTMLInputElement>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [billLightboxIndex, setBillLightboxIndex] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const photos = media.filter((m: any) => m.type === 'PHOTO')
  const bills = media.filter((m: any) => m.type === 'BILL')
  const lightboxImages = photos.map((p: any) => ({
    src: p.file_path,
    alt: p.file_name,
    caption: p.file_name,
  }))
  const billImages = bills.map((b: any) => ({
    src: b.file_path,
    alt: b.file_name,
    caption: b.file_name,
  }))

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
            {photos.map((photo: any, i: number) => (
              <div
                key={photo.id}
                className="group relative aspect-square overflow-hidden rounded-xl border border-line bg-muted"
              >
                <button
                  type="button"
                  onClick={() => setLightboxIndex(i)}
                  className="absolute inset-0 h-full w-full cursor-zoom-in"
                  aria-label={`Xem ảnh ${photo.file_name}`}
                >
                  <Image
                    src={photo.file_path}
                    alt={photo.file_name}
                    fill
                    sizes="(max-width: 768px) 50vw, 33vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {/* Zoom hint on hover */}
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-ink/20 opacity-0 transition-opacity group-hover:opacity-100">
                    <Maximize2 className="h-6 w-6 text-white drop-shadow" />
                  </span>
                </button>

                {isAdmin && (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-end gap-2 p-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleBestShot(photo.id)
                      }}
                      className={cn(
                        'pointer-events-auto rounded-full p-2 shadow',
                        photo.is_best_shot
                          ? 'bg-sun text-white'
                          : 'bg-white/90 text-ink'
                      )}
                      aria-label="Đánh dấu ảnh đẹp"
                    >
                      <Star className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteMedia(photo.id)
                      }}
                      className="pointer-events-auto rounded-full bg-rose-500 p-2 text-white shadow"
                      aria-label="Xóa ảnh"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
                {photo.is_best_shot && (
                  <div className="pointer-events-none absolute right-1.5 top-1.5 rounded-full bg-sun p-1 shadow-sm">
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
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => upload(e.target.files, 'BILL')}
              />
            </>
          )}
        </div>

        {bills.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-line p-8 text-center text-muted-foreground/60">
            <ReceiptText className="mx-auto mb-2 h-8 w-8" />
            <p className="text-sm">Chưa có bill nào.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {bills.map((bill: any, i: number) => (
              <div
                key={bill.id}
                className="group relative aspect-square overflow-hidden rounded-xl border border-line bg-muted"
              >
                <button
                  type="button"
                  onClick={() => setBillLightboxIndex(i)}
                  className="absolute inset-0 h-full w-full cursor-zoom-in"
                  aria-label={`Xem bill ${bill.file_name}`}
                >
                  <Image
                    src={bill.file_path}
                    alt={bill.file_name}
                    fill
                    sizes="(max-width: 768px) 50vw, 33vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-ink/20 opacity-0 transition-opacity group-hover:opacity-100">
                    <Maximize2 className="h-6 w-6 text-white drop-shadow" />
                  </span>
                </button>

                {/* Bill tag */}
                <span className="pointer-events-none absolute left-1.5 top-1.5 rounded-full bg-sun/90 px-2 py-0.5 text-[10px] font-medium text-white shadow-sm">
                  Bill
                </span>

                {isAdmin && (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-end p-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteMedia(bill.id)
                      }}
                      className="pointer-events-auto rounded-full bg-rose-500 p-2 text-white shadow"
                      aria-label="Xóa bill"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Lightbox
        images={lightboxImages}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
      />
      <Lightbox
        images={billImages}
        index={billLightboxIndex}
        onClose={() => setBillLightboxIndex(null)}
      />
    </div>
  )
}
