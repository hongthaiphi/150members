-- Migration 012: Fix infinite recursion in conversation_participants RLS
--
-- Migration 007 replaced the conversation_participants SELECT policy with one
-- whose USING clause queries conversation_participants itself:
--
--   USING (EXISTS (SELECT 1 FROM conversation_participants cp
--                  WHERE cp.conversation_id = conversation_participants.conversation_id
--                    AND cp.user_id = auth.uid()))
--
-- The inner subquery re-triggers the same policy, so PostgreSQL raises
-- 42P17 "infinite recursion detected in policy for relation
-- conversation_participants". This makes EVERY read of that table — and of
-- conversations / messages, which reference it — fail for the regular
-- anon/authenticated client.
--
-- Symptoms this caused:
--   * /messages/[id] participation check returned null -> notFound() -> 404
--   * /messages conversation list was always empty
--   * DM unread badge never appeared
--   * sending a message returned "Không có quyền gửi tin nhắn"
--
-- Fix: move the membership test into a SECURITY DEFINER function. Because the
-- function executes with the definer's privileges it bypasses RLS, so the
-- inner lookup no longer re-enters the policy -> no recursion.

CREATE OR REPLACE FUNCTION is_conversation_member(p_conversation_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = p_conversation_id
      AND user_id = p_user_id
  );
$$;

GRANT EXECUTE ON FUNCTION is_conversation_member(UUID, UUID) TO authenticated;

-- ── conversation_participants SELECT (the recursive policy) ──────────────────
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON conversation_participants;
CREATE POLICY "Users can view participants of their conversations" ON conversation_participants
  FOR SELECT USING (
    is_conversation_member(conversation_id, auth.uid())
  );

-- ── conversations SELECT / UPDATE (referenced conversation_participants) ─────
DROP POLICY IF EXISTS "Participants can view their conversations" ON conversations;
CREATE POLICY "Participants can view their conversations" ON conversations
  FOR SELECT USING (
    is_conversation_member(id, auth.uid())
  );

DROP POLICY IF EXISTS "Participants can update their conversations" ON conversations;
CREATE POLICY "Participants can update their conversations" ON conversations
  FOR UPDATE USING (
    is_conversation_member(id, auth.uid())
  );

-- ── messages SELECT / INSERT (referenced conversation_participants) ──────────
DROP POLICY IF EXISTS "Participants can view messages" ON messages;
CREATE POLICY "Participants can view messages" ON messages
  FOR SELECT USING (
    is_conversation_member(conversation_id, auth.uid())
  );

DROP POLICY IF EXISTS "Participants can send messages" ON messages;
CREATE POLICY "Participants can send messages" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND is_conversation_member(conversation_id, auth.uid())
  );

-- Note: messages UPDATE (mark-as-read) is intentionally NOT a policy — migration
-- 008 removed direct UPDATE and routes it through the mark_messages_read() RPC,
-- which is SECURITY DEFINER and therefore unaffected by this recursion.
