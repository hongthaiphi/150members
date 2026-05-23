'use client'

import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface MessagesContainerProps {
  sidebar: React.ReactNode
  children: React.ReactNode
}

export function MessagesContainer({ sidebar, children }: MessagesContainerProps) {
  const pathname = usePathname()
  const isThread = /^\/messages\/[^/]+$/.test(pathname)

  return (
    <div className="flex h-full">
      {/* Conversation list: hidden on mobile when viewing a thread */}
      <div
        className={cn(
          'border-r shrink-0 flex flex-col',
          'w-full md:w-72',
          isThread ? 'hidden md:flex' : 'flex'
        )}
      >
        {sidebar}
      </div>

      {/* Thread: hidden on mobile when on /messages (no thread selected) */}
      <div
        className={cn(
          'flex-1 min-w-0 flex flex-col',
          !isThread ? 'hidden md:flex' : 'flex'
        )}
      >
        {children}
      </div>
    </div>
  )
}
