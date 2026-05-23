-- DB-10: Supabase Storage configuration for avatars and spaces

-- 1. Create buckets if they don't exist
-- Note: These functions must be run as a Superuser or via Supabase Dashboard SQL Editor
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('spaces', 'spaces', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Set up RLS for Storage (storage.objects table)

-- A. Policy for 'avatars' bucket
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Anyone can upload an avatar" ON storage.objects;
CREATE POLICY "Anyone can upload an avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
CREATE POLICY "Users can update their own avatars" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
CREATE POLICY "Users can delete their own avatars" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );


-- B. Policy for 'spaces' bucket
DROP POLICY IF EXISTS "Space images are publicly accessible" ON storage.objects;
CREATE POLICY "Space images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'spaces');

DROP POLICY IF EXISTS "Authenticated users can upload space images" ON storage.objects;
CREATE POLICY "Authenticated users can upload space images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'spaces' 
    AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "Users can update space images" ON storage.objects;
CREATE POLICY "Users can update space images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'spaces' 
    AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "Users can delete space images" ON storage.objects;
CREATE POLICY "Users can delete space images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'spaces' 
    AND auth.role() = 'authenticated'
  );
