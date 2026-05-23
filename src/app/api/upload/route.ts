import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_BUCKETS = ['avatars', 'spaces', 'posts'] as const

const EXT_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

// Magic bytes for supported image formats
const MAGIC: Array<{ mime: string; bytes: number[]; offset?: number }> = [
  { mime: 'image/jpeg', bytes: [0xFF, 0xD8, 0xFF] },
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4E, 0x47] },
  { mime: 'image/gif', bytes: [0x47, 0x49, 0x46] },
  { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 }, // RIFF
]

async function detectMimeType(file: File): Promise<string | null> {
  const buffer = await file.slice(0, 12).arrayBuffer()
  const bytes = new Uint8Array(buffer)

  for (const { mime, bytes: magic, offset = 0 } of MAGIC) {
    if (magic.every((b, i) => bytes[offset + i] === b)) {
      // Extra WebP check: bytes 8-11 must be 'WEBP'
      if (mime === 'image/webp') {
        const webp = [0x57, 0x45, 0x42, 0x50]
        if (!webp.every((b, i) => bytes[8 + i] === b)) continue
      }
      return mime
    }
  }
  return null
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const formBucket = formData.get('bucket') as string | null

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 })
  }

  // Validate bucket against allowlist
  if (!formBucket || !ALLOWED_BUCKETS.includes(formBucket as typeof ALLOWED_BUCKETS[number])) {
    return NextResponse.json({ error: 'Invalid bucket' }, { status: 400 })
  }
  const targetBucket = formBucket as typeof ALLOWED_BUCKETS[number]

  // Validate MIME type from magic bytes, not client-supplied Content-Type
  const detectedMime = await detectMimeType(file)
  if (!detectedMime || !ALLOWED_TYPES.includes(detectedMime)) {
    return NextResponse.json({ error: 'File type not allowed' }, { status: 400 })
  }

  // Derive extension from validated MIME type
  const ext = EXT_MAP[detectedMime] ?? 'bin'
  const path = `${user.id}/${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from(targetBucket)
    .upload(path, file, { upsert: true, contentType: detectedMime })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage.from(targetBucket).getPublicUrl(path)

  return NextResponse.json({ url: publicUrl })
}
