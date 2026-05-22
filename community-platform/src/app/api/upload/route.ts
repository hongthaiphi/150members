import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const bucket = formData.get('bucket') as string | null

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'File type not allowed' }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 })
  }

  const ext = file.name.split('.').pop()
  const targetBucket = bucket === 'spaces' ? 'spaces' : 'avatars'
  const path = `${user.id}/${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from(targetBucket)
    .upload(path, file, { upsert: true, contentType: file.type })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage.from(targetBucket).getPublicUrl(path)

  return NextResponse.json({ url: publicUrl })
}
