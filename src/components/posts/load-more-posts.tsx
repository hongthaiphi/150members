'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Pin, Loader2 } from 'lucide-react'
import { loadMorePosts, type PostItem } from '@/lib/actions/posts'

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

  function loadMore() {
    startTransition(async () => {
      const oldest = posts[posts.length - 1]
      const { posts: newPosts } = await loadMorePosts(
        spaceId,
        { created_at: oldest.created_at, id: oldest.id },
        pageSize
      )
      setPosts(prev => [...prev, ...newPosts])
      setHasMore(newPosts.length === pageSize)
    })
  }

  return (
    <>
      <div className="space-y-4">
        {posts.map(post => (
          <article
            key={post.id}
            className="group bg-card border rounded-xl p-4 hover:shadow-sm hover:border-border/80 transition-all duration-150"
          >
            <div className="flex items-center gap-2.5 mb-3">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={post.profiles?.avatar_url ?? undefined} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                  {(post.profiles?.display_name ?? post.profiles?.username ?? '?').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Link href={`/profile/${post.profiles?.username}`} className="text-sm font-medium hover:underline truncate">
                {post.profiles?.display_name ?? post.profiles?.username}
              </Link>
              <div className="flex items-center gap-1.5 ml-auto shrink-0">
                {post.is_pinned && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                    <Pin className="h-3 w-3" /> Ghim
                  </span>
                )}
                <span className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: vi })}
                </span>
              </div>
            </div>

            <Link href={`/spaces/${spaceSlug}/posts/${post.id}`}>
              <h2 className="text-base font-semibold leading-snug group-hover:text-primary transition-colors mb-1.5">
                {post.title}
              </h2>
              <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                {post.content.replace(/<[^>]+>/g, '').slice(0, 200)}
              </p>
            </Link>
          </article>
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
