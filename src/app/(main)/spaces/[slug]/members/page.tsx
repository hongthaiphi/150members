import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { RoleBadge } from '@/components/profile/role-badge'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import type { Metadata } from 'next'
import type { UserRole } from '@/types/database'

interface Props { params: { slug: string } }

export const metadata: Metadata = { title: 'Thành viên Space — Community' }

type MemberRow = {
  joined_at: string
  profiles: {
    id: string
    username: string
    display_name: string | null
    avatar_url: string | null
    role: UserRole
  } | null
}

export default async function SpaceMembersPage({ params }: Props) {
  const supabase = await createClient()

  const { data: space } = await supabase
    .from('spaces')
    .select('id, name, slug, is_private')
    .eq('slug', params.slug)
    .single()

  if (!space) notFound()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  if (space.is_private) {
    const { data: membership } = await supabase
      .from('space_members')
      .select('user_id')
      .eq('space_id', space.id)
      .eq('user_id', user.id)
      .single()
    if (!membership) notFound()
  }

  const { data: rawMembers } = await supabase
    .from('space_members')
    .select('joined_at, profiles!user_id(id, username, display_name, avatar_url, role)')
    .eq('space_id', space.id)
    .order('joined_at', { ascending: true })

  const members = (rawMembers ?? []) as unknown as MemberRow[]

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/spaces/${params.slug}`}>
          <Button variant="ghost" size="sm">← Quay lại</Button>
        </Link>
        <h1 className="text-xl font-bold">
          Thành viên — {space.name} ({members.length})
        </h1>
      </div>

      <div className="space-y-2">
        {members.map(({ joined_at, profiles: member }) => {
          if (!member) return null
          return (
            <Link
              key={member.id}
              href={`/profile/${member.username}`}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={member.avatar_url ?? undefined} />
                <AvatarFallback className="text-sm">
                  {(member.display_name ?? member.username).charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">
                    {member.display_name ?? member.username}
                  </span>
                  <RoleBadge role={member.role} />
                </div>
                <p className="text-xs text-muted-foreground">@{member.username}</p>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                Tham gia {formatDistanceToNow(new Date(joined_at), { addSuffix: true, locale: vi })}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
