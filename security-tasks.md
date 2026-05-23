# Security Fix Tasks

Các task cần thực hiện để vá lỗ hổng bảo mật theo kết quả rà soát toàn bộ codebase.

---

## 🔴 CRITICAL

### [C-1] Private space post detail không kiểm tra quyền truy cập
**File:** `src/app/(main)/spaces/[slug]/posts/[id]/page.tsx`

**Vấn đề:** Middleware mở route `/spaces/[slug]/posts/[id]` cho public (kể cả guest). Trang post detail không có check `space.is_private`. Ai cũng đọc được nội dung private space nếu biết URL bài viết.

**Việc cần làm:**
- [ ] Sau khi fetch `space` và `isMember`, thêm guard:
  ```typescript
  if (space.is_private && !isMember && !canManage) notFound()
  ```
- [ ] Đặt guard này **trước** khi render bất kỳ nội dung nào của bài viết
- [ ] Verify: truy cập URL bài viết trong private space khi chưa login → phải nhận 404

---

## 🟠 HIGH

### [H-1] Messages UPDATE WITH CHECK là tautology — recipient sửa được nội dung tin nhắn
**File:** `supabase/migrations/007_rls_hardening.sql`

**Vấn đề:** `WITH CHECK (sender_id = sender_id)` luôn `TRUE`. Recipient có thể UPDATE bất kỳ cột nào (kể cả `content`) của tin nhắn họ nhận.

**Việc cần làm:**
- [ ] Tạo migration mới (ví dụ `008_fix_message_update_rls.sql`)
- [ ] Thay thế policy bằng RPC function `SECURITY DEFINER` để chỉ mark tin nhắn là đã đọc:
  ```sql
  DROP POLICY IF EXISTS "Recipients can mark messages as read" ON messages;

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
  ```
- [ ] Xóa toàn bộ UPDATE policy trên `messages` (không cho phép UPDATE trực tiếp từ client)
- [ ] Cập nhật `markConversationRead` trong `src/lib/actions/messages.ts` để gọi RPC thay vì `.update()`
- [ ] Verify: gọi Supabase API trực tiếp để UPDATE `content` của message → phải bị từ chối

---

### [H-2] `createComment` không kiểm tra space membership
**File:** `src/lib/actions/comments.ts`

**Vấn đề:** Bất kỳ user đã đăng nhập nào có thể bình luận vào bài viết của private space bằng cách gọi Server Action trực tiếp. RLS chỉ check `auth.uid() = author_id`.

**Việc cần làm:**
- [ ] Trong `createComment`, sau khi verify user, thêm:
  ```typescript
  const { data: post } = await supabase
    .from('posts')
    .select('space_id')
    .eq('id', postId)
    .single()
  if (!post) return { error: 'Bài viết không tồn tại' }

  const { data: space } = await supabase
    .from('spaces')
    .select('is_private')
    .eq('id', post.space_id)
    .single()

  if (space?.is_private) {
    const { data: member } = await supabase
      .from('space_members')
      .select('user_id')
      .eq('space_id', post.space_id)
      .eq('user_id', user.id)
      .single()
    if (!member) return { error: 'Bạn không phải thành viên của Space này' }
  }
  ```
- [ ] Tạo migration thêm membership check vào RLS của `comments`:
  ```sql
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
  ```
- [ ] Verify: user không phải member của private space gọi `createComment` → phải bị từ chối

---

### [H-3] Storage bucket `spaces` — xóa/ghi đè ảnh của người khác
**File:** `supabase/migrations/004_storage_policies.sql`

**Vấn đề:** Policy UPDATE và DELETE trên bucket `spaces` chỉ check `auth.role() = 'authenticated'`, không check path ownership. Bất kỳ user nào có thể xóa ảnh của space khác.

**Việc cần làm:**
- [ ] Tạo migration mới để sửa policy:
  ```sql
  DROP POLICY IF EXISTS "Users can update space images" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete space images" ON storage.objects;

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
  ```
- [ ] Đảm bảo upload route (`/api/upload`) lưu file theo path `{user.id}/{timestamp}.{ext}` trong bucket `spaces` (đã đúng, chỉ cần verify)
- [ ] Verify: user A không thể DELETE file thuộc path của user B trong bucket `spaces`

---

### [H-4] `updateProfile` thiếu server-side length validation
**File:** `src/lib/actions/profile.ts`

**Vấn đề:** Server Action không validate độ dài `display_name` (max 50) và `bio` (max 300). Client Zod validation có thể bị bypass khi gọi Server Action trực tiếp.

**Việc cần làm:**
- [ ] Thêm server-side validation vào `updateProfile`:
  ```typescript
  const displayName = (data.display_name ?? '').trim()
  const bio = (data.bio ?? '').trim()

  if (displayName.length > 50) return { error: 'Tên hiển thị tối đa 50 ký tự' }
  if (bio.length > 300) return { error: 'Bio tối đa 300 ký tự' }
  ```
- [ ] Thêm validation tương tự cho `social_links` (mỗi handle tối đa 100 ký tự, website phải là http/https)
- [ ] Cân nhắc thêm DB constraint: `ALTER TABLE profiles ADD CONSTRAINT display_name_length CHECK (char_length(display_name) <= 50)`

---

## 🟡 MEDIUM

### [M-1] `toggleReaction` không kiểm tra space membership
**File:** `src/lib/actions/posts.ts`

**Vấn đề:** Bất kỳ user đã đăng nhập nào có thể react vào post/comment của private space bằng cách biết `targetId`.

