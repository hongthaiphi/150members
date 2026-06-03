import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PostActions } from '@/components/posts/post-actions'
import { RichTextEditor } from '@/components/posts/rich-text-editor'
import { CommentList } from '@/components/comments/comment-list'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Pin } from 'lucide-react'
import type { Metadata } from 'next'
import type { UserRole } from '@/types/database'
import type { CommentData } from '@/components/comments/comment-item'
import { htmlToPlainText } from '@/lib/actions/posts'

interface Props { params: { slug: string; id: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data } = await supabase
    .from('posts')
    .select('title, content, spaces!inner(id, name, slug, is_private)')
    .eq('id', params.id)
    .single()

  const post = data as { title: string; content: string; spaces: { id: string; name: string; slug: string; is_private: boolean } } | null
  if (!post) return { title: 'Bài viết không tồn tại' }

  // C-1: Do not expose title/description of private space posts to non-members
  if (post.spaces.is_private) {
    const { data: member } = user
      ? await supabase.from('space_members').select('user_id')
          .eq('space_id', post.spaces.id).eq('user_id', user.id).single()
      : { data: null }
    if (!member) return { title: 'Bài viết không tồn tại' }
  }

  const description = htmlToPlainText(post.content).slice(0, 160)
  const path = `/spaces/${post.spaces.slug}/posts/${params.id}`
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '')
  const url = siteUrl ? `${siteUrl}${path}` : path

  return {
    title: post.title,
    description,
    openGraph: {
      title: post.title,
      description,
      type: 'article',
      url,
      siteName: 'Community',
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description,
    },
    alternates: { canonical: url },
  }
}

type PostRow = {
  id: string
  title: string
  content: string
  created_at: string
  updated_at: string
  is_pinned: boolean
  author_id: string
  space_id: string
  profiles: { id: string; username: string; display_name: string | null; avatar_url: string | null } | null
}

type RawComment = {
  id: string
  content: string
  created_at: string
  updated_at: string
  parent_id: string | null
  author_id: string
  profiles: { id: string; username: string; display_name: string | null; avatar_url: string | null } | null
}

