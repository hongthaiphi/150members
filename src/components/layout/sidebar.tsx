'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Home, MessageSquare, Search, Plus, Settings } from 'lucide-react'
import type { Database } from '@/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']
type Space = { id: string; name: string; slug: string; icon: string | null }

interface SidebarProps {
  spaces: Space[]
  profile: Profile | null
  className?: string
}

const navItems = [
  { href: '/', label: 'Trang chủ', icon: Home },
  { href: '/messages', label: 'Tin nhắn', icon: MessageSquare },
  { href: '/search', label: 'Tìm kiếm', icon: Search },
]

export function Sidebar({ spaces, profile, className }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className={cn('w-64 border-r flex flex-col shrink-0', className)}>
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b shrink-0">
        <Link href="/" className="font-bold text-lg">Community</Link>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-1">
          {/* Main nav */}
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}>
              <Button
                variant={pathname === href ? 'secondary' : 'ghost'}
                className="w-full justify-start gap-2"
                size="sm"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Button>
            </Link>
          ))}

          {/* Spaces */}
          <div className="pt-3">
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Spaces
              </span>
              <Link href="/spaces/new">
                <Button variant="ghost" size="icon" className="h-5 w-5">
                  <Plus className="h-3 w-3" />
                </Button>
              </Link>
            </div>

            {spaces.length === 0 ? (
              <p className="text-xs text-muted-foreground px-2 py-1">
                Chưa tham gia space nào
              </p>
            ) : (
              spaces.map((space) => (
                <Link key={space.id} href={`/spaces/${space.slug}`}>
                  <Button
                    variant={pathname === `/spaces/${space.slug}` ? 'secondary' : 'ghost'}
                    className="w-full justify-start gap-2"
                    size="sm"
                  >
                    <span className="text-base leading-none">
                      {space.icon ?? space.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="truncate">{space.name}</span>
                  </Button>
                </Link>
              ))
            )}
          </div>
        </div>
      </ScrollArea>

      {/* User profile at bottom */}
      {profile && (
        <div className="border-t p-3 shrink-0">
          <div className="flex items-center gap-2">
            <Link href={`/profile/${profile.username}`} className="flex items-center gap-2 flex-1 min-w-0 rounded-lg px-2 py-1.5 hover:bg-muted transition-colors">
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarImage src={profile.avatar_url ?? undefined} />
                <AvatarFallback className="text-xs">
                  {(profile.display_name ?? profile.username).charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium truncate">{profile.display_name ?? profile.username}</p>
                <p className="text-xs text-muted-foreground truncate">@{profile.username}</p>
              </div>
            </Link>
            <Link href="/settings/profile" className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0" title="Cài đặt hồ sơ">
              <Settings className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}
    </aside>
  )
}
