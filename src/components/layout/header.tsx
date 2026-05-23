'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { NotificationBell } from '@/components/layout/notification-bell'
import { UserMenu } from '@/components/layout/user-menu'
import type { Database } from '@/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']

interface HeaderProps {
  profile: Profile | null
}

export function Header({ profile }: HeaderProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') ?? '')

  useEffect(() => {
    setQuery(searchParams.get('q') ?? '')
  }, [searchParams])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`)
    }
  }

  return (
    <header className="hidden md:flex h-14 border-b items-center gap-3 px-5 shrink-0 bg-background/95 backdrop-blur-sm">
      <form onSubmit={handleSearch} className="flex-1 max-w-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Tìm kiếm..."
            className="pl-8 h-8 text-sm bg-muted/50 border-transparent focus:border-input focus:bg-background transition-colors"
          />
        </div>
      </form>

      <div className="flex items-center gap-1.5 ml-auto">
        {profile ? (
          <>
            <NotificationBell />
            <UserMenu profile={profile} />
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-sm">Đăng nhập</Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="text-sm">Tham gia</Button>
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
