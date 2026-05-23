'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export type GetOrCreateConversationResult = { id: string | null; error?: string }

export async function getOrCreateConversation(otherUserId: string): Promise<GetOrCreateConversationResult> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { id: null, error: 'Chưa đăng nhập' }
    if (user.id === otherUserId) return { id: null, error: 'Không thể tự nhắn tin với chính mình' }

    // Admin client bypass toàn bộ RLS — tránh lỗi recursive policy trên
    // conversation_participants (migration 007).
    let admin: ReturnType<typeof createAdminClient>
    try {
      admin = createAdminClient()
    } catch (e) {
      return { id: null, error: 'admin-init: ' + (e as Error).message }
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return { id: null, error: 'Thiếu SUPABASE_SERVICE_ROLE_KEY trong môi trường runtime' }
    }

    // ── Step 1: Tìm conversation đã có qua admin client ───────────────────────
    const { data: myRows, error: e1 } = await admin
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id)

    if (e1) return { id: null, error: 'step1: ' + e1.message }

    if (myRows && myRows.length > 0) {
      const myIds = (myRows as { conversation_id: string }[]).map(r => r.conversation_id)
      const { data: shared, error: e2 } = await admin
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', otherUserId)
        .in('conversation_id', myIds)
        .maybeSingle()

      if (e2) return { id: null, error: 'step2: ' + e2.message }
      if (shared) return { id: (shared as { conversation_id: string }).conversation_id }
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
        const { data: conv2, error: err2 } = await admin
          .from('conversations')
          .insert({})
          .select('id')
          .single()
        if (err2) return { id: null, error: 'create: ' + err2.message }
        convId = conv2 ? (conv2 as { id: string }).id : null
      }
    } else {
      convId = conv ? (conv as { id: string }).id : null
    }

    if (!convId) return { id: null, error: 'Không tạo được conversation (id rỗng)' }

    // Thêm cả 2 participants
    const { error: partErr } = await admin
      .from('conversation_participants')
      .insert([
        { conversation_id: convId, user_id: user.id },
        { conversation_id: convId, user_id: otherUserId },
      ])

    if (partErr && partErr.code !== '23505') {
      return { id: null, error: 'participants: ' + partErr.message }
    }

    return { id: convId }
  } catch (err) {
    return { id: null, error: 'unexpected: ' + (err as Error).message }
  }
}

export async function sendMessage(conversationId: string, content: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const trimmed = content.trim()
  if (!trimmed) return { error: 'Tin nhắn không được để trống' }

  // Admin client bypass RLS — tránh lỗi recursive policy (42P17) trên
  // conversation_participants. Quyền gửi vẫn được kiểm tra tường minh.
  const admin = createAdminClient()

  const { data: member } = await admin
    .from('conversation_participants')
    .select('user_id')
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!member) return { error: 'Không có quyền gửi tin nhắn' }

  const { data: inserted, error } = await admin
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: trimmed,
    })
    .select('*')
    .single()

  if (!error) {
    await admin
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId)
    revalidatePath(`/messages/${conversationId}`)
  }

  return { error: error?.message, message: inserted ?? undefined }
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

export async function getDmOverview(): Promise<{ convIds: string[]; unread: number }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { convIds: [], unread: 0 }

  // Admin client bypass RLS — client component không dùng được admin nên
  // badge gọi server action này để lấy số liệu (tránh recursive RLS 42P17).
  const admin = createAdminClient()
  const { data: parts } = await admin
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', user.id)

  const convIds = (parts ?? []).map((p: { conversation_id: string }) => p.conversation_id)
  if (convIds.length === 0) return { convIds: [], unread: 0 }

  const { count } = await admin
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .in('conversation_id', convIds)
    .neq('sender_id', user.id)
    .eq('is_read', false)

  return { convIds, unread: count ?? 0 }
}

export async function markConversationRead(conversationId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  // H-1: Use SECURITY DEFINER RPC instead of direct UPDATE to prevent tautology bypass
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as unknown as any).rpc('mark_messages_read', { p_conversation_id: conversationId })
}
