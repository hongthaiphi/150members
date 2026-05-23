'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import sanitizeHtml from 'sanitize-html'
import { sendEmail } from '@/lib/email/client'
import { replyEmailHtml, mentionEmailHtml } from '@/lib/email/templates'

const COMMENT_MAX = 5_000

// Comments are plain text — strip all HTML tags
function sanitizeComment(text: string): string {
  return sanitizeHtml(text, { allowedTags: [], allowedAttributes: {} }).trim()
}

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

  const sanitized = sanitizeComment(content)
  if (!sanitized) return { error: 'Nội dung bình luận không được để trống' }
  if (sanitized.length > COMMENT_MAX) return { error: `Bình luận tối đa ${COMMENT_MAX} ký tự` }

  const { data: comment, error } = await supabase
    .from('comments')
    .insert({
      post_id: postId,
      author_id: user.id,
      content: sanitized,
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
    // Store actor_id (not actor_name) to avoid stale snapshot — display fetches fresh profile
    await supabase.from('notifications').insert({
      user_id: post.author_id,
      type: 'reply' as const,
      data: {
        post_id: postId,
        comment_id: comment?.id,
        space_slug: spaceSlug,
        is_reply: !!parentId,
        actor_id: user.id,
        post_title: (post as unknown as { title: string }).title,
      },
    })

    // Fire-and-forget email if the recipient has email_reply enabled
    sendEmailIfEnabled(supabase, post.author_id, async (email) => {
      const { data: actor } = await supabase
        .from('profiles')
        .select('display_name, username')
        .eq('id', user.id)
        .single()
      const actorName = actor?.display_name ?? actor?.username ?? 'Ai đó'
      const postUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/spaces/${spaceSlug}/posts/${postId}`
      await sendEmail({
        to: email,
        subject: `${actorName} ${parentId ? 'đã trả lời bình luận' : 'đã bình luận'} bài viết của bạn`,
        html: replyEmailHtml({
          actorName,
          postTitle: (post as unknown as { title: string }).title,
          postUrl,
          isReply: !!parentId,
        }),
      })
    }, 'email_reply')
  }

  // EMAIL-02: Send email to mentioned users (@username in content)
  const mentionedUsernames = extractMentions(sanitized)
  if (mentionedUsernames.length > 0) {
    const { data: mentionedProfiles } = await supabase
      .from('profiles')
      .select('id, username')
      .in('username', mentionedUsernames)

    for (const mentioned of mentionedProfiles ?? []) {
      if (mentioned.id === user.id) continue
      sendEmailIfEnabled(supabase, mentioned.id, async (email) => {
        const { data: actor } = await supabase
          .from('profiles')
          .select('display_name, username')
          .eq('id', user.id)
          .single()
        const actorName = actor?.display_name ?? actor?.username ?? 'Ai đó'
        const postUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/spaces/${spaceSlug}/posts/${postId}`
        await sendEmail({
          to: email,
          subject: `${actorName} đã nhắc đến bạn`,
          html: mentionEmailHtml({
            actorName,
            postTitle: (post as unknown as { title: string }).title ?? '',
            postUrl,
          }),
        })
      }, 'email_mention')
    }
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

  const sanitized = sanitizeComment(content)
  if (!sanitized) return { error: 'Nội dung bình luận không được để trống' }
  if (sanitized.length > COMMENT_MAX) return { error: `Bình luận tối đa ${COMMENT_MAX} ký tự` }

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
    .update({ content: sanitized, updated_at: new Date().toISOString() })
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

// Fetch user email + check their preference, then call cb (fire-and-forget)
function sendEmailIfEnabled(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  cb: (email: string) => Promise<void>,
  prefKey: 'email_reply' | 'email_mention'
): void {
  void (async () => {
    const [{ data: authUser }, { data: pref }] = await Promise.all([
      supabase.auth.admin.getUserById(userId).catch(() => ({ data: null })),
      supabase.from('email_preferences').select('email_reply, email_mention').eq('user_id', userId).single(),
    ])
    const email = (authUser as { user?: { email?: string } } | null)?.user?.email
    if (!email) return
    const prefRow = pref as { email_reply: boolean; email_mention: boolean } | null
    if (prefRow && prefRow[prefKey] === false) return
    await cb(email)
  })()
}

function extractMentions(text: string): string[] {
  const matches = text.match(/@([a-zA-Z0-9_.-]+)/g) ?? []
  return Array.from(new Set(matches.map(m => m.slice(1))))
}
