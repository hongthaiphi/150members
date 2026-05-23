-- H-3: Fix spaces bucket — INSERT/UPDATE/DELETE must check path ownership, not just auth role
DROP POLICY IF EXISTS "Authenticated users can upload space images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update space images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete space images" ON storage.objects;

CREATE POLICY "Users can upload to their own space folder" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'spaces' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Owners can update space images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'spaces' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Owners can delete space images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'spaces' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- M-5: Fix avatars bucket — INSERT must be scoped to user's own folder
DROP POLICY IF EXISTS "Anyone can upload an avatar" ON storage.objects;

CREATE POLICY "Users can upload to their own avatar folder" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
