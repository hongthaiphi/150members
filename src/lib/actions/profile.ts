'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type ProfileFormData = {
  display_name: string
  bio: string
  social_links: {
    twitter?: string
    linkedin?: string
    website?: string
    github?: string
  }
}

export async function updateProfile(data: ProfileFormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  // H-4: Server-side length validation — client Zod can be bypassed via direct SA call
  const displayName = (data.display_name ?? '').trim()
  const bio = (data.bio ?? '').trim()
  if (displayName.length > 50) return { error: 'Tên hiển thị tối đa 50 ký tự' }
  if (bio.length > 300) return { error: 'Bio tối đa 300 ký tự' }

  const { twitter, linkedin, website, github } = data.social_links ?? {}
  if (twitter && twitter.length > 100) return { error: 'Twitter handle tối đa 100 ký tự' }
  if (linkedin && linkedin.length > 100) return { error: 'LinkedIn handle tối đa 100 ký tự' }
  if (github && github.length > 100) return { error: 'GitHub handle tối đa 100 ký tự' }
  if (website) {
    if (website.length > 200) return { error: 'Website URL tối đa 200 ký tự' }
    if (!/^https?:\/\//i.test(website)) return { error: 'Website phải bắt đầu bằng http:// hoặc https://' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      display_name: displayName || null,
      bio: bio || null,
      social_links: data.social_links,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) return { error: error.message }

  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single()

  if (profile?.username) {
    revalidatePath(`/profile/${profile.username}`)
  }
  revalidatePath('/settings/profile')
  return { success: true }
}

export async function updateAvatar(avatarUrl: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  if (error) return { error: error.message }

  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single()

  if (profile?.username) {
    revalidatePath(`/profile/${profile.username}`)
  }
  revalidatePath('/settings/profile')
  return { success: true }
}
