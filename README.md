# Community Platform

Nền tảng cộng đồng dạng Circle.so — nơi thành viên tạo Spaces, đăng bài, bình luận, nhắn tin riêng và quản lý cộng đồng.

## Tech Stack

| Layer      | Công nghệ                                       |
| ---------- | ----------------------------------------------- |
| Framework  | Next.js 14 (App Router)                         |
| Language   | TypeScript                                      |
| Styling    | Tailwind CSS v3 + shadcn/ui (base-ui)           |
| Backend    | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| Editor     | TipTap (rich text)                              |
| Form       | React Hook Form + Zod                           |
| Deploy     | Vercel                                          |

## Tính năng

| Module              | Chi tiết                                                                   |
| ------------------- | -------------------------------------------------------------------------- |
| **Auth**            | Đăng ký/đăng nhập email, OAuth Google & GitHub, reset mật khẩu, confirm email |
| **Profile**         | Avatar, bio, social links, badge role (Admin / Moderator / Member)        |
| **Spaces**          | Tạo/chỉnh sửa/xóa, public/private, ảnh bìa + icon, tham gia / rời        |
| **Posts**           | Rich text editor (TipTap), upload ảnh, pin/unpin, like/reaction, load more |
| **Comments**        | Nested reply 1 cấp, like, mention @username, inline edit                  |
| **Notifications**   | Realtime badge, dropdown, mark đã đọc, điều hướng đến nội dung            |
| **Direct Messages** | Chat 1-1, gửi/nhận realtime, trạng thái đã đọc, tìm kiếm thành viên      |
| **Search**          | Tìm bài viết, thành viên, spaces (full-text)                              |
| **Admin**           | Dashboard thống kê, mời thành viên, phân quyền, ban, xóa nội dung vi phạm |
| **Polish**          | Dark/Light mode, SEO + Open Graph, 404/500, rate limiting, image optimization |

---

## Cài đặt & Chạy local

