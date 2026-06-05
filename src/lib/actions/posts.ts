'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import sanitizeHtml from 'sanitize-html'

// Allowed HTML tags/attrs from TipTap rich-text editor
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'h2', 'h3', 'p', 'br', 'strong', 'em', 's', 'code', 'pre',
    'blockquote', 'ul', 'ol', 'li', 'a', 'img',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    img: ['src', 'alt', 'title'],
    code: ['class'],
    pre: ['class'],
  },
  allowedSchemes: ['https', 'http', 'mailto'],
  // Force safe link attrs
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' }),
  },
}

function sanitizeContent(html: string): string {
  return sanitizeHtml(html, SANITIZE_OPTIONS)
}


export type PostFormData = {
  title: string
  content: string
}

// Server-side length limits
const TITLE_MAX = 200
const CONTENT_MAX = 50_000

async function getProfile(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase.from('profiles').select('role, username').eq('id', userId).single()
  return data as { role: string; username: string } | null
}

// Derive real slug from DB given a postId — prevents client-supplied slug from misdirecting revalidation
async function getSlugFromPost(supabase: Awaited<ReturnType<typeof createClient>>, postId: string) {
  const { data } = await supabase
    .from('posts')
    .select('space_id, spaces!space_id(slug)')
    .eq('id', postId)
    .single()
  const row = data as { space_id: string; spaces: { slug: string } | null } | null
  return row?.spaces?.slug ?? null
}

export async function createPost(spaceId: string, spaceSlug: string, data: PostFormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  // Server-side validation
  const title = data.title.trim()
  const content = sanitizeContent(data.content)
  if (!title) return { error: 'Tiêu đề không được để trống' }
  if (title.length > TITLE_MAX) return { error: `Tiêu đề tối đa ${TITLE_MAX} ký tự` }
  if (content.length > CONTENT_MAX) return { error: `Nội dung tối đa ${CONTENT_MAX} ký tự` }

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
    .insert({ space_id: spaceId, author_id: user.id, title, content })
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

  // Server-side validation
  const title = data.title.trim()
  const content = sanitizeContent(data.content)
  if (!title) return { error: 'Tiêu đề không được để trống' }
  if (title.length > TITLE_MAX) return { error: `Tiêu đề tối đa ${TITLE_MAX} ký tự` }
  if (content.length > CONTENT_MAX) return { error: `Nội dung tối đa ${CONTENT_MAX} ký tự` }

  const { data: space } = await supabase.from('spaces').select('id').eq('slug', spaceSlug).single()
  const { data: post } = await supabase.from('posts').select('author_id, space_id').eq('id', postId).single()
  const profile = await getProfile(supabase, user.id)

  if (!post || post.space_id !== space?.id) return { error: 'Bài viết không tồn tại' }
  if (post.author_id !== user.id && profile?.role !== 'admin' && profile?.role !== 'moderator') {
    return { error: 'Không có quyền chỉnh sửa' }
  }

  const { error } = await supabase
    .from('posts')
    .update({ title, content, updated_at: new Date().toISOString() })
    .eq('id', postId)
    .eq('space_id', space.id)

  if (error) return { error: error.message }

  // Derive slug from DB to avoid misdirecting revalidation
  const realSlug = await getSlugFromPost(supabase, postId) ?? spaceSlug
  revalidatePath(`/spaces/${realSlug}/posts/${postId}`)
  redirect(`/spaces/${realSlug}/posts/${postId}`)
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

  // Derive slug from space (which we already validated belongs to this post)
  revalidatePath(`/spaces/${spaceSlug}`)
  redirect(`/spaces/${spaceSlug}`)
}

export async function togglePin(postId: string, spaceSlug: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  // Allow: admin, moderator, or space creator
  const profile = await getProfile(supabase, user.id)
  const { data: post } = await supabase.from('posts').select('space_id, is_pinned').eq('id', postId).single()
  const { data: space } = post
    ? await supabase.from('spaces').select('created_by, slug').eq('id', post.space_id).single()
    : { data: null }

  const isSpaceCreator = space?.created_by === user.id
  const isPrivileged = profile?.role === 'admin' || profile?.role === 'moderator'

  if (!isSpaceCreator && !isPrivileged) {
    return { error: 'Chỉ Admin/Moderator/Người tạo Space mới có thể ghim bài viết' }
  }

  const { error } = await supabase
    .from('posts')
    .update({ is_pinned: !post?.is_pinned })
    .eq('id', postId)

  if (error) return { error: error.message }

  const realSlug = space?.slug ?? spaceSlug
  revalidatePath(`/spaces/${realSlug}/posts/${postId}`)
  revalidatePath(`/spaces/${realSlug}`)
  return { success: true }
}

export async function toggleReaction(targetId: string, targetType: 'post' | 'comment', spaceSlug: string, postId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  // M-1: Check space membership for private spaces before allowing reaction
  let spaceId: string | null = null
  if (targetType === 'post') {
    const { data: p } = await supabase.from('posts').select('space_id').eq('id', targetId).single()
    spaceId = p?.space_id ?? null
  } else {
    const { data: c } = await supabase
      .from('comments')
      .select('posts!post_id(space_id)')
      .eq('id', targetId)
      .single()
    const row = c as unknown as { posts: { space_id: string } | null } | null
    spaceId = row?.posts?.space_id ?? null
  }

  if (spaceId) {
    const { data: spaceRow } = await supabase.from('spaces').select('is_private').eq('id', spaceId).single()
    if (spaceRow?.is_private) {
      const { data: member } = await supabase
        .from('space_members')
        .select('user_id')
        .eq('space_id', spaceId)
        .eq('user_id', user.id)
        .single()
      if (!member) return { error: 'Bạn không phải thành viên của Space này' }
    }
  }

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

// Generate (or reuse existing) share token for a private space post
export async function generateShareToken(postId: string): Promise<{ token?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  // Verify user is a member of the space this post belongs to
  const { data: post } = await supabase
    .from('posts')
    .select('space_id, spaces!space_id(is_private)')
    .eq('id', postId)
    .single()
  const row = post as { space_id: string; spaces: { is_private: boolean } | null } | null
  if (!row) return { error: 'Bài viết không tồn tại' }

  const { data: member } = await supabase
    .from('space_members')
    .select('user_id')
    .eq('space_id', row.space_id)
    .eq('user_id', user.id)
    .single()
  if (!member) return { error: 'Chỉ thành viên của Space mới có thể tạo link chia sẻ' }

  // Upsert — reuse existing token for same post+user pair
  const { data: tokenRow, error } = await supabase
    .from('post_share_tokens')
    .upsert({ post_id: postId, created_by: user.id }, { onConflict: 'post_id,created_by', ignoreDuplicates: false })
    .select('token')
    .single()

  if (error) return { error: error.message }
  return { token: tokenRow.token }
}
