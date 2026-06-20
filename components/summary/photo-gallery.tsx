'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Lightbox } from '@/components/ui/lightbox'

interface Photo {
  id: string
  file_path: string
  file_name: string
  day_number: number
  day_label: string | null
}

export function PhotoGallery({ photos }: { photos: Photo[] }) {
  const [filter, setFilter] = useState<number | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const days = Array.from(new Set(photos.map((p) => p.day_number))).sort(
    (a, b) => a - b
  )
  const filtered =
    filter == null ? photos : photos.filter((p) => p.day_number === filter)

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
        {filtered.map((photo, i) => (
          <button
            key={photo.id}
            className="mb-2.5 block w-full cursor-zoom-in overflow-hidden rounded-xl border border-line transition-opacity hover:opacity-90"
            onClick={() => setLightboxIndex(i)}
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

      <Lightbox
        images={filtered.map((p) => ({
          src: p.file_path,
          alt: p.file_name,
          caption: `Ngày ${p.day_number}`,
        }))}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
      />
    </div>
  )
}
