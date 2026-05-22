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

  const { error } = await supabase
    .from('profiles')
    .update({
      display_name: data.display_name || null,
      bio: data.bio || null,
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

  revalidatePath(`/profile/${profile?.username}`)
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

  revalidatePath(`/profile/${profile?.username}`)
  revalidatePath('/settings/profile')
  return { success: true }
}
