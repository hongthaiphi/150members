-- Bug fixes migration

-- ============================================================
-- Bug 1 fix: Race condition in DM conversation creation
-- Add unique_key column to conversations to allow atomic upsert
-- unique_key = sorted pair of user UUIDs, e.g. "uuid-a:uuid-b"
-- ============================================================
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS unique_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_unique_key
  ON conversations (unique_key)
  WHERE unique_key IS NOT NULL;

-- ============================================================
-- Bug 3 fix: Efficient reaction counts via RPC
-- Returns [{target_id, count}] for an array of target IDs
-- Replaces the pattern of fetching ALL reaction rows into JS memory
-- ============================================================
CREATE OR REPLACE FUNCTION get_reaction_counts(target_ids UUID[])
RETURNS TABLE(target_id UUID, count BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT target_id, COUNT(*) AS count
  FROM reactions
  WHERE reactions.target_id = ANY(target_ids)
  GROUP BY reactions.target_id;
$$;

-- ============================================================
-- Bug 9 fix: posts storage bucket (for rich-text image uploads)
-- Create the bucket and set public read policy
-- Run in Supabase dashboard if storage bucket creation via SQL is not supported
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('posts', 'posts', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read access for posts bucket"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'posts');

CREATE POLICY "Authenticated users can upload to posts bucket"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'posts'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own files in posts bucket"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'posts'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
