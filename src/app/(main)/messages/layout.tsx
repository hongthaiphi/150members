import { createClient } from '@/lib/supabase/server'
import { ConversationList } from '@/components/messages/conversation-list'

export type OtherUser = {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
}

export type ConversationItem = {
  id: string
  updated_at: string
  other_user: OtherUser
  last_message: {
    content: string
    created_at: string
    sender_id: string
  } | null
  unread_count: number
}

export default async function MessagesLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let conversations: ConversationItem[] = []

  if (user) {
    const { data: myParticipations } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id)

    const convIds = (myParticipations ?? []).map(p => p.conversation_id)

    if (convIds.length > 0) {
      const [convsResult, othersResult, msgsResult, unreadResult] = await Promise.all([
        supabase
          .from('conversations')
          .select('id, updated_at')
          .in('id', convIds)
          .order('updated_at', { ascending: false }),
        supabase
          .from('conversation_participants')
          .select('conversation_id, profiles(id, username, display_name, avatar_url)')
          .in('conversation_id', convIds)
          .neq('user_id', user.id),
        supabase
          .from('messages')
          .select('conversation_id, content, created_at, sender_id')
          .in('conversation_id', convIds)
          .order('created_at', { ascending: false })
          .limit(convIds.length * 3),
        supabase
          .from('messages')
          .select('conversation_id')
          .in('conversation_id', convIds)
          .neq('sender_id', user.id)
          .eq('is_read', false),
      ])

      const lastMsgByConv = new Map<string, { content: string; created_at: string; sender_id: string }>()
      for (const msg of msgsResult.data ?? []) {
        if (!lastMsgByConv.has(msg.conversation_id)) {
          lastMsgByConv.set(msg.conversation_id, {
            content: msg.content,
            created_at: msg.created_at,
            sender_id: msg.sender_id,
          })
        }
      }

      const unreadByConv = new Map<string, number>()
      for (const msg of unreadResult.data ?? []) {
        unreadByConv.set(msg.conversation_id, (unreadByConv.get(msg.conversation_id) ?? 0) + 1)
      }

      const otherByConv = new Map<string, OtherUser>()
      for (const p of othersResult.data ?? []) {
        const prof = (p as { conversation_id: string; profiles: OtherUser | null }).profiles
        if (prof) otherByConv.set((p as { conversation_id: string }).conversation_id, prof)
      }

      conversations = (convsResult.data ?? [])
        .map((conv: { id: string; updated_at: string }) => ({
          id: conv.id,
          updated_at: conv.updated_at,
          other_user: otherByConv.get(conv.id)!,
          last_message: lastMsgByConv.get(conv.id) ?? null,
          unread_count: unreadByConv.get(conv.id) ?? 0,
        }))
        .filter((c: ConversationItem) => c.other_user != null)
    }
  }

  return (
    <div className="flex h-full">
      <div className="w-72 border-r shrink-0 flex flex-col">
        <div className="h-14 flex items-center px-4 border-b shrink-0">
          <h2 className="font-semibold">Tin nhắn</h2>
        </div>
        <ConversationList
          initialConversations={conversations}
          currentUserId={user?.id ?? ''}
        />
      </div>
      <div className="flex-1 min-w-0 flex flex-col">
        {children}
      </div>
    </div>
  )
}