**Việc cần làm:**
- [ ] Trong `toggleReaction`, thêm kiểm tra quyền truy cập:
  - Nếu `targetType === 'post'`: kiểm tra post thuộc space nào, nếu private thì check membership
  - Nếu `targetType === 'comment'`: kiểm tra comment thuộc post thuộc space nào, nếu private thì check membership
- [ ] Tạo migration sửa RLS `reactions` INSERT để check space membership tương tự như `comments`

---

### [M-2] Notification spam — user tạo được notification cho bất kỳ ai
**File:** `supabase/migrations/007_rls_hardening.sql`, `src/lib/actions/comments.ts`

**Vấn đề:** Policy `"Authenticated users can insert notifications"` cho phép bất kỳ user nào tạo notification cho bất kỳ `user_id` nào. Có thể spam notification không giới hạn.

**Việc cần làm:**
- [ ] Tạo migration thay đổi policy:
  ```sql
  DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON notifications;
  -- Không cho client trực tiếp insert — chỉ server dùng service role mới insert được
  CREATE POLICY "No direct client insert" ON notifications
    FOR INSERT WITH CHECK (FALSE);
  ```
- [ ] Cập nhật tất cả notification insert trong server actions sang dùng `createAdminClient()`:
  ```typescript
  // Trong comments.ts — thay supabase bằng admin client khi insert notification
  const admin = createAdminClient()
  await admin.from('notifications').insert({ ... })
  ```
- [ ] Tìm tất cả chỗ insert notification: `grep -r "notifications.*insert" src/`
- [ ] Verify: gọi Supabase API trực tiếp để insert notification → phải bị từ chối

---

### [M-3] Rate Limiting in-memory — không hiệu quả trên Vercel serverless
**File:** `src/lib/rate-limit.ts`

**Vấn đề:** Rate limiter dùng in-memory `Map`. Trên Vercel, mỗi request có thể chạy instance mới → rate limit không được enforce → user upload không giới hạn.

**Việc cần làm:**
- [ ] Cài Upstash Redis hoặc Vercel KV:
  ```bash
  npm install @upstash/ratelimit @upstash/redis
  ```
- [ ] Rewrite `src/lib/rate-limit.ts` dùng Upstash:
  ```typescript
  import { Ratelimit } from '@upstash/ratelimit'
  import { Redis } from '@upstash/redis'

  const redis = Redis.fromEnv()
  export const uploadRateLimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '1 m'),
  })
  ```
- [ ] Thêm env vars `UPSTASH_REDIS_REST_URL` và `UPSTASH_REDIS_REST_TOKEN`
- [ ] Cập nhật `src/app/api/upload/route.ts` dùng rate limiter mới
- [ ] Cân nhắc thêm rate limit cho các Server Actions nhạy cảm (createPost, createComment)

---

### [M-4] RLS `posts` và `comments` SELECT quá rộng — lộ private data qua direct API
**File:** `supabase/migrations/002_rls_policies.sql`

**Vấn đề:** `CREATE POLICY "Anyone can view posts" USING (TRUE)` cho phép bất kỳ ai dùng anon key trực tiếp đọc toàn bộ posts kể cả private space. Tương tự với `comments`.

**Việc cần làm:**
- [ ] Tạo migration sửa policy `posts` SELECT:
  ```sql
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
  ```
- [ ] Tạo migration tương tự cho `comments`:
  ```sql
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
  ```
- [ ] Test kỹ performance (thêm index nếu cần) vì policy có subquery lồng nhau

---

### [M-5] Storage bucket `avatars` INSERT không giới hạn path
**File:** `supabase/migrations/004_storage_policies.sql`

**Vấn đề:** Policy INSERT cho `avatars` không kiểm tra path. User có thể upload file vào thư mục `{other_user_id}/` của người khác.

**Việc cần làm:**
- [ ] Tạo migration sửa policy:
  ```sql
  DROP POLICY IF EXISTS "Anyone can upload an avatar" ON storage.objects;
  CREATE POLICY "Users can upload to their own avatar folder" ON storage.objects
    FOR INSERT WITH CHECK (
      bucket_id = 'avatars' AND
      auth.uid()::text = (storage.foldername(name))[1]
    );
  ```
- [ ] Verify: user A không thể upload vào path `{user_B_id}/avatar.jpg`

---

## 📋 Checklist tổng hợp

| # | Task | Mức độ | Trạng thái |
|:--|:-----|:-------|:-----------|
| C-1 | Private post detail guard | 🔴 Critical | ⬜ Chưa làm |
| H-1 | Message UPDATE tautology | 🟠 High | ⬜ Chưa làm |
| H-2 | createComment membership check | 🟠 High | ⬜ Chưa làm |
| H-3 | Storage spaces bucket policies | 🟠 High | ⬜ Chưa làm |
| H-4 | updateProfile server-side validation | 🟠 High | ⬜ Chưa làm |
| M-1 | toggleReaction membership check | 🟡 Medium | ⬜ Chưa làm |
| M-2 | Notification spam — service role | 🟡 Medium | ⬜ Chưa làm |
| M-3 | Rate limit → Upstash Redis | 🟡 Medium | ⬜ Chưa làm |
| M-4 | RLS posts/comments SELECT quá rộng | 🟡 Medium | ⬜ Chưa làm |
| M-5 | Storage avatars INSERT path check | 🟡 Medium | ⬜ Chưa làm |

---

*Tạo ngày: 2026-05-23 — Dựa trên security audit toàn bộ codebase*
