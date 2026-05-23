'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getOrCreateConversation(otherUserId: string): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  if (user.id === otherUserId) return null

  // Use SECURITY DEFINER RPC (migration 011) instead of admin client.
  // The RPC runs as DB superuser — handles conversation creation + both participants atomically.
  // This avoids depending on SUPABASE_SERVICE_ROLE_KEY on the client side and fixes
  // the "button stuck at Đang mở..." bug caused by unhandled admin client errors.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as unknown as any).rpc('get_or_create_dm', {
    p_other_user_id: otherUserId,
  })

  if (error) {
    console.error('[getOrCreateConversation] RPC error:', error.message)
    return null
  }

  return (data as string) ?? null
}

export async function sendMessage(conversationId: string, content: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const trimmed = content.trim()
  if (!trimmed) return { error: 'Tin nhắn không được để trống' }

  const { data: member } = await supabase
    .from('conversation_participants')
    .select('user_id')
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id)
    .single()
  if (!member) return { error: 'Không có quyền gửi tin nhắn' }

  const { error } = await supabase.from('messages').insert({
    conversation_id: conversationId,
    sender_id: user.id,
    content: trimmed,
  })

  if (!error) {
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId)
    revalidatePath(`/messages/${conversationId}`)
  }

  return { error: error?.message }
}

export async function searchUsersForDM(query: string): Promise<Array<{ id: string; username: string; display_name: string | null; avatar_url: string | null }>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !query.trim()) return []

  const q = query.trim().toLowerCase()
  const { data } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .neq('id', user.id)
    .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
    .limit(8)

  return (data ?? []) as Array<{ id: string; username: string; display_name: string | null; avatar_url: string | null }>
}

export async function markConversationRead(conversationId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  // H-1: Use SECURITY DEFINER RPC instead of direct UPDATE to prevent tautology bypass
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as unknown as any).rpc('mark_messages_read', { p_conversation_id: conversationId })
}
