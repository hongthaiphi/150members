-- H-1: Fix message UPDATE tautology — replace permissive UPDATE policy with SECURITY DEFINER RPC

-- Drop the broken policy (WITH CHECK (sender_id = sender_id) is always TRUE)
DROP POLICY IF EXISTS "Recipients can mark messages as read" ON messages;

-- No direct UPDATE allowed from client on messages at all
-- Marking messages read is handled exclusively via mark_messages_read() RPC

CREATE OR REPLACE FUNCTION mark_messages_read(p_conversation_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE messages
  SET is_read = TRUE
  WHERE conversation_id = p_conversation_id
    AND sender_id != auth.uid()
    AND is_read = FALSE
    AND EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = p_conversation_id AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
