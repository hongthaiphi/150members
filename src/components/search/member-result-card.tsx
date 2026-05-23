import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { RoleBadge } from '@/components/profile/role-badge'
import type { MemberSearchResult } from '@/lib/actions/search'
import type { UserRole } from '@/types/database'

export function MemberResultCard({ member }: { member: MemberSearchResult }) {
  return (
    <Link
      href={`/profile/${member.username}`}
      className="flex items-center gap-3 border rounded-lg p-4 hover:bg-muted/50 transition-colors"
    >
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarImage src={member.avatar_url ?? undefined} />
        <AvatarFallback>
          {(member.display_name ?? member.username).charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">
            {member.display_name ?? member.username}
          </span>
          <RoleBadge role={member.role as UserRole} />
        </div>
        <p className="text-xs text-muted-foreground">@{member.username}</p>
        {member.bio && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{member.bio}</p>
        )}
      </div>
    </Link>
  )
}
