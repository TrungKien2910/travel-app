'use client'

import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

export interface LightboxImage {
  src: string
  alt?: string
  caption?: string
}

interface LightboxProps {
  images: LightboxImage[]
  /** Index to open at; null = closed. */
  index: number | null
  onClose: () => void
}

/**
 * Full-screen image viewer with prev/next. Keyboard: ←/→ to navigate, Esc to
 * close. Click the backdrop to close. Renders via portal so it escapes any
 * overflow/stacking context of its host.
 */
export function Lightbox({ images, index, onClose }: LightboxProps) {
  const [current, setCurrent] = useState(index ?? 0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])
  useEffect(() => {
    if (index != null) setCurrent(index)
  }, [index])

  const open = index != null && images.length > 0
  const count = images.length

  const go = useCallback(
    (dir: 1 | -1) => setCurrent((c) => (c + dir + count) % count),
    [count]
  )

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    // Lock body scroll while open.
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, go, onClose])

  if (!mounted || !open) return null

  const img = images[current]

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/90 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        className="absolute right-4 top-4 rounded-full p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        onClick={onClose}
        aria-label="Đóng"
      >
        <X className="h-7 w-7" />
      </button>

      {count > 1 && (
        <>
          <button
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white/90 transition-colors hover:bg-white/20 md:left-6"
            onClick={(e) => {
              e.stopPropagation()
              go(-1)
            }}
            aria-label="Ảnh trước"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white/90 transition-colors hover:bg-white/20 md:right-6"
            onClick={(e) => {
              e.stopPropagation()
              go(1)
            }}
            aria-label="Ảnh sau"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      <figure
        className="flex max-h-[92vh] max-w-[92vw] flex-col items-center gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img.src}
          alt={img.alt ?? ''}
          className="max-h-[84vh] max-w-full rounded-lg object-contain shadow-2xl"
        />
        <figcaption className="flex items-center gap-3 text-sm text-white/70">
          {img.caption && <span>{img.caption}</span>}
          {count > 1 && (
            <span className="tabular text-white/50">
              {current + 1} / {count}
            </span>
          )}
        </figcaption>
      </figure>
    </div>,
    document.body
  )
}
