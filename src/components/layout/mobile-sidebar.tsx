'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, Search } from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Sidebar } from './sidebar'
import { NotificationBell } from './notification-bell'
import { UserMenu } from './user-menu'
import type { Database } from '@/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']
type Space = { id: string; name: string; slug: string; icon: string | null }

interface MobileSidebarProps {
  spaces: Space[]
  profile: Profile | null
  communityName?: string
}

export function MobileSidebar({ spaces, profile, communityName = 'Community' }: MobileSidebarProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <div className="md:hidden fixed top-0 left-0 z-40 h-14 flex items-center px-3 gap-2 border-b bg-background/95 backdrop-blur-sm w-full">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors outline-none">
          <Menu className="h-5 w-5" />
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-72">
          <Sidebar spaces={spaces} profile={profile} communityName={communityName} className="flex h-full" />
        </SheetContent>
      </Sheet>

      <Link href="/" className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center shadow-sm">
          <span className="text-primary-foreground text-xs font-bold">C</span>
        </div>
        <span className="font-semibold text-base">{communityName}</span>
      </Link>

      <div className="flex-1" />

      <Link href="/search">
        <Button variant="ghost" size="icon" className="h-10 w-10">
          <Search className="h-5 w-5" />
        </Button>
      </Link>

      {profile ? (
        <>
          <NotificationBell />
          <UserMenu profile={profile} />
        </>
      ) : (
        <div className="flex items-center gap-1.5">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="h-9 px-3 text-sm">Đăng nhập</Button>
          </Link>
          <Link href="/register">
            <Button size="sm" className="h-9 px-3 text-sm">Tham gia</Button>
          </Link>
        </div>
      )}
    </div>
  )
}
