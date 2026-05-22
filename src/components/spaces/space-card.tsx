import Link from 'next/link'
import { Users, Lock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

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
      <Card className="hover:shadow-md transition-shadow h-full">
        <CardHeader className="pb-2">
          <div className="flex items-start gap-3">
            <div className="text-3xl w-10 h-10 flex items-center justify-center shrink-0">
              {icon ?? name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base">{name}</CardTitle>
                {is_private && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Lock className="h-2.5 w-2.5" /> Riêng tư
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{description}</p>
          )}
          {memberCount !== undefined && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              {memberCount} thành viên
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
