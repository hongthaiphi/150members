'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function getOrCreateConversation(otherUserId: string): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  if (user.id === otherUserId) return null

  // Admin client bypass toàn bộ RLS — tránh lỗi recursive policy trên
  // conversation_participants (migration 007) và không phụ thuộc vào
  // bất kỳ phiên bản migration nào.
  const admin = createAdminClient()

  try {
    // ── Step 1: Tìm conversation đã có qua admin client ───────────────────────
    const { data: myRows, error: e1 } = await admin
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id)

    if (e1) console.error('[getOrCreateConversation] step1 error:', e1.message)

    if (myRows && myRows.length > 0) {
      const myIds = (myRows as { conversation_id: string }[]).map(r => r.conversation_id)
      const { data: shared, error: e2 } = await admin
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', otherUserId)
        .in('conversation_id', myIds)
        .maybeSingle()

      if (e2) console.error('[getOrCreateConversation] step2 error:', e2.message)
      if (shared) return (shared as { conversation_id: string }).conversation_id
    }

    // ── Step 2: Tạo conversation mới ─────────────────────────────────────────
    const uniqueKey = [user.id, otherUserId].sort().join(':')
    let convId: string | null = null

    // Dùng `any` vì kiểu Database chưa phản ánh cột unique_key (migration 005)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const convTable = (admin as unknown as any).from('conversations')

    // Thử insert với unique_key (migration 005+)
    const { data: conv, error: insertErr } = await convTable
      .insert({ unique_key: uniqueKey })
      .select('id')
      .single()

    if (insertErr) {
      if (insertErr.code === '23505') {
        // Race condition: tìm lại theo unique_key
        const { data: existing } = await convTable
          .select('id')
          .eq('unique_key', uniqueKey)
          .maybeSingle()
        convId = existing ? (existing as { id: string }).id : null
      } else {
        // unique_key column chưa tồn tại → insert không có unique_key
        console.warn('[getOrCreateConversation] unique_key failed, fallback:', insertErr.message)
        const { data: conv2, error: err2 } = await admin
          .from('conversations')
          .insert({})
          .select('id')
          .single()
        if (err2) {
          console.error('[getOrCreateConversation] fallback insert error:', err2.message)
          return null
        }
        convId = conv2 ? (conv2 as { id: string }).id : null
      }
    } else {
      convId = conv ? (conv as { id: string }).id : null
    }

    if (!convId) return null

    // Thêm cả 2 participants
    const { error: partErr } = await admin
      .from('conversation_participants')
      .insert([
        { conversation_id: convId, user_id: user.id },
        { conversation_id: convId, user_id: otherUserId },
      ])

    if (partErr && partErr.code !== '23505') {
      console.error('[getOrCreateConversation] participants error:', partErr.message)
    }

    return convId
  } catch (err) {
    console.error('[getOrCreateConversation] unexpected error:', err)
    return null
  }
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
