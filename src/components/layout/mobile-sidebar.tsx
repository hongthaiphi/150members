'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Sidebar } from './sidebar'
import type { Database } from '@/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']
type Space = { id: string; name: string; slug: string; icon: string | null }

interface MobileSidebarProps {
  spaces: Space[]
  profile: Profile | null
}

export function MobileSidebar({ spaces, profile }: MobileSidebarProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="md:hidden fixed top-0 left-0 z-40 h-14 flex items-center px-4 border-b bg-background w-full">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors outline-none">
          <Menu className="h-5 w-5" />
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          <Sidebar spaces={spaces} profile={profile} className="flex h-full" />
        </SheetContent>
      </Sheet>
      <span className="ml-3 font-semibold">Community</span>
    </div>
  )
}
