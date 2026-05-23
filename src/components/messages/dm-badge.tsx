'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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

      const { data: participations } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id)

      const convIds = (participations ?? []).map(p => p.conversation_id)
      convIdsRef.current = convIds

      if (convIds.length === 0) return

      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .in('conversation_id', convIds)
        .neq('sender_id', user.id)
        .eq('is_read', false)

      if (mounted) setUnread(count ?? 0)

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
            // Re-fetch count on any read status update
            supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .in('conversation_id', convIds)
              .neq('sender_id', user.id)
              .eq('is_read', false)
              .then(({ count: c }) => { if (mounted) setUnread(c ?? 0) })
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
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .in('conversation_id', convIds)
        .neq('sender_id', (await supabase.auth.getUser()).data.user?.id ?? '')
        .eq('is_read', false)
      setUnread(count ?? 0)
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
