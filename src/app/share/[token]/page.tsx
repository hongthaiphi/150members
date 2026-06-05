import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { RichTextEditor } from '@/components/posts/rich-text-editor'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Lock, Pin } from 'lucide-react'
import type { Metadata } from 'next'
import { htmlToPlainText } from '@/lib/html-utils'

interface Props { params: { token: string } }

type SharedPostRow = {
  title: string
  content: string
  created_at: string
  updated_at: string
  is_pinned: boolean
  spaces: { name: string; slug: string }
  profiles: { username: string; display_name: string | null; avatar_url: string | null } | null
}

async function fetchPost(token: string) {
  const supabase = await createClient()
  const { data: tokenRow } = await supabase
    .from('post_share_tokens')
    .select('post_id')
    .eq('token', token)
    .single()

  if (!tokenRow) return null

  const { data } = await supabase
    .from('posts')
    .select('title, content, created_at, updated_at, is_pinned, spaces!space_id(name, slug), profiles!author_id(username, display_name, avatar_url)')
    .eq('id', tokenRow.post_id)
    .single()

  return data as unknown as SharedPostRow | null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await fetchPost(params.token)
  if (!post) return { title: 'Link không hợp lệ' }
  const description = htmlToPlainText(post.content).slice(0, 300)
  return {
    title: post.title,
    description,
    openGraph: {
      title: post.title,
      description,
      type: 'article',
      siteName: 'Community',
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description,
    },
  }
}

export default async function SharedPostPage({ params }: Props) {
  const post = await fetchPost(params.token)
  if (!post) notFound()

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Banner */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 border rounded-lg px-4 py-2.5 mb-6">
          <Lock className="h-4 w-4 shrink-0" />
          <span>
            Bài viết từ space riêng tư{' '}
            <span className="font-medium text-foreground">{post.spaces.name}</span>.{' '}
            <Link href={`/spaces/${post.spaces.slug}`} className="text-primary hover:underline">
              Tham gia Space
            </Link>{' '}
            để tham gia thảo luận.
          </span>
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
            <Avatar className="h-8 w-8">
              <AvatarImage src={post.profiles?.avatar_url ?? undefined} />
              <AvatarFallback className="text-xs">
                {(post.profiles?.display_name ?? post.profiles?.username ?? '?').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">
                {post.profiles?.display_name ?? post.profiles?.username}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: vi })}
                {post.updated_at !== post.created_at && ' · đã sửa'}
              </p>
            </div>
          </div>
        </div>

        {/* Post content */}
        <div className="mb-8">
          <RichTextEditor content={post.content} editable={false} />
        </div>

        {/* CTA */}
        <div className="mt-8 p-6 bg-muted/50 rounded-xl text-center border">
          <p className="text-muted-foreground mb-1 font-medium">Muốn tham gia thảo luận?</p>
          <p className="text-sm text-muted-foreground mb-4">
            Đăng nhập và tham gia Space <strong>{post.spaces.name}</strong> để bình luận và đọc thêm bài viết.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/login" className="inline-flex h-9 items-center justify-center rounded-lg border border-input bg-background px-4 text-sm font-medium hover:bg-accent transition-colors">
              Đăng nhập
            </Link>
            <Link href="/register" className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              Đăng ký tài khoản
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