### Yêu cầu
- Node.js ≥ 18
- npm ≥ 9
- Tài khoản [Supabase](https://supabase.com) (free tier đủ dùng)

### 1. Clone & cài dependencies

```bash
git clone <repo-url>
cd community-platform
npm install
```

### 2. Tạo project Supabase

1. Vào [supabase.com](https://supabase.com) → **New project**
2. **Settings → API** → copy:
   - `Project URL`
   - `anon` / `public` key
   - `service_role` key *(giữ bí mật)*

### 3. Cấu hình biến môi trường

Tạo file `.env.local` ở root dự án:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

> ⚠️ `SUPABASE_SERVICE_ROLE_KEY` chỉ dùng server-side. **Không commit file `.env.local`.**

### 4. Chạy migrations

Vào **Supabase Dashboard → SQL Editor**, chạy lần lượt từng file trong `supabase/migrations/`:

```
001_initial_schema.sql   — Tất cả bảng, indexes, triggers
002_rls_policies.sql     — Row Level Security cơ bản
003_auth_trigger.sql     — Auto-tạo profile khi đăng ký
004_storage_policies.sql — Policies cho Storage buckets
005_bug_fixes.sql        — unique_key conversations, RPC reaction counts
006_admin_features.sql   — is_banned, community_settings
007_rls_hardening.sql    — Tăng cường bảo mật RLS
```

### 5. Tạo Storage buckets

**Supabase → Storage → New bucket** (đặt **Public**):

| Bucket    | Public | Mục đích              |
| --------- | ------ | --------------------- |
| `avatars` | ✅     | Avatar người dùng     |
| `spaces`  | ✅     | Ảnh bìa + icon Space  |
| `posts`   | ✅     | Ảnh đính kèm bài viết |

### 6. Cấu hình OAuth *(tùy chọn)*

**Supabase → Authentication → Providers:**

- **Google**: bật → điền Client ID + Secret từ [Google Cloud Console](https://console.cloud.google.com)
- **GitHub**: bật → điền Client ID + Secret từ [GitHub Developer Settings](https://github.com/settings/developers)

Thêm Redirect URL vào provider: `http://localhost:3000/auth/callback`

### 7. Kích hoạt Supabase Realtime

**Supabase → Database → Replication** → bật Realtime cho các bảng:
- `messages`
- `notifications`

### 8. Chạy dev server

```bash
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000)

---

## Deploy lên Vercel

### Bước 1 — Push lên GitHub

```bash
git push origin main
```

### Bước 2 — Import vào Vercel

1. Vào [vercel.com/new](https://vercel.com/new) → Import repo từ GitHub
2. **Environment Variables** — thêm đủ 4 biến:

| Tên biến                     | Giá trị                           |
| ---------------------------- | --------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`   | `https://xxxx.supabase.co`        |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGc...`                   |
| `SUPABASE_SERVICE_ROLE_KEY`  | `eyJhbGc...` *(secret)*          |
| `NEXT_PUBLIC_SITE_URL`       | `https://your-app.vercel.app`     |

3. Click **Deploy**

### Bước 3 — Cập nhật Supabase Auth URLs

**Supabase → Authentication → URL Configuration:**
- **Site URL**: `https://your-app.vercel.app`
- **Redirect URLs**: thêm `https://your-app.vercel.app/auth/callback`

---

## Cấu trúc thư mục

```
src/
├── app/
│   ├── (auth)/                    # Login, register, forgot/reset password
│   ├── (main)/                    # Layout: sidebar + header
│   │   ├── page.tsx               # Home feed
│   │   ├── error.tsx              # Error boundary cho main group
│   │   ├── profile/[username]/    # Trang hồ sơ
│   │   ├── settings/profile/      # Chỉnh sửa profile
│   │   ├── search/                # Tìm kiếm toàn cục
│   │   ├── messages/              # Direct messages
│   │   └── spaces/
│   │       ├── page.tsx           # Danh sách spaces
│   │       ├── new/               # Tạo space
│   │       └── [slug]/
│   │           ├── page.tsx       # Feed bài viết
│   │           ├── settings/      # Cài đặt space
│   │           ├── members/       # Danh sách thành viên
│   │           └── posts/[id]/    # Chi tiết + edit bài viết
│   ├── admin/                     # Admin panel (admin only)
│   ├── api/upload/                # API route upload ảnh
│   ├── auth/callback/             # OAuth callback
│   ├── not-found.tsx              # Trang 404
│   └── error.tsx                  # Global error boundary (500)
├── components/
│   ├── admin/                     # Admin UI components
│   ├── auth/                      # OAuthButtons
│   ├── comments/                  # CommentList, CommentItem, CommentForm
│   ├── layout/                    # Sidebar, Header, ThemeToggle, NotificationBell
│   ├── messages/                  # ConversationList, MessageThread, DmBadge
│   ├── posts/                     # PostForm, RichTextEditor, PostActions, LoadMorePosts
│   ├── profile/                   # AvatarUpload, EditProfileForm, RoleBadge
│   ├── search/                    # SearchTabs, result cards
│   ├── shared/                    # EmptyState, PostCardSkeleton
│   ├── spaces/                    # SpaceCard, CreateSpaceForm, JoinLeaveButton
│   └── ui/                        # shadcn/ui base components
├── lib/
│   ├── actions/                   # Server Actions
│   ├── supabase/                  # client.ts, server.ts, admin.ts
│   ├── rate-limit.ts              # In-memory rate limiter
│   └── utils.ts
└── types/
    └── database.ts                # TypeScript types tất cả bảng
supabase/
└── migrations/                    # SQL migrations (chạy theo thứ tự)
```

## Database Schema

```
profiles              — Người dùng (username, role, avatar, bio, is_banned)
spaces                — Không gian chủ đề (name, slug, is_private, cover_image)
space_members         — Quan hệ user ↔ space
posts                 — Bài viết (title, rich-text content, is_pinned)
comments              — Bình luận + reply (parent_id cho nested 1 cấp)
reactions             — Like post/comment (target_type: 'post' | 'comment')
notifications         — Thông báo (reply, mention, like)
conversations         — Cuộc hội thoại DM (unique_key để dedup)
conversation_participants — Thành viên trong conversation
messages              — Tin nhắn (is_read)
community_settings    — Cài đặt cộng đồng (key-value)
```

Tất cả bảng đều có **Row Level Security (RLS)**. Xem `supabase/migrations/002_rls_policies.sql` và `007_rls_hardening.sql`.

---

## Bảo mật

- **RLS** bật trên tất cả bảng — client không thể truy xuất dữ liệu ngoài phạm vi được phép
- **Upload API**: magic bytes validation (không tin Content-Type từ client), allowlist bucket, rate limit 20 req/phút/user
- **Admin routes**: bảo vệ bằng middleware kiểm tra `role = 'admin'`
- **Service Role Key**: chỉ dùng server-side (Server Actions, Admin client) — không expose ra client
- **`is_banned`**: middleware redirect user bị ban đến trang `/banned` trước khi render bất kỳ route nào

## Biến môi trường

| Biến                            | Bắt buộc | Mô tả                                   |
| ------------------------------- | -------- | --------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | ✅       | URL project Supabase                    |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅       | Anon key (public)                       |
| `SUPABASE_SERVICE_ROLE_KEY`     | ✅       | Service role key (server-only)          |
| `NEXT_PUBLIC_SITE_URL`          | ✅       | Domain deploy (cho metadata & redirect) |
