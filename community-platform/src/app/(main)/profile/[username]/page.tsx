import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { RoleBadge } from '@/components/profile/role-badge'
import { SocialLinks } from '@/components/profile/social-links'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import type { Database, UserRole } from '@/types/database'
import type { Metadata } from 'next'

type Profile = Database['public']['Tables']['profiles']['Row']
type PostItem = {
  id: string
  title: string
  created_at: string
  spaces: { name: string; slug: string } | null
}

interface Props { params: { username: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('display_name, username, bio')
    .eq('username', params.username)
    .single()

  const p = data as { display_name: string | null; username: string; bio: string | null } | null
  if (!p) return { title: 'Profile không tồn tại' }
  return {
    title: `${p.display_name ?? p.username} — Community`,
    description: p.bio ?? undefined,
  }
}

export default async function ProfilePage({ params }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: rawProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', params.username)
    .single()

  const profile = rawProfile as Profile | null
  if (!profile) notFound()

  const isOwn = user?.id === profile.id

  const { data: rawPosts } = await supabase
    .from('posts')
    .select('id, title, created_at, spaces(name, slug)')
    .eq('author_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(10)

  const posts = (rawPosts ?? []) as unknown as PostItem[]
  const socialLinks = (profile.social_links as Record<string, string>) ?? {}

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-start gap-6 mb-6">
        <Avatar className="h-20 w-20 shrink-0">
          <AvatarImage src={profile.avatar_url ?? undefined} />
          <AvatarFallback className="text-3xl">
            {(profile.display_name ?? profile.username).charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold">{profile.display_name ?? profile.username}</h1>
              <p className="text-muted-foreground">@{profile.username}</p>
            </div>
            <div className="flex items-center gap-2">
              <RoleBadge role={profile.role as UserRole} />
              {isOwn && (
                <Link href="/settings/profile">
                  <Button variant="outline" size="sm">Chỉnh sửa hồ sơ</Button>
                </Link>
              )}
            </div>
          </div>

          {profile.bio && (
            <p className="mt-3 text-sm leading-relaxed">{profile.bio}</p>
          )}

          <div className="mt-3">
            <SocialLinks links={socialLinks} />
          </div>
        </div>
      </div>

      <Separator className="mb-6" />

      <div>
        <h2 className="font-semibold mb-4">Bài viết ({posts.length})</h2>

        {posts.length === 0 ? (
          <p className="text-muted-foreground text-sm">Chưa có bài viết nào.</p>
        ) : (
          <div className="space-y-3">
            {posts.map(post => (
              <Card key={post.id} className="hover:shadow-sm transition-shadow">
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-sm font-medium">
                      <Link href={`/spaces/${post.spaces?.slug}/posts/${post.id}`} className="hover:underline">
                        {post.title}
                      </Link>
                    </CardTitle>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: vi })}
                    </span>
                  </div>
                  {post.spaces && (
                    <Link href={`/spaces/${post.spaces.slug}`} className="text-xs text-primary hover:underline">
                      {post.spaces.name}
                    </Link>
                  )}
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
