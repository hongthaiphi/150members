-- H-2: RLS for comments INSERT — require space membership for private spaces
DROP POLICY IF EXISTS "Authenticated users can comment" ON comments;

CREATE POLICY "Space members can comment" ON comments
  FOR INSERT WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (
      SELECT 1 FROM posts p
      JOIN spaces s ON s.id = p.space_id
      LEFT JOIN space_members sm ON sm.space_id = p.space_id AND sm.user_id = auth.uid()
      WHERE p.id = comments.post_id
        AND (s.is_private = FALSE OR sm.user_id IS NOT NULL)
    )
  );

-- M-2: Notifications — block direct client inserts; only service role (admin client) may insert
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON notifications;

CREATE POLICY "No direct client insert on notifications" ON notifications
  FOR INSERT WITH CHECK (FALSE);

-- M-1: RLS for reactions INSERT — require space membership for private spaces
DROP POLICY IF EXISTS "Authenticated users can react" ON reactions;

CREATE POLICY "Space members can react" ON reactions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND (
      -- Post reactions: check space membership
      (target_type = 'post' AND EXISTS (
        SELECT 1 FROM posts p
        JOIN spaces s ON s.id = p.space_id
        LEFT JOIN space_members sm ON sm.space_id = p.space_id AND sm.user_id = auth.uid()
        WHERE p.id = reactions.target_id
          AND (s.is_private = FALSE OR sm.user_id IS NOT NULL)
      ))
      OR
      -- Comment reactions: check via post → space
      (target_type = 'comment' AND EXISTS (
        SELECT 1 FROM comments c
        JOIN posts p ON p.id = c.post_id
        JOIN spaces s ON s.id = p.space_id
        LEFT JOIN space_members sm ON sm.space_id = p.space_id AND sm.user_id = auth.uid()
        WHERE c.id = reactions.target_id
          AND (s.is_private = FALSE OR sm.user_id IS NOT NULL)
      ))
    )
  );

-- M-4: RLS for posts SELECT — restrict private space posts to members only
DROP POLICY IF EXISTS "Anyone can view posts" ON posts;

CREATE POLICY "Public or member can view posts" ON posts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM spaces
      WHERE id = posts.space_id AND is_private = FALSE
    )
    OR EXISTS (
      SELECT 1 FROM space_members
      WHERE space_id = posts.space_id AND user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- M-4: RLS for comments SELECT — restrict private space comments to members only
DROP POLICY IF EXISTS "Anyone can view comments" ON comments;

CREATE POLICY "Public or member can view comments" ON comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM posts p
      JOIN spaces s ON s.id = p.space_id
      WHERE p.id = comments.post_id
        AND (
          s.is_private = FALSE
          OR EXISTS (SELECT 1 FROM space_members WHERE space_id = s.id AND user_id = auth.uid())
          OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
        )
    )
  );
