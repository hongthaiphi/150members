'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Search } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { NotificationBell } from '@/components/layout/notification-bell'
import type { Database } from '@/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']

interface HeaderProps {
  profile: Profile | null
}

export function Header({ profile }: HeaderProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`)
    }
  }

  return (
    <header className="h-14 border-b flex items-center gap-3 px-4 shrink-0 bg-background">
      <form onSubmit={handleSearch} className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Tìm kiếm bài viết, thành viên, spaces..."
            className="pl-8 h-8 text-sm"
          />
        </div>
      </form>

      <div className="flex items-center gap-2 ml-auto">
        <NotificationBell />

        {profile && (
          <Avatar className="h-8 w-8 cursor-pointer">
            <AvatarImage src={profile.avatar_url ?? undefined} />
            <AvatarFallback className="text-xs">
              {(profile.display_name ?? profile.username).charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </header>
  )
}
