'use client'

import { useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { NotificationDropdown } from './notification-dropdown'

export function NotificationBell() {
  const supabase = createClient()
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    let mounted = true

    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !mounted) return

      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false)

      if (mounted) setUnread(count ?? 0)

      const channel = supabase
        .channel(`notif-bell:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            if (mounted) setUnread(prev => prev + 1)
          }
        )
        .subscribe()

      channelRef.current = channel
    }

    init()

    return () => {
      mounted = false
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 relative"
        onClick={() => setOpen(o => !o)}
        aria-label="Thông báo"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </Button>

      {open && (
        <NotificationDropdown
          onClose={() => setOpen(false)}
          onCountChange={delta => setUnread(prev => Math.max(0, prev + delta))}
        />
      )}
    </div>
  )
}