export default async function PostDetailPage({ params }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: rawPost } = await supabase
    .from('posts')
    .select(`
      id, title, content, created_at, updated_at, is_pinned, author_id, space_id,
      spaces!inner(id, name, slug, is_private, created_by),
      profiles!author_id(id, username, display_name, avatar_url)
    `)
    .eq('id', params.id)
    .single()

  const post = rawPost as unknown as (PostRow & { spaces: { id: string; name: string; slug: string; is_private: boolean; created_by: string } }) | null

  if (!post) notFound()

  const space = post.spaces

  // Fetch comments + membership + profile in parallel
  const [{ data: rawComments }, membershipResult, profileResult] = await Promise.all([
    supabase
      .from('comments')
      .select('id, content, created_at, updated_at, parent_id, author_id, profiles!author_id(id, username, display_name, avatar_url)')
      .eq('post_id', params.id)
      .order('created_at', { ascending: true }),
    user
      ? supabase.from('space_members').select('user_id').eq('space_id', space.id).eq('user_id', user.id).single()
      : Promise.resolve({ data: null }),
    user
      ? supabase.from('profiles').select('role').eq('id', user.id).single()
      : Promise.resolve({ data: null }),
  ])

  const comments = (rawComments ?? []) as unknown as RawComment[]

  // Bug 3 fix: use COUNT+GROUP BY instead of fetching all reaction rows into memory
  const allTargetIds = [params.id, ...comments.map(c => c.id)]

  const [reactionCountsResult, userLikesResult] = await Promise.all([
    // Bug 3 fix: get counts from DB via RPC — avoids loading all reaction rows into JS memory
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as unknown as any).rpc('get_reaction_counts', { target_ids: allTargetIds }) as Promise<{ data: Array<{ target_id: string; count: number }> | null }>,
    // Get only the targets the current user liked (lightweight — just target_id column)
    user
      ? supabase
          .from('reactions')
          .select('target_id')
          .eq('user_id', user.id)
          .in('target_id', allTargetIds)
      : Promise.resolve({ data: [] as Array<{ target_id: string }> }),
  ])

  // Build lookup maps
  const countMap = new Map<string, number>(
    (reactionCountsResult.data ?? []).map(r => [r.target_id, Number(r.count)])
  )
  const likedSet = new Set<string>(
    (userLikesResult.data ?? []).map(r => (r as { target_id: string }).target_id)
  )

  function countReactions(targetId: string) { return countMap.get(targetId) ?? 0 }
  function userLiked(targetId: string) { return likedSet.has(targetId) }

  const isMember = !!membershipResult.data
  const userRole = (profileResult.data as { role: UserRole } | null)?.role
  const isAuthor = user?.id === post.author_id
  const isCreator = user?.id === space.created_by
  const canManage = isCreator || userRole === 'admin' || userRole === 'moderator'

  // C-1: Block access to private space posts for non-members
  if (space.is_private && !isMember && !canManage) notFound()

  // Build CommentData with nested replies
  const commentData: CommentData[] = comments.map(c => ({
    id: c.id,
    content: c.content,
    created_at: c.created_at,
    updated_at: c.updated_at,
    parent_id: c.parent_id,
    author: {
      id: c.profiles?.id ?? c.author_id,
      username: c.profiles?.username ?? 'unknown',
      display_name: c.profiles?.display_name ?? null,
      avatar_url: c.profiles?.avatar_url ?? null,
    },
    likeCount: countReactions(c.id),
    liked: userLiked(c.id),
  }))

  // Fetch current user profile for comment form
  let commentCurrentUser: { id: string; avatarUrl: string | null; displayName: string } | null = null
  if (user) {
    const { data: myProfile } = await supabase
      .from('profiles')
      .select('avatar_url, display_name, username')
      .eq('id', user.id)
      .single()
    const p = myProfile as { avatar_url: string | null; display_name: string | null; username: string } | null
    if (p) {
      commentCurrentUser = {
        id: user.id,
        avatarUrl: p.avatar_url,
        displayName: p.display_name ?? p.username,
      }
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-5">
        <Link href="/spaces" className="hover:text-foreground">Spaces</Link>
        <span>/</span>
        <Link href={`/spaces/${space.slug}`} className="hover:text-foreground">{space.name}</Link>
      </div>

      {/* Post header */}
      <div className="mb-4">
        <div className="flex items-start gap-2 mb-3">
          <h1 className="text-2xl font-bold leading-tight flex-1">{post.title}</h1>
          {post.is_pinned && (
            <Badge variant="secondary" className="shrink-0 gap-1 mt-1">
              <Pin className="h-3 w-3" /> Ghim
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3 mb-4">
          <Link href={`/profile/${post.profiles?.username}`}>
            <Avatar className="h-8 w-8">
              <AvatarImage src={post.profiles?.avatar_url ?? undefined} />
              <AvatarFallback className="text-xs">
                {(post.profiles?.display_name ?? post.profiles?.username ?? '?').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div>
            <Link href={`/profile/${post.profiles?.username}`} className="text-sm font-medium hover:underline">
              {post.profiles?.display_name ?? post.profiles?.username}
            </Link>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: vi })}
              {post.updated_at !== post.created_at && ' · đã sửa'}
            </p>
          </div>

          <div className="ml-auto">
            <PostActions
              postId={post.id}
              spaceSlug={space.slug}
              isAuthor={isAuthor}
              canManage={canManage}
              isPinned={post.is_pinned}
              initialLikeCount={countReactions(post.id)}
              initialLiked={userLiked(post.id)}
              isGuest={!user}
            />
          </div>
        </div>
      </div>

      {/* Post content */}
      <div className="mb-8">
        <RichTextEditor content={post.content} editable={false} />
      </div>

      {/* Comments */}
      {(isMember || !space.is_private) && (
        <CommentList
          comments={commentData}
          postId={post.id}
          spaceSlug={space.slug}
          currentUser={commentCurrentUser}
        />
      )}

      {!user && !space.is_private && (
        <div className="mt-8 p-6 bg-muted/50 rounded-xl text-center">
          <p className="text-muted-foreground mb-4">Bạn cần đăng nhập để tham gia thảo luận</p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/login">
              <Button variant="outline">Đăng nhập</Button>
            </Link>
            <Link href="/register">
              <Button>Đăng ký tài khoản</Button>
            </Link>
          </div>
        </div>
      )}

      {user && !isMember && space.is_private && (
        <p className="text-muted-foreground text-sm">
          Tham gia Space để bình luận.{' '}
          <Link href={`/spaces/${space.slug}`} className="text-primary hover:underline">
            Xem Space
          </Link>
        </p>
      )}
    </div>
  )
}
