'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Pin, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type PostItem = {
  id: string
  title: string
  content: string
  created_at: string
  is_pinned: boolean
  profiles: { username: string; display_name: string | null; avatar_url: string | null } | null
}

interface LoadMorePostsProps {
  spaceId: string
  spaceSlug: string
  initialPosts: PostItem[]
  pageSize?: number
}

export function LoadMorePosts({ spaceId, spaceSlug, initialPosts, pageSize = 20 }: LoadMorePostsProps) {
  const [posts, setPosts] = useState<PostItem[]>(initialPosts)
  const [hasMore, setHasMore] = useState(initialPosts.length === pageSize)
  const [pending, startTransition] = useTransition()
  const supabase = createClient()

  function loadMore() {
    startTransition(async () => {
      const oldest = posts[posts.length - 1]
      const { data } = await supabase
        .from('posts')
        .select('id, title, content, created_at, is_pinned, profiles!author_id(username, display_name, avatar_url)')
        .eq('space_id', spaceId)
        .or(`created_at.lt.${oldest.created_at},and(created_at.eq.${oldest.created_at},id.lt.${oldest.id})`)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(pageSize)

      const newPosts = (data ?? []) as unknown as PostItem[]
      setPosts(prev => [...prev, ...newPosts])
      setHasMore(newPosts.length === pageSize)
    })
  }

  return (
    <>
      <div className="space-y-4">
        {posts.map(post => (
          <Card key={post.id} className="hover:shadow-sm transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 mb-1">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={post.profiles?.avatar_url ?? undefined} />
                  <AvatarFallback className="text-xs">
                    {(post.profiles?.display_name ?? post.profiles?.username ?? '?').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <Link href={`/profile/${post.profiles?.username}`} className="text-sm font-medium hover:underline">
                  {post.profiles?.display_name ?? post.profiles?.username}
                </Link>
                <span className="text-xs text-muted-foreground ml-auto">
                  {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: vi })}
                </span>
                {post.is_pinned && <Pin className="h-3.5 w-3.5 text-muted-foreground" />}
              </div>
              <CardTitle className="text-base">
                <Link href={`/spaces/${spaceSlug}/posts/${post.id}`} className="hover:underline">
                  {post.title}
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {post.content.replace(/<[^>]+>/g, '').slice(0, 200)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {hasMore && (
        <div className="mt-6 text-center">
          <Button variant="outline" onClick={loadMore} disabled={pending}>
            {pending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Đang tải...</> : 'Xem thêm bài viết'}
          </Button>
        </div>
      )}
    </>
  )
}
