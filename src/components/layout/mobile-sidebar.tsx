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
}

export function MobileSidebar({ spaces, profile }: MobileSidebarProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <div className="md:hidden fixed top-0 left-0 z-40 h-14 flex items-center px-3 gap-2 border-b bg-background/95 backdrop-blur-sm w-full">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors outline-none">
          <Menu className="h-5 w-5" />
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          <Sidebar spaces={spaces} profile={profile} className="flex h-full" />
        </SheetContent>
      </Sheet>

      <Link href="/" className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center shadow-sm">
          <span className="text-primary-foreground text-[10px] font-bold">C</span>
        </div>
        <span className="font-semibold text-sm">Community</span>
      </Link>

      <div className="flex-1" />

      <Link href="/search">
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Search className="h-4 w-4" />
        </Button>
      </Link>

      {profile ? (
        <>
          <NotificationBell />
          <UserMenu profile={profile} />
        </>
      ) : (
        <div className="flex items-center gap-1">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">Đăng nhập</Button>
          </Link>
          <Link href="/register">
            <Button size="sm" className="h-8 px-2 text-xs">Tham gia</Button>
          </Link>
        </div>
      )}
    </div>
  )
}
