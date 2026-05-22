'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { ConversationItem } from '@/app/(main)/messages/layout'

interface ConversationListProps {
  initialConversations: ConversationItem[]
  currentUserId: string
}

export function ConversationList({ initialConversations, currentUserId }: ConversationListProps) {
  const pathname = usePathname()
  const supabase = createClient()
  const [conversations, setConversations] = useState(initialConversations)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    const channel = supabase
      .channel('conversation-list')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload.new as {
            conversation_id: string
            sender_id: string
            content: string
            created_at: string
          }
          setConversations(prev => {
            const updated = prev.map(conv => {
              if (conv.id !== msg.conversation_id) return conv
              const isActive = pathname === `/messages/${conv.id}`
              return {
                ...conv,
                updated_at: msg.created_at,
                last_message: {
                  content: msg.content,
                  created_at: msg.created_at,
                  sender_id: msg.sender_id,
                },
                unread_count:
                  msg.sender_id !== currentUserId && !isActive
                    ? conv.unread_count + 1
                    : conv.unread_count,
              }
            })
            return [...updated].sort(
              (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
            )
          })
        }
      )
      .subscribe()

    channelRef.current = channel
    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, currentUserId])

  // Clear unread when opening a conversation
  useEffect(() => {
    const parts = pathname.split('/')
    const convId = parts[2] === 'messages' ? parts[3] : pathname.startsWith('/messages/') ? pathname.replace('/messages/', '') : null
    if (!convId) return
    setConversations(prev => prev.map(c => c.id === convId ? { ...c, unread_count: 0 } : c))
  }, [pathname])

  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <p className="text-muted-foreground text-sm text-center">Chưa có cuộc trò chuyện nào</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {conversations.map(conv => {
        const isActive = pathname === `/messages/${conv.id}`
        const { other_user: u, last_message: lm } = conv
        return (
          <Link
            key={conv.id}
            href={`/messages/${conv.id}`}
            className={cn(
              'flex items-center gap-3 px-4 py-3 hover:bg-muted/50 border-b last:border-0 transition-colors',
              isActive && 'bg-muted'
            )}
          >
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={u.avatar_url ?? undefined} />
              <AvatarFallback className="text-sm">
                {(u.display_name ?? u.username).charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <p className={cn('text-sm truncate', conv.unread_count > 0 ? 'font-semibold' : 'font-medium')}>
                  {u.display_name ?? u.username}
                </p>
                {lm && (
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {formatDistanceToNow(new Date(lm.created_at), { addSuffix: false, locale: vi })}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-1">
                <p className={cn(
                  'text-xs truncate',
                  conv.unread_count > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'
                )}>
                  {lm
                    ? (lm.sender_id === currentUserId ? 'Bạn: ' : '') + lm.content
                    : 'Chưa có tin nhắn'}
                </p>
                {conv.unread_count > 0 && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground shrink-0">
                    {conv.unread_count > 9 ? '9+' : conv.unread_count}
                  </span>
                )}
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
