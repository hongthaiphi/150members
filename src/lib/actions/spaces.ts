'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export type SpaceFormData = {
  name: string
  description?: string
  is_private: boolean
  icon?: string
}

export async function createSpace(data: SpaceFormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  let slug = slugify(data.name)

  // Handle slug collision
  const { data: existing } = await supabase
    .from('spaces')
    .select('slug')
    .eq('slug', slug)
    .single()

  if (existing) slug = `${slug}-${Date.now()}`

  const { data: space, error } = await supabase
    .from('spaces')
    .insert({
      name: data.name,
      slug,
      description: data.description || null,
      is_private: data.is_private,
      icon: data.icon || null,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  // Auto-join creator
  await supabase.from('space_members').insert({ space_id: space.id, user_id: user.id })

  revalidatePath('/spaces')
  redirect(`/spaces/${space.slug}`)
}

export async function updateSpace(
  spaceId: string,
  data: Partial<SpaceFormData> & { cover_image?: string }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  const { data: existing } = await supabase
    .from('spaces')
    .select('created_by')
    .eq('id', spaceId)
    .single()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isOwner = existing?.created_by === user.id
  const isPrivileged = profile?.role === 'admin' || profile?.role === 'moderator'
  if (!isOwner && !isPrivileged) return { error: 'Không có quyền chỉnh sửa Space' }

  const { data: space, error } = await supabase
    .from('spaces')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', spaceId)
    .select('slug')
    .single()

  if (error) return { error: error.message }

  revalidatePath(`/spaces/${space.slug}`)
  revalidatePath(`/spaces/${space.slug}/settings`)
  return { success: true }
}

export async function deleteSpace(spaceId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  // Only admin can delete
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return { error: 'Không có quyền xóa Space' }

  const { error } = await supabase.from('spaces').delete().eq('id', spaceId)
  if (error) return { error: error.message }

  revalidatePath('/spaces')
  redirect('/spaces')
}

export async function joinSpace(spaceId: string, slug: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  const { error } = await supabase
    .from('space_members')
    .insert({ space_id: spaceId, user_id: user.id })

  if (error && error.code !== '23505') return { error: error.message }

  revalidatePath(`/spaces/${slug}`)
  return { success: true }
}

export async function leaveSpace(spaceId: string, slug: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  const { error } = await supabase
    .from('space_members')
    .delete()
    .eq('space_id', spaceId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath(`/spaces/${slug}`)
  return { success: true }
}
