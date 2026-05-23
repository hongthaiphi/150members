'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getDmOverview } from '@/lib/actions/messages'

export function DmBadge() {
  const supabase = createClient()
  const pathname = usePathname()
  const [unread, setUnread] = useState(0)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const convIdsRef = useRef<string[]>([])

  useEffect(() => {
    let mounted = true

    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !mounted) return

      // Lấy convIds + số chưa đọc qua server action (admin client, không bị RLS đệ quy)
      const { convIds, unread: initialUnread } = await getDmOverview()
      convIdsRef.current = convIds

      if (mounted) setUnread(initialUnread)
      if (convIds.length === 0) return

      const filter = `conversation_id=in.(${convIds.join(',')})`
      const channel = supabase
        .channel(`dm-badge:${user.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter },
          (payload) => {
            const msg = payload.new as { sender_id: string; conversation_id: string }
            if (msg.sender_id === user.id) return
            // Don't increment if the conversation is currently open
            if (pathname === `/messages/${msg.conversation_id}`) return
            if (mounted) setUnread(prev => prev + 1)
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'messages', filter },
          () => {
            // Re-fetch count on any read status update (server action, no RLS recursion)
            getDmOverview().then(({ unread: u }) => { if (mounted) setUnread(u) })
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

  // Clear badge when navigating to a messages conversation
  useEffect(() => {
    if (!pathname.startsWith('/messages/')) return
    const convId = pathname.replace('/messages/', '')
    if (!convId || convId === 'messages') return
    // Re-count after navigating (conversation gets marked read by message-thread)
    const convIds = convIdsRef.current
    if (convIds.length === 0) return
    const t = setTimeout(async () => {
      const { unread: u } = await getDmOverview()
      setUnread(u)
    }, 500)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  if (unread <= 0) return null

  return (
    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground leading-none">
      {unread > 9 ? '9+' : unread}
    </span>
  )
}
