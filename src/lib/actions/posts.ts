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

  const { data: post } = await supabase.from('posts').select('author_id').eq('id', postId).single()
  const profile = await getProfile(supabase, user.id)

  if (post?.author_id !== user.id && profile?.role !== 'admin' && profile?.role !== 'moderator') {
    return { error: 'Không có quyền chỉnh sửa' }
  }

  const { error } = await supabase
    .from('posts')
    .update({ title: data.title, content: data.content, updated_at: new Date().toISOString() })
    .eq('id', postId)

  if (error) return { error: error.message }

  revalidatePath(`/spaces/${spaceSlug}/posts/${postId}`)
  redirect(`/spaces/${spaceSlug}/posts/${postId}`)
}

export async function deletePost(postId: string, spaceSlug: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  const { data: post } = await supabase.from('posts').select('author_id').eq('id', postId).single()
  const profile = await getProfile(supabase, user.id)

  if (post?.author_id !== user.id && profile?.role !== 'admin' && profile?.role !== 'moderator') {
    return { error: 'Không có quyền xóa' }
  }

  const { error } = await supabase.from('posts').delete().eq('id', postId)
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

  const { error } = await supabase
    .from('posts')
    .update({ is_pinned: !currentlyPinned })
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
