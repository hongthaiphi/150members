-- Fix: Button "Nhắn tin" bị treo ở trạng thái "Đang mở..."
-- Root cause: getOrCreateConversation dùng admin client để tạo conversation + insert cả 2 participants.
-- Nếu admin client gặp lỗi và throw, handleClick không có try/catch → loading state không reset.
-- Solution: Thay bằng SECURITY DEFINER RPC để thực hiện atomically, không cần admin client.

CREATE OR REPLACE FUNCTION get_or_create_dm(p_other_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_conv_id UUID;
  v_unique_key TEXT;
BEGIN
  -- Validate: không tự nhắn tin với mình
  IF auth.uid() = p_other_user_id THEN
    RAISE EXCEPTION 'Cannot start a conversation with yourself';
  END IF;

  -- Validate: người dùng kia phải tồn tại
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_other_user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- unique_key = sorted pair của 2 user IDs (không phân biệt ai khởi tạo)
  v_unique_key := LEAST(auth.uid()::text, p_other_user_id::text)
    || ':' ||
    GREATEST(auth.uid()::text, p_other_user_id::text);

  -- Tìm conversation đã có theo unique_key
  SELECT id INTO v_conv_id
  FROM conversations
  WHERE unique_key = v_unique_key;

  IF FOUND THEN
    RETURN v_conv_id;
  END IF;

  -- Tạo conversation mới (atomically, xử lý race condition)
  INSERT INTO conversations (unique_key)
  VALUES (v_unique_key)
  ON CONFLICT (unique_key) DO UPDATE SET unique_key = EXCLUDED.unique_key
  RETURNING id INTO v_conv_id;

  -- Thêm cả 2 participants (SECURITY DEFINER cho phép insert user khác)
  INSERT INTO conversation_participants (conversation_id, user_id)
  VALUES
    (v_conv_id, auth.uid()),
    (v_conv_id, p_other_user_id)
  ON CONFLICT DO NOTHING;

  RETURN v_conv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog;

-- Grant execute cho authenticated users
GRANT EXECUTE ON FUNCTION get_or_create_dm(UUID) TO authenticated;
