import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { EmptyState } from '@/components/shared/empty-state'
import { JoinLeaveButton } from '@/components/spaces/join-leave-button'
import { LoadMorePosts } from '@/components/posts/load-more-posts'
import { Lock, Settings, Users } from 'lucide-react'
import type { Metadata } from 'next'
import type { UserRole } from '@/types/database'

interface Props { params: { slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = await createClient()
  const { data } = await supabase.from('spaces').select('name, description').eq('slug', params.slug).single()
  if (!data) return { title: 'Space không tồn tại' }
  return { title: `${data.name} — Community`, description: data.description ?? undefined }
}

type PostRow = {
  id: string
  title: string
  content: string
  created_at: string
  is_pinned: boolean
  profiles: { username: string; display_name: string | null; avatar_url: string | null } | null
}

export default async function SpaceDetailPage({ params }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: space } = await supabase
    .from('spaces')
    .select('*')
    .eq('slug', params.slug)
    .single()

  if (!space) notFound()

  const [{ count: memberCount }, { data: rawPosts }, membershipResult, profileResult] = await Promise.all([
    supabase.from('space_members').select('*', { count: 'exact', head: true }).eq('space_id', space.id),
    supabase
      .from('posts')
      .select('id, title, content, created_at, is_pinned, profiles!author_id(username, display_name, avatar_url)')
      .eq('space_id', space.id)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(20),
    user ? supabase.from('space_members').select('user_id').eq('space_id', space.id).eq('user_id', user.id).single() : Promise.resolve({ data: null }),
    user ? supabase.from('profiles').select('role').eq('id', user.id).single() : Promise.resolve({ data: null }),
  ])

  const posts = (rawPosts ?? []) as unknown as PostRow[]
  const isMember = !!membershipResult.data
  const isCreator = user?.id === space.created_by
  const userRole = (profileResult.data as { role: UserRole } | null)?.role
  const canManage = isCreator || userRole === 'admin' || userRole === 'moderator'

  // Private space: non-members see locked message
  if (space.is_private && !isMember && !isCreator) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <EmptyState
          icon="🔒"
          title="Space riêng tư"
          description="Bạn cần được mời để xem nội dung của Space này"
        />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Cover image */}
      {space.cover_image && (
        <div className="h-40 rounded-xl overflow-hidden mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={space.cover_image} alt={space.name} className="w-full h-full object-cover" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-4xl">{space.icon ?? space.name.charAt(0)}</span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">{space.name}</h1>
              {space.is_private && (
                <Badge variant="secondary" className="gap-1">
                  <Lock className="h-3 w-3" /> Riêng tư
                </Badge>
              )}
            </div>
            <Link href={`/spaces/${space.slug}/members`} className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5 hover:text-foreground transition-colors">
              <Users className="h-3.5 w-3.5" />
              <span>{memberCount ?? 0} thành viên</span>
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {canManage && (
            <Link href={`/spaces/${space.slug}/settings`}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Settings className="h-3.5 w-3.5" /> Cài đặt
              </Button>
            </Link>
          )}
          {user && (
            <JoinLeaveButton
              spaceId={space.id}
              slug={space.slug}
              isMember={isMember}
              isCreator={isCreator}
            />
          )}
          {isMember && (
            <Link href={`/spaces/${space.slug}/posts/new`}>
              <Button size="sm">+ Đăng bài</Button>
            </Link>
          )}
        </div>
      </div>

      {space.description && (
        <p className="text-muted-foreground text-sm mb-4">{space.description}</p>
      )}

      <Separator className="mb-6" />

      {/* Posts feed */}
      {posts.length === 0 ? (
        <EmptyState
          icon="📝"
          title="Chưa có bài viết nào"
          description={isMember ? 'Hãy là người đầu tiên đăng bài trong Space này' : 'Tham gia để đăng bài'}
          action={isMember
            ? <Link href={`/spaces/${space.slug}/posts/new`}><Button>Đăng bài đầu tiên</Button></Link>
            : undefined
          }
        />
      ) : (
        <LoadMorePosts
          spaceId={space.id}
          spaceSlug={space.slug}
          initialPosts={posts}
        />
      )}
    </div>
  )
}
