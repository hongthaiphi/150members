'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { Database } from '@/types/database'

type Notification = Database['public']['Tables']['notifications']['Row']

interface NotificationDropdownProps {
  onClose: () => void
  onCountChange: (delta: number) => void
}

const typeLabels: Record<string, string> = {
  reply: 'đã trả lời bình luận của bạn',
  mention: 'đã nhắc đến bạn',
  like: 'đã thích bài viết của bạn',
  new_post: 'đã đăng bài viết mới',
  new_member: 'đã tham gia cộng đồng',
}

export function NotificationDropdown({ onClose, onCountChange }: NotificationDropdownProps) {
  const ref = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)
      setNotifications(data ?? [])
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  async function markAllRead() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const prevUnread = notifications.filter(n => !n.is_read).length
    const table = supabase.from('notifications')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (table as unknown as any).update({ is_read: true }).eq('user_id', user.id)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    onCountChange(-prevUnread)
  }

  async function markRead(id: string) {
    const notif = notifications.find(n => n.id === id)
    if (!notif || notif.is_read) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const table = supabase.from('notifications')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (table as unknown as any).update({ is_read: true }).eq('id', id).eq('user_id', user.id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    onCountChange(-1)
  }

  const unread = notifications.filter(n => !n.is_read).length

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 w-80 bg-popover border rounded-lg shadow-lg z-50 overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <span className="font-semibold text-sm">
          Thông báo {unread > 0 && <span className="text-primary">({unread})</span>}
        </span>
        {unread > 0 && (
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={markAllRead}>
            Đánh dấu tất cả đã đọc
          </Button>
        )}
      </div>

      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            Không có thông báo nào
          </div>
        ) : (
          notifications.map(notif => {
            const data = notif.data as Record<string, string | undefined>
            const slugOk = data.space_slug && /^[a-z0-9-]+$/.test(data.space_slug)
            const idOk = data.post_id && /^[0-9a-f-]{36}$/.test(data.post_id)
            const href = slugOk && idOk ? `/spaces/${data.space_slug}/posts/${data.post_id}` : '/'
            return (
              <Link
                key={notif.id}
                href={href}
                onClick={() => { markRead(notif.id); onClose() }}
                className={`flex gap-3 px-4 py-3 hover:bg-muted/50 border-b last:border-0 ${!notif.is_read ? 'bg-primary/5' : ''}`}
              >
                {!notif.is_read && (
                  <div className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                )}
                <p className="text-sm text-foreground">
                  <span className="font-medium">{data.actor_name ?? 'Ai đó'}</span>{' '}
                  {typeLabels[notif.type] ?? notif.type}
                </p>
                <span className="text-xs text-muted-foreground shrink-0 ml-auto">
                  {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: vi })}
                </span>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
