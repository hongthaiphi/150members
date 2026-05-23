'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Send, Check, CheckCheck, ArrowLeft } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { sendMessage, markConversationRead } from '@/lib/actions/messages'
import type { Database } from '@/types/database'

type Message = Database['public']['Tables']['messages']['Row']

type OtherUser = {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
}

interface MessageThreadProps {
  conversationId: string
  initialMessages: Message[]
  currentUserId: string
  otherUser: OtherUser
}

export function MessageThread({ conversationId, initialMessages, currentUserId, otherUser }: MessageThreadProps) {
  const supabase = createClient()
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // Mark as read on mount and when conversation changes
  useEffect(() => {
    markConversationRead(conversationId).catch(console.error)
  }, [conversationId])

  // Subscribe to realtime messages
  useEffect(() => {
    setMessages(initialMessages)

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
          if (newMsg.sender_id !== currentUserId) {
            markConversationRead(conversationId).catch(console.error)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updated = payload.new as Message
          setMessages(prev => prev.map(m => m.id === updated.id ? updated : m))
        }
      )
      .subscribe()

    channelRef.current = channel
    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, currentUserId])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!content.trim() || sending) return
    setSending(true)
    const { error } = await sendMessage(conversationId, content)
    if (!error) setContent('')
    setSending(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-14 border-b flex items-center gap-3 px-4 shrink-0">
        <Link
          href="/messages"
          className="md:hidden inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Quay lại"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <Avatar className="h-8 w-8">
          <AvatarImage src={otherUser.avatar_url ?? undefined} />
          <AvatarFallback className="text-xs">
            {(otherUser.display_name ?? otherUser.username).charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <Link
          href={`/profile/${otherUser.username}`}
          className="font-semibold text-sm hover:underline"
        >
          {otherUser.display_name ?? otherUser.username}
        </Link>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Bắt đầu cuộc trò chuyện với {otherUser.display_name ?? otherUser.username}
          </div>
        ) : (
          messages.map(msg => {
            const isMe = msg.sender_id === currentUserId
            return (
              <div key={msg.id} className={cn('flex gap-2', isMe ? 'flex-row-reverse' : 'flex-row')}>
                {!isMe && (
                  <Avatar className="h-7 w-7 shrink-0 mt-1">
                    <AvatarImage src={otherUser.avatar_url ?? undefined} />
                    <AvatarFallback className="text-xs">
                      {(otherUser.display_name ?? otherUser.username).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className={cn('max-w-[70%] flex flex-col', isMe ? 'items-end' : 'items-start')}>
                  <div
                    className={cn(
                      'px-3 py-2 rounded-2xl text-sm break-words',
                      isMe
                        ? 'bg-primary text-primary-foreground rounded-tr-sm'
                        : 'bg-muted rounded-tl-sm'
                    )}
                  >
                    {msg.content}
                  </div>
                  <div className={cn('flex items-center gap-1 mt-0.5', isMe ? 'flex-row-reverse' : 'flex-row')}>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: vi })}
                    </span>
                    {isMe && (
                      msg.is_read
                        ? <CheckCheck className="h-3 w-3 text-blue-500" />
                        : <Check className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Send form */}
      <div className="border-t p-3 shrink-0">
        <div className="flex gap-2 items-end">
          <Textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nhập tin nhắn... (Enter gửi, Shift+Enter xuống dòng)"
            className="min-h-[40px] max-h-32 resize-none text-sm"
            rows={1}
          />
          <Button
            onClick={handleSend}
            disabled={!content.trim() || sending}
            size="icon"
            className="shrink-0 h-10 w-10"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
