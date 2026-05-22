import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MessageThread } from '@/components/messages/message-thread'
import type { Database } from '@/types/database'

type Message = Database['public']['Tables']['messages']['Row']
type OtherUser = { id: string; username: string; display_name: string | null; avatar_url: string | null }

interface Props {
  params: { id: string }
}

export default async function ConversationPage({ params }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: participation } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('conversation_id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!participation) notFound()

  const { data: otherParticipant } = await supabase
    .from('conversation_participants')
    .select('profiles(id, username, display_name, avatar_url)')
    .eq('conversation_id', params.id)
    .neq('user_id', user.id)
    .single()

  const otherUser = otherParticipant?.profiles as OtherUser | null
  if (!otherUser) notFound()

  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', params.id)
    .order('created_at', { ascending: true })
    .limit(100)

  return (
    <MessageThread
      conversationId={params.id}
      initialMessages={(messages ?? []) as Message[]}
      currentUserId={user.id}
      otherUser={otherUser!}
    />
  )
}
