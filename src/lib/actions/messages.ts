'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function getOrCreateConversation(otherUserId: string): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  if (user.id === otherUserId) return null

  const { data: otherProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', otherUserId)
    .single()
  if (!otherProfile) return null

  // Use admin client for conversation lookup/create to bypass RLS.
  // The user-facing RLS now restricts SELECT on conversations to participants only,
  // but we need to check unique_key before any participant row exists.
  const admin = createAdminClient()

  // Bug 1 fix: use atomic upsert via unique_key to prevent race condition duplicate conversations.
  // unique_key = sorted pair of user IDs → same key regardless of who initiates first.
  // Migration 005 adds the unique_key column + UNIQUE index to conversations table.
  const uniqueKey = [user.id, otherUserId].sort().join(':')

  // Bypass generated types (unique_key added by migration 005, types not regenerated yet)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const convTable = (admin as unknown as any).from('conversations')

  // Try to find existing conversation by unique_key first
  const { data: existing } = await convTable
    .select('id')
    .eq('unique_key', uniqueKey)
    .single()

  if (existing) return (existing as { id: string }).id

  // Insert with unique_key — if concurrent insert races us, ON CONFLICT returns error code 23505
  const { data: conv, error } = await convTable
    .insert({ unique_key: uniqueKey })
    .select('id')
    .single()

  if (error) {
    // Conflict: another concurrent request already created it — fetch it
    if (error.code === '23505') {
      const { data: retry } = await convTable
        .select('id')
        .eq('unique_key', uniqueKey)
        .single()
      return (retry as { id: string } | null)?.id ?? null
    }
    return null
  }

  if (!conv) return null

  // Insert both participants via admin client (bypasses participant-only RLS on INSERT)
  await admin.from('conversation_participants').insert([
    { conversation_id: conv.id, user_id: user.id },
    { conversation_id: conv.id, user_id: otherUserId },
  ])

  return conv.id
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

  const { data: participant } = await supabase
    .from('conversation_participants')
    .select('user_id')
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id)
    .single()

  if (!participant) return

  await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', user.id)
    .eq('is_read', false)
}
