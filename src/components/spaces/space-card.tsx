import Link from 'next/link'
import { Users, Lock } from 'lucide-react'

type SpaceCardProps = {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  is_private: boolean
  memberCount?: number
}

export function SpaceCard({ name, slug, description, icon, is_private, memberCount }: SpaceCardProps) {
  return (
    <Link href={`/spaces/${slug}`}>
      <div className="group relative bg-card border rounded-xl p-4 h-full hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-xl shrink-0 group-hover:bg-primary/15 transition-colors">
            {icon ?? (
              <span className="text-primary font-semibold text-base">
                {name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-base leading-tight group-hover:text-primary transition-colors">
                {name}
              </h3>
              {is_private && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                  <Lock className="h-3 w-3" /> Riêng tư
                </span>
              )}
            </div>
          </div>
        </div>

        {description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3 leading-relaxed">{description}</p>
        )}

        {memberCount !== undefined && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span>{memberCount} thành viên</span>
          </div>
        )}
      </div>
    </Link>
  )
}
