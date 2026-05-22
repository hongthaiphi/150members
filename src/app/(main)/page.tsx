import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/shared/empty-state'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'

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
        <h1 className="text-xl font-bold">Bảng tin</h1>
        <Link href="/spaces">
          <Button variant="outline" size="sm">Khám phá Spaces</Button>
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
        <div className="space-y-4">
          {posts.map((post) => (
            <Card key={post.id} className="hover:shadow-sm transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarImage src={post.profiles?.avatar_url ?? undefined} />
                      <AvatarFallback className="text-xs">
                        {(post.profiles?.display_name ?? post.profiles?.username ?? '?').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <span className="text-sm font-medium">
                        {post.profiles?.display_name ?? post.profiles?.username}
                      </span>
                      <span className="text-muted-foreground text-xs mx-1">in</span>
                      <Link href={`/spaces/${post.spaces?.slug}`} className="text-sm text-primary hover:underline">
                        {post.spaces?.name}
                      </Link>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {post.is_pinned && (
                      <Badge variant="secondary" className="text-xs">📌 Ghim</Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: vi })}
                    </span>
                  </div>
                </div>
                <CardTitle className="text-base">
                  <Link href={`/spaces/${post.spaces?.slug}/posts/${post.id}`} className="hover:underline">
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
      )}
    </div>
  )
}
