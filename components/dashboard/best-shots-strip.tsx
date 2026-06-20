import Link from 'next/link'
import { Star } from 'lucide-react'

interface BestShot {
  id: string
  file_path: string
  file_name: string
  destId: string
}

export function BestShotsStrip({
  tripId,
  photos,
}: {
  tripId: string
  photos: BestShot[]
}) {
  if (photos.length === 0) return null

  return (
    <div className="rounded-2xl border border-line bg-card p-6">
      <h2 className="mb-4 flex items-center gap-2 font-semibold text-ink">
        <Star className="h-4 w-4 fill-sun text-sun" />
        Ảnh đẹp gần nhất
      </h2>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {photos.map((p) => (
          <Link
            key={p.id}
            href={`/trips/${tripId}/destination/${p.destId}`}
            className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-line"
          >
            {/* Plain <img>: avatar_url/photo URLs are local /uploads paths */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.file_path}
              alt={p.file_name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute right-1.5 top-1.5 rounded-full bg-sun p-1 shadow-sm">
              <Star className="h-3 w-3 fill-white text-white" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
