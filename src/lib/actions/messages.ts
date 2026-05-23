'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function getOrCreateConversation(otherUserId: string): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  if (user.id === otherUserId) return null

  try {
    // ── Step 1: Tìm conversation đã có qua conversation_participants ──────────
    // Dùng regular client (user có quyền SELECT cho các conversation của họ).
    // Không phụ thuộc unique_key hay RLS policy nào đặc biệt.
    const { data: myRows } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id)

    if (myRows && myRows.length > 0) {
      const myIds = myRows.map(r => r.conversation_id)
      const { data: shared } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', otherUserId)
        .in('conversation_id', myIds)
        .maybeSingle()
      if (shared) return shared.conversation_id
    }

    // ── Step 2: Tạo conversation mới qua admin client ─────────────────────────
    // Admin client (service_role) bypass toàn bộ RLS nên hoạt động với mọi
    // phiên bản migration (002, 007...).
    const admin = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const convTable = (admin as unknown as any).from('conversations')
    const uniqueKey = [user.id, otherUserId].sort().join(':')

    // Tìm lại theo unique_key (phòng race condition giữa step 1 và 2)
    const { data: existingByKey } = await convTable
      .select('id')
      .eq('unique_key', uniqueKey)
      .maybeSingle()

    if (existingByKey) return (existingByKey as { id: string }).id

    // Tạo conversation
    const { data: conv, error: insertErr } = await convTable
      .insert({ unique_key: uniqueKey })
      .select('id')
      .single()

    if (insertErr) {
      // Race condition: conversation vừa được tạo bởi request khác
      if (insertErr.code === '23505') {
        const { data: retry } = await convTable
          .select('id')
          .eq('unique_key', uniqueKey)
          .maybeSingle()
        if (!retry) return null
        // Đảm bảo participants tồn tại
        await admin.from('conversation_participants').insert([
          { conversation_id: (retry as { id: string }).id, user_id: user.id },
          { conversation_id: (retry as { id: string }).id, user_id: otherUserId },
        ]).then(() => {})
        return (retry as { id: string }).id
      }
      console.error('[getOrCreateConversation] insert error:', insertErr.message)
      return null
    }

    if (!conv) return null

    // Thêm cả 2 participants qua admin client
    await admin.from('conversation_participants').insert([
      { conversation_id: (conv as { id: string }).id, user_id: user.id },
      { conversation_id: (conv as { id: string }).id, user_id: otherUserId },
    ])

    return (conv as { id: string }).id
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
