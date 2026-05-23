'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function getProfile(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase.from('profiles').select('role').eq('id', userId).single()
  return data as { role: string } | null
}

export async function createComment(
  postId: string,
  spaceSlug: string,
  content: string,
  parentId?: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  // Verify user is a member of the space containing this post
  const { data: postForCheck } = await supabase
    .from('posts')
    .select('space_id')
    .eq('id', postId)
    .single()

  if (postForCheck) {
    const { data: spaceForCheck } = await supabase
      .from('spaces')
      .select('is_private')
      .eq('id', postForCheck.space_id)
      .single()

    if (spaceForCheck?.is_private) {
      const { data: membership } = await supabase
        .from('space_members')
        .select('user_id')
        .eq('space_id', postForCheck.space_id)
        .eq('user_id', user.id)
        .single()
      if (!membership) return { error: 'Bạn chưa tham gia Space này' }
    }
  }

  const { data: comment, error } = await supabase
    .from('comments')
    .insert({
      post_id: postId,
      author_id: user.id,
      content,
      parent_id: parentId ?? null,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  // Create notification for post author (if not self-comment)
  const { data: post } = await supabase
    .from('posts')
    .select('author_id, title, space_id')
    .eq('id', postId)
    .single()

  if (post && post.author_id !== user.id) {
    const { data: actor } = await supabase
      .from('profiles')
      .select('display_name, username')
      .eq('id', user.id)
      .single()
    const actorProfile = actor as { display_name: string | null; username: string } | null

    await supabase.from('notifications').insert({
      user_id: post.author_id,
      type: 'reply' as const,
      data: {
        post_id: postId,
        comment_id: comment?.id,
        space_slug: spaceSlug,
        is_reply: !!parentId,
        actor_name: actorProfile?.display_name ?? actorProfile?.username ?? 'Ai đó',
        post_title: (post as unknown as { title: string }).title,
      },
    })
  }

  revalidatePath(`/spaces/${spaceSlug}/posts/${postId}`)
  return { success: true }
}

export async function updateComment(
  commentId: string,
  postId: string,
  spaceSlug: string,
  content: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  const { data: comment } = await supabase
    .from('comments')
    .select('author_id')
    .eq('id', commentId)
    .single()

  const profile = await getProfile(supabase, user.id)
  if (comment?.author_id !== user.id && profile?.role !== 'admin' && profile?.role !== 'moderator') {
    return { error: 'Không có quyền chỉnh sửa' }
  }

  const { error } = await supabase
    .from('comments')
    .update({ content, updated_at: new Date().toISOString() })
    .eq('id', commentId)

  if (error) return { error: error.message }

  revalidatePath(`/spaces/${spaceSlug}/posts/${postId}`)
  return { success: true }
}

export async function deleteComment(commentId: string, postId: string, spaceSlug: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  const { data: comment } = await supabase
    .from('comments')
    .select('author_id')
    .eq('id', commentId)
    .single()

  const profile = await getProfile(supabase, user.id)
  if (comment?.author_id !== user.id && profile?.role !== 'admin' && profile?.role !== 'moderator') {
    return { error: 'Không có quyền xóa' }
  }

  const { error } = await supabase.from('comments').delete().eq('id', commentId)
  if (error) return { error: error.message }

  revalidatePath(`/spaces/${spaceSlug}/posts/${postId}`)
  return { success: true }
}

export async function toggleCommentReaction(commentId: string, postId: string, spaceSlug: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  const { data: existing } = await supabase
    .from('reactions')
    .select('id')
    .eq('user_id', user.id)
    .eq('target_id', commentId)
    .eq('target_type', 'comment')
    .single()

  if (existing) {
    await supabase.from('reactions').delete().eq('id', existing.id)
  } else {
    await supabase.from('reactions').insert({
      user_id: user.id,
      target_id: commentId,
      target_type: 'comment',
      emoji: '👍',
    })
  }

  revalidatePath(`/spaces/${spaceSlug}/posts/${postId}`)
  return { success: true, liked: !existing }
}
