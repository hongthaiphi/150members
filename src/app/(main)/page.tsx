import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/shared/empty-state'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Pin } from 'lucide-react'

type PostWithRelations = {
  id: string
  title: string
  content: string
  created_at: string
  is_pinned: boolean
  spaces: { name: string; slug: string } | null
  profiles: { username: string; display_name: string | null; avatar_url: string | null } | null
}

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: rawMemberships } = await supabase
    .from('space_members')
    .select('space_id')
    .eq('user_id', user.id)

  const spaceIds = (rawMemberships as Array<{ space_id: string }> | null)?.map(m => m.space_id) ?? []

  let posts: PostWithRelations[] = []
  if (spaceIds.length > 0) {
    const { data } = await supabase
      .from('posts')
      .select('id, title, content, created_at, is_pinned, spaces(name, slug), profiles!author_id(username, display_name, avatar_url)')
      .in('space_id', spaceIds)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(20)
    posts = (data ?? []) as unknown as PostWithRelations[]
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Bảng tin</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Bài viết mới nhất từ các Space của bạn</p>
        </div>
        <Link href="/spaces">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            Khám phá Spaces
          </Button>
        </Link>
      </div>

      {posts.length === 0 ? (
        <EmptyState
          icon="🌱"
          title="Chưa có bài viết nào"
          description="Tham gia các Spaces để xem bài viết từ cộng đồng của bạn"
          action={
            <Link href="/spaces">
              <Button>Khám phá Spaces</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <article
              key={post.id}
              className="group bg-card border rounded-xl p-4 hover:shadow-sm hover:border-border/80 transition-all duration-150"
            >
              <div className="flex items-start justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarImage src={post.profiles?.avatar_url ?? undefined} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                      {(post.profiles?.display_name ?? post.profiles?.username ?? '?').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex items-center gap-1 min-w-0 text-sm">
                    <span className="font-medium text-foreground truncate">
                      {post.profiles?.display_name ?? post.profiles?.username}
                    </span>
                    <span className="text-muted-foreground shrink-0">in</span>
                    <Link
                      href={`/spaces/${post.spaces?.slug}`}
                      className="text-primary hover:underline truncate font-medium"
                    >
                      {post.spaces?.name}
                    </Link>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {post.is_pinned && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                      <Pin className="h-2.5 w-2.5" /> Ghim
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: vi })}
                  </span>
                </div>
              </div>

              <Link href={`/spaces/${post.spaces?.slug}/posts/${post.id}`}>
                <h2 className="text-sm font-semibold leading-snug group-hover:text-primary transition-colors mb-1.5">
                  {post.title}
                </h2>
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {post.content.replace(/<[^>]+>/g, '').slice(0, 200)}
                </p>
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
