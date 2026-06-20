import { createClient } from '@supabase/supabase-js'

const BUCKET = 'media'

const supabaseUrl = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_KEY

// Server-only client. The service key bypasses RLS and must never reach the
// client. Singleton across hot reloads in dev.
const globalForStorage = globalThis as unknown as {
  supabaseStorage?: ReturnType<typeof createClient>
}

function client() {
  if (!supabaseUrl || !serviceKey)
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY')
  if (!globalForStorage.supabaseStorage) {
    globalForStorage.supabaseStorage = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }
  return globalForStorage.supabaseStorage
}

/**
 * Upload a file to the public `media` bucket and return its public URL.
 * `objectPath` is the in-bucket path, e.g. `tripId/destId/filename.jpg`.
 */
export async function uploadMedia(
  objectPath: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<string> {
  const { error } = await client()
    .storage.from(BUCKET)
    .upload(objectPath, body, { contentType, upsert: false })
  if (error) throw error

  const { data } = client().storage.from(BUCKET).getPublicUrl(objectPath)
  return data.publicUrl
}

/** Remove an object by its in-bucket path. Ignores "not found". */
export async function deleteMedia(objectPath: string): Promise<void> {
  await client().storage.from(BUCKET).remove([objectPath])
}

/**
 * Recover the in-bucket object path from a public URL we stored in file_path.
 * Public URLs look like:
 *   https://<ref>.supabase.co/storage/v1/object/public/media/<objectPath>
 * Returns null if the URL isn't a Supabase Storage URL (e.g. legacy /uploads).
 */
export function pathFromUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`
  const i = url.indexOf(marker)
  if (i === -1) return null
  return decodeURIComponent(url.slice(i + marker.length))
}
