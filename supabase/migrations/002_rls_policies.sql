-- DB-09: Row Level Security - Robust Policies

-- Enable RLS on all tables
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

-- Helper functions
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

-- 1. profiles
DROP POLICY IF EXISTS "Anyone can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;

CREATE POLICY "Anyone can view profiles" ON profiles FOR SELECT USING (TRUE);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins can update any profile" ON profiles FOR UPDATE USING (is_admin(auth.uid()));

-- 2. spaces
DROP POLICY IF EXISTS "Anyone can view public spaces" ON spaces;
DROP POLICY IF EXISTS "Anyone can view spaces" ON spaces;
DROP POLICY IF EXISTS "Members can create spaces" ON spaces;
DROP POLICY IF EXISTS "Creator and admins can update space" ON spaces;
DROP POLICY IF EXISTS "Admin only can delete space" ON spaces;

CREATE POLICY "Anyone can view spaces" ON spaces FOR SELECT USING (TRUE);
CREATE POLICY "Members can create spaces" ON spaces FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Creator and admins can update space" ON spaces FOR UPDATE USING (
  created_by = auth.uid() OR is_admin_or_moderator(auth.uid())
);
CREATE POLICY "Admin only can delete space" ON spaces FOR DELETE USING (is_admin(auth.uid()));

-- 3. space_members
DROP POLICY IF EXISTS "Members can view space membership" ON space_members;
DROP POLICY IF EXISTS "Users can join spaces" ON space_members;
DROP POLICY IF EXISTS "Users can leave spaces" ON space_members;
DROP POLICY IF EXISTS "Admins can view all memberships" ON space_members;

-- Allow viewing memberships (needed for joining check and profile space list)
CREATE POLICY "Anyone can view space memberships" ON space_members FOR SELECT USING (TRUE);
CREATE POLICY "Users can join spaces" ON space_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave spaces" ON space_members FOR DELETE USING (auth.uid() = user_id);

-- 4. posts
DROP POLICY IF EXISTS "Members can view posts in spaces they belong to" ON posts;
DROP POLICY IF EXISTS "Anyone can view posts" ON posts;
DROP POLICY IF EXISTS "Space members can create posts" ON posts;
DROP POLICY IF EXISTS "Author and admins can update posts" ON posts;
DROP POLICY IF EXISTS "Author and admins can delete posts" ON posts;

CREATE POLICY "Anyone can view posts" ON posts FOR SELECT USING (TRUE);
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

-- 5. comments
DROP POLICY IF EXISTS "Anyone who can see the post can see comments" ON comments;
DROP POLICY IF EXISTS "Anyone can view comments" ON comments;
DROP POLICY IF EXISTS "Authenticated users can comment" ON comments;
DROP POLICY IF EXISTS "Author and admins can update comments" ON comments;
DROP POLICY IF EXISTS "Author and admins can delete comments" ON comments;

CREATE POLICY "Anyone can view comments" ON comments FOR SELECT USING (TRUE);
CREATE POLICY "Authenticated users can comment" ON comments FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Author and admins can update comments" ON comments FOR UPDATE USING (
  author_id = auth.uid() OR is_admin_or_moderator(auth.uid())
);
CREATE POLICY "Author and admins can delete comments" ON comments FOR DELETE USING (
  author_id = auth.uid() OR is_admin_or_moderator(auth.uid())
);

-- 6. reactions
DROP POLICY IF EXISTS "Anyone can view reactions" ON reactions;
DROP POLICY IF EXISTS "Authenticated users can react" ON reactions;
DROP POLICY IF EXISTS "Users can remove own reactions" ON reactions;

CREATE POLICY "Anyone can view reactions" ON reactions FOR SELECT USING (TRUE);
CREATE POLICY "Authenticated users can react" ON reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove own reactions" ON reactions FOR DELETE USING (auth.uid() = user_id);

-- 7. notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Users can mark own notifications read" ON notifications;

CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Authenticated users can insert notifications" ON notifications FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- 8. conversations
DROP POLICY IF EXISTS "Participants can view conversations" ON conversations;
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Anyone can view conversations" ON conversations;

CREATE POLICY "Anyone can view conversations" ON conversations FOR SELECT USING (TRUE);
CREATE POLICY "Authenticated users can create conversations" ON conversations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update conversations" ON conversations FOR UPDATE USING (auth.uid() IS NOT NULL);

-- 9. conversation_participants
DROP POLICY IF EXISTS "Participants can view conversation participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can join conversations" ON conversation_participants;

CREATE POLICY "Anyone can view conversation participants" ON conversation_participants FOR SELECT USING (TRUE);
CREATE POLICY "Authenticated users can join conversations" ON conversation_participants FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 10. messages
DROP POLICY IF EXISTS "Participants can view messages" ON messages;
DROP POLICY IF EXISTS "Participants can send messages" ON messages;
DROP POLICY IF EXISTS "Participants can mark messages read" ON messages;

CREATE POLICY "Participants can view messages" ON messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = messages.conversation_id AND user_id = auth.uid())
);
CREATE POLICY "Participants can send messages" ON messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = messages.conversation_id AND user_id = auth.uid())
);
CREATE POLICY "Participants can update messages" ON messages FOR UPDATE USING (
  EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = messages.conversation_id AND user_id = auth.uid())
);
