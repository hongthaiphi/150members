-- DB-09: Row Level Security

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE space_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Helper: check if user is admin or moderator
CREATE OR REPLACE FUNCTION is_admin_or_moderator(uid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = uid AND role IN ('admin', 'moderator')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_admin(uid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = uid AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- profiles
CREATE POLICY "Anyone can view profiles" ON profiles FOR SELECT USING (TRUE);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins can update any profile" ON profiles FOR UPDATE USING (is_admin(auth.uid()));

-- spaces
CREATE POLICY "Anyone can view public spaces" ON spaces FOR SELECT USING (
  NOT is_private
  OR created_by = auth.uid()
  OR EXISTS (SELECT 1 FROM space_members WHERE space_id = id AND user_id = auth.uid())
);
CREATE POLICY "Members can create spaces" ON spaces FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Creator and admins can update space" ON spaces FOR UPDATE USING (
  created_by = auth.uid() OR is_admin_or_moderator(auth.uid())
);
CREATE POLICY "Admin only can delete space" ON spaces FOR DELETE USING (is_admin(auth.uid()));

-- space_members
CREATE POLICY "Members can view space membership" ON space_members FOR SELECT USING (
  user_id = auth.uid()
);
CREATE POLICY "Users can join spaces" ON space_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave spaces" ON space_members FOR DELETE USING (auth.uid() = user_id);

-- posts
CREATE POLICY "Members can view posts in spaces they belong to" ON posts FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM spaces s
    LEFT JOIN space_members sm ON sm.space_id = s.id AND sm.user_id = auth.uid()
    WHERE s.id = space_id AND (NOT s.is_private OR sm.user_id IS NOT NULL)
  )
);
CREATE POLICY "Space members can create posts" ON posts FOR INSERT WITH CHECK (
  auth.uid() = author_id AND
  EXISTS (SELECT 1 FROM space_members WHERE space_id = posts.space_id AND user_id = auth.uid())
);
CREATE POLICY "Author and admins can update posts" ON posts FOR UPDATE USING (
  author_id = auth.uid() OR is_admin_or_moderator(auth.uid())
);
CREATE POLICY "Author and admins can delete posts" ON posts FOR DELETE USING (
  author_id = auth.uid() OR is_admin_or_moderator(auth.uid())
);

-- comments
CREATE POLICY "Anyone who can see the post can see comments" ON comments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM posts p
    JOIN spaces s ON s.id = p.space_id
    LEFT JOIN space_members sm ON sm.space_id = s.id AND sm.user_id = auth.uid()
    WHERE p.id = post_id AND (NOT s.is_private OR sm.user_id IS NOT NULL)
  )
);
CREATE POLICY "Authenticated users can comment" ON comments FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Author and admins can update comments" ON comments FOR UPDATE USING (
  author_id = auth.uid() OR is_admin_or_moderator(auth.uid())
);
CREATE POLICY "Author and admins can delete comments" ON comments FOR DELETE USING (
  author_id = auth.uid() OR is_admin_or_moderator(auth.uid())
);

-- reactions
CREATE POLICY "Anyone can view reactions" ON reactions FOR SELECT USING (TRUE);
CREATE POLICY "Authenticated users can react" ON reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove own reactions" ON reactions FOR DELETE USING (auth.uid() = user_id);

-- notifications
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert notifications" ON notifications FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Users can mark own notifications read" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- conversations + messages
CREATE POLICY "Participants can view conversations" ON conversations FOR SELECT USING (
  EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = id AND user_id = auth.uid())
);
CREATE POLICY "Authenticated users can create conversations" ON conversations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Participants can view conversation participants" ON conversation_participants FOR SELECT USING (
  EXISTS (SELECT 1 FROM conversation_participants cp WHERE cp.conversation_id = conversation_id AND cp.user_id = auth.uid())
);
CREATE POLICY "Users can join conversations" ON conversation_participants FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Participants can view messages" ON messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = messages.conversation_id AND user_id = auth.uid())
);
CREATE POLICY "Participants can send messages" ON messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = messages.conversation_id AND user_id = auth.uid())
);
CREATE POLICY "Participants can mark messages read" ON messages FOR UPDATE USING (
  EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = messages.conversation_id AND user_id = auth.uid())
);
