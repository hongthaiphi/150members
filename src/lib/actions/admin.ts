'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { UserRole } from '@/types/database'

async function getAdminUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return null
  return user
}

export async function getAdminStats() {
  const adminUser = await getAdminUser()
  if (!adminUser) return { error: 'Không có quyền truy cập' }

  const supabase = await createClient()
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [membersRes, postsRes, spacesRes, newMembersRes, newPostsRes] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('posts').select('*', { count: 'exact', head: true }),
    supabase.from('spaces').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),
    supabase.from('posts').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),
  ])

  return {
    totalMembers: membersRes.count ?? 0,
    totalPosts: postsRes.count ?? 0,
    totalSpaces: spacesRes.count ?? 0,
    newMembersThisWeek: newMembersRes.count ?? 0,
    newPostsThisWeek: newPostsRes.count ?? 0,
  }
}

export async function getMembers(page = 1, limit = 20, search = '') {
  const adminUser = await getAdminUser()
  if (!adminUser) return { error: 'Không có quyền truy cập', data: null, count: 0 }

  const supabase = await createClient()
  const offset = (page - 1) * limit

  let query = supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, role, is_banned, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (search) {
    query = query.or(`username.ilike.%${search}%,display_name.ilike.%${search}%`)
  }

  const { data, error, count } = await query
  if (error) return { error: error.message, data: null, count: 0 }

  return { data, count: count ?? 0, error: null }
}

export async function changeRole(targetUserId: string, newRole: UserRole) {
  const adminUser = await getAdminUser()
  if (!adminUser) return { error: 'Không có quyền truy cập' }
  if (targetUserId === adminUser.id) return { error: 'Không thể thay đổi role của chính mình' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({ role: newRole, updated_at: new Date().toISOString() })
    .eq('id', targetUserId)

  if (error) return { error: error.message }

  revalidatePath('/admin/members')
  return { success: true }
}

export async function banMember(targetUserId: string) {
  const adminUser = await getAdminUser()
  if (!adminUser) return { error: 'Không có quyền truy cập' }
  if (targetUserId === adminUser.id) return { error: 'Không thể ban chính mình' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({ is_banned: true, updated_at: new Date().toISOString() })
    .eq('id', targetUserId)

  if (error) return { error: error.message }

  revalidatePath('/admin/members')
  return { success: true }
}

export async function unbanMember(targetUserId: string) {
  const adminUser = await getAdminUser()
  if (!adminUser) return { error: 'Không có quyền truy cập' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({ is_banned: false, updated_at: new Date().toISOString() })
    .eq('id', targetUserId)

  if (error) return { error: error.message }

  revalidatePath('/admin/members')
  return { success: true }
}

export async function inviteMember(email: string) {
  const adminUser = await getAdminUser()
  if (!adminUser) return { error: 'Không có quyền truy cập' }

  if (!email || !email.includes('@')) return { error: 'Email không hợp lệ' }

  const adminSupabase = createAdminClient()
  const { error } = await adminSupabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
  })

  if (error) return { error: error.message }
  return { success: true }
}

export async function adminDeletePost(postId: string) {
  const adminUser = await getAdminUser()
  if (!adminUser) return { error: 'Không có quyền truy cập' }

  const supabase = await createClient()

  const { data: post } = await supabase
    .from('posts')
    .select('space_id, spaces!space_id(slug)')
    .eq('id', postId)
    .single()

  const { error } = await supabase.from('posts').delete().eq('id', postId)
  if (error) return { error: error.message }

  const slug = (post?.spaces as { slug: string } | null)?.slug
  if (slug) revalidatePath(`/spaces/${slug}`)
  revalidatePath('/admin/content')
  return { success: true }
}

export async function adminDeleteComment(commentId: string) {
  const adminUser = await getAdminUser()
  if (!adminUser) return { error: 'Không có quyền truy cập' }

  const supabase = await createClient()
  const { error } = await supabase.from('comments').delete().eq('id', commentId)
  if (error) return { error: error.message }

  revalidatePath('/admin/content')
  return { success: true }
}

export async function getRecentContent(tab: 'posts' | 'comments' = 'posts') {
  const adminUser = await getAdminUser()
  if (!adminUser) return { error: 'Không có quyền truy cập', data: null }

  const supabase = await createClient()

  if (tab === 'posts') {
    const { data, error } = await supabase
      .from('posts')
      .select('id, title, created_at, author_id, space_id, profiles!author_id(username, display_name), spaces!space_id(name, slug)')
      .order('created_at', { ascending: false })
      .limit(30)

    if (error) return { error: error.message, data: null }
    return { data, error: null }
  } else {
    const { data, error } = await supabase
      .from('comments')
      .select('id, content, created_at, author_id, post_id, profiles!author_id(username, display_name)')
      .order('created_at', { ascending: false })
      .limit(30)

    if (error) return { error: error.message, data: null }
    return { data, error: null }
  }
}

export async function getCommunitySettings() {
  const supabase = await createClient()
  const { data } = await supabase.from('community_settings').select('*')

  const settings: Record<string, string> = {}
  data?.forEach((item) => {
    settings[item.key] = item.value
  })
  return settings
}

export async function updateCommunitySettings(settings: {
  community_name?: string
  community_logo_url?: string
  primary_color?: string
}) {
  const adminUser = await getAdminUser()
  if (!adminUser) return { error: 'Không có quyền truy cập' }

  const supabase = await createClient()
  const now = new Date().toISOString()

  const updates = Object.entries(settings)
    .filter(([, v]) => v !== undefined)
    .map(([key, value]) => ({ key, value: value!, updated_at: now }))

  for (const update of updates) {
    const { error } = await supabase
      .from('community_settings')
      .upsert(update, { onConflict: 'key' })
    if (error) return { error: error.message }
  }

  revalidatePath('/admin/settings')
  revalidatePath('/')
  return { success: true }
}
