'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type PostFormData = {
  title: string
  content: string
}

async function getProfile(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase.from('profiles').select('role, username').eq('id', userId).single()
  return data as { role: string; username: string } | null
}

export async function createPost(spaceId: string, spaceSlug: string, data: PostFormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  // Must be a space member
  const { data: membership } = await supabase
    .from('space_members')
    .select('user_id')
    .eq('space_id', spaceId)
    .eq('user_id', user.id)
    .single()

  if (!membership) return { error: 'Bạn chưa tham gia Space này' }

  const { data: post, error } = await supabase
    .from('posts')
    .insert({ space_id: spaceId, author_id: user.id, title: data.title, content: data.content })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath(`/spaces/${spaceSlug}`)
  redirect(`/spaces/${spaceSlug}/posts/${post.id}`)
}

export async function updatePost(
  postId: string,
  spaceSlug: string,
  data: PostFormData
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  const { data: space } = await supabase.from('spaces').select('id').eq('slug', spaceSlug).single()
  const { data: post } = await supabase.from('posts').select('author_id, space_id').eq('id', postId).single()
  const profile = await getProfile(supabase, user.id)

  if (!post || post.space_id !== space?.id) return { error: 'Bài viết không tồn tại' }
  if (post.author_id !== user.id && profile?.role !== 'admin' && profile?.role !== 'moderator') {
    return { error: 'Không có quyền chỉnh sửa' }
  }

  const { error } = await supabase
    .from('posts')
    .update({ title: data.title, content: data.content, updated_at: new Date().toISOString() })
    .eq('id', postId)
    .eq('space_id', space.id)

  if (error) return { error: error.message }

  revalidatePath(`/spaces/${spaceSlug}/posts/${postId}`)
  redirect(`/spaces/${spaceSlug}/posts/${postId}`)
}

export async function deletePost(postId: string, spaceSlug: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  const { data: space } = await supabase.from('spaces').select('id').eq('slug', spaceSlug).single()
  const { data: post } = await supabase.from('posts').select('author_id, space_id').eq('id', postId).single()
  const profile = await getProfile(supabase, user.id)

  if (!post || post.space_id !== space?.id) return { error: 'Bài viết không tồn tại' }
  if (post.author_id !== user.id && profile?.role !== 'admin' && profile?.role !== 'moderator') {
    return { error: 'Không có quyền xóa' }
  }

  const { error } = await supabase.from('posts').delete().eq('id', postId).eq('space_id', space.id)
  if (error) return { error: error.message }

  revalidatePath(`/spaces/${spaceSlug}`)
  redirect(`/spaces/${spaceSlug}`)
}

export async function togglePin(postId: string, spaceSlug: string, currentlyPinned: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  // Allow: admin, moderator, or space creator
  const profile = await getProfile(supabase, user.id)
  const { data: post } = await supabase.from('posts').select('space_id').eq('id', postId).single()
  const { data: space } = post
    ? await supabase.from('spaces').select('created_by').eq('id', post.space_id).single()
    : { data: null }

  const isSpaceCreator = space?.created_by === user.id
  const isPrivileged = profile?.role === 'admin' || profile?.role === 'moderator'

  if (!isSpaceCreator && !isPrivileged) {
    return { error: 'Chỉ Admin/Moderator/Người tạo Space mới có thể ghim bài viết' }
  }

  const { data: currentPost } = await supabase.from('posts').select('is_pinned').eq('id', postId).single()
  const { error } = await supabase
    .from('posts')
    .update({ is_pinned: !currentPost?.is_pinned })
    .eq('id', postId)

  if (error) return { error: error.message }

  revalidatePath(`/spaces/${spaceSlug}/posts/${postId}`)
  revalidatePath(`/spaces/${spaceSlug}`)
  return { success: true }
}

export async function toggleReaction(targetId: string, targetType: 'post' | 'comment', spaceSlug: string, postId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  const { data: existing } = await supabase
    .from('reactions')
    .select('id')
    .eq('user_id', user.id)
    .eq('target_id', targetId)
    .eq('target_type', targetType)
    .single()

  if (existing) {
    await supabase.from('reactions').delete().eq('id', existing.id)
  } else {
    await supabase.from('reactions').insert({
      user_id: user.id,
      target_id: targetId,
      target_type: targetType,
      emoji: '👍',
    })
  }

  revalidatePath(`/spaces/${spaceSlug}/posts/${postId}`)
  return { success: true, liked: !existing }
}

export type PostItem = {
  id: string
  title: string
  content: string
  created_at: string
  is_pinned: boolean
  profiles: { username: string; display_name: string | null; avatar_url: string | null } | null
}

export async function loadMorePosts(
  spaceId: string,
  cursor: { created_at: string; id: string },
  pageSize: number
): Promise<{ posts: PostItem[]; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: space } = await supabase
    .from('spaces')
    .select('is_private')
    .eq('id', spaceId)
    .single()

  if (space?.is_private) {
    if (!user) return { posts: [], error: 'Không có quyền truy cập' }
    const { data: member } = await supabase
      .from('space_members')
      .select('user_id')
      .eq('space_id', spaceId)
      .eq('user_id', user.id)
      .single()
    if (!member) return { posts: [], error: 'Không có quyền truy cập' }
  }

  const { data } = await supabase
    .from('posts')
    .select('id, title, content, created_at, is_pinned, profiles!author_id(username, display_name, avatar_url)')
    .eq('space_id', spaceId)
    .or(`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(pageSize)

  return { posts: (data ?? []) as unknown as PostItem[] }
}
