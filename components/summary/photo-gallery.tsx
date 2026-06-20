'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface Photo {
  id: string
  file_path: string
  file_name: string
  day_number: number
  day_label: string | null
}

export function PhotoGallery({ photos }: { photos: Photo[] }) {
  const [filter, setFilter] = useState<number | null>(null)
  const [lightbox, setLightbox] = useState<string | null>(null)

  const days = Array.from(new Set(photos.map((p) => p.day_number))).sort(
    (a, b) => a - b
  )
  const filtered = filter == null ? photos : photos.filter((p) => p.day_number === filter)

  // Close lightbox on Escape
  useEffect(() => {
    if (!lightbox) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setLightbox(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={filter == null ? 'default' : 'outline'}
          onClick={() => setFilter(null)}
        >
          Tất cả ({photos.length})
        </Button>
        {days.map((d) => {
          const count = photos.filter((p) => p.day_number === d).length
          return (
            <Button
              key={d}
              size="sm"
              variant={filter === d ? 'default' : 'outline'}
              onClick={() => setFilter(d)}
            >
              Ngày {d} ({count})
            </Button>
          )
        })}
      </div>

      <div className="columns-2 gap-2.5 [column-fill:_balance] md:columns-3 lg:columns-4">
        {filtered.map((photo) => (
          <button
            key={photo.id}
            className="mb-2.5 block w-full overflow-hidden rounded-xl border border-line transition-opacity hover:opacity-90"
            onClick={() => setLightbox(photo.file_path)}
          >
            <Image
              src={photo.file_path}
              alt={photo.file_name}
              width={400}
              height={300}
              className="h-auto w-full object-cover"
            />
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="py-8 text-center text-muted-foreground">
          Chưa có ảnh nào.
        </p>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/85 p-4 backdrop-blur-sm"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            className="absolute right-4 top-4 text-white/90 hover:text-white"
            onClick={() => setLightbox(null)}
            aria-label="Đóng"
          >
            <X className="h-8 w-8" />
          </button>
          <Image
            src={lightbox}
            alt="Ảnh phóng to"
            width={1400}
            height={1000}
            className="max-h-[90vh] w-auto max-w-full rounded-lg object-contain"
          />
        </div>
      )}
    </div>
  )
}
