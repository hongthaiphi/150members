# Community Platform

Nền tảng cộng đồng dạng Circle.so — nơi thành viên tạo Spaces, đăng bài, bình luận và nhắn tin riêng.

## Tech Stack

| Layer | Công nghệ |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v3 + shadcn/ui v4 |
| Backend | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| Editor | TipTap (rich text) |
| Form | React Hook Form + Zod |
| Deploy | Vercel |

## Tính năng

- **Auth** — Đăng ký/đăng nhập email, OAuth Google & GitHub, reset mật khẩu
- **Profile** — Avatar, bio, social links, badge role (Admin / Moderator / Member)
- **Spaces** — Tạo/chỉnh sửa/xóa không gian chủ đề, public hoặc private
- **Posts** — Rich text editor, upload ảnh, pin/unpin, like, load more (cursor-based)
- **Comments** — Nested reply 1 cấp, like, mention @username, inline edit
- **Notifications** — Bell dropdown, mark đã đọc, click → điều hướng
- **Direct Messages** — Chat 1-1, realtime qua Supabase Realtime

## Cấu trúc thư mục

```
src/
├── app/
│   ├── (auth)/             # Login, register, forgot/reset password
│   ├── (main)/             # Layout chính (sidebar + header)
│   │   ├── page.tsx        # Home feed
│   │   ├── profile/[username]/
│   │   ├── settings/profile/
│   │   ├── spaces/
│   │   │   ├── page.tsx    # Danh sách spaces
│   │   │   ├── new/        # Tạo space mới
│   │   │   └── [slug]/
│   │   │       ├── page.tsx          # Feed bài viết
│   │   │       ├── settings/         # Chỉnh sửa space
│   │   │       ├── members/          # Danh sách thành viên
│   │   │       └── posts/
│   │   │           ├── new/          # Tạo bài viết
│   │   │           └── [id]/
│   │   │               ├── page.tsx  # Chi tiết bài viết + comments
│   │   │               └── edit/     # Chỉnh sửa bài viết
│   │   └── messages/       # Direct messages
│   ├── api/upload/         # Upload file lên Supabase Storage
│   └── auth/callback/      # OAuth callback handler
├── components/
│   ├── auth/               # OAuthButtons
│   ├── comments/           # CommentList, CommentItem
│   ├── layout/             # Sidebar, Header, NotificationDropdown
│   ├── posts/              # PostForm, RichTextEditor, PostActions, LoadMorePosts
│   ├── profile/            # AvatarUpload, EditProfileForm, RoleBadge, SocialLinks
│   ├── shared/             # EmptyState, PostCardSkeleton
│   ├── spaces/             # SpaceCard, CreateSpaceForm, JoinLeaveButton
│   └── ui/                 # shadcn/ui components
├── lib/
│   ├── actions/            # Server Actions (posts, comments, spaces, profile)
│   └── supabase/           # Client + Server Supabase clients
└── types/
    └── database.ts         # TypeScript types cho tất cả bảng Supabase
supabase/
└── migrations/
    ├── 001_initial_schema.sql   # Tất cả bảng + indexes + triggers
    ├── 002_rls_policies.sql     # Row Level Security cho mọi bảng
    └── 003_auth_trigger.sql     # Auto-tạo profiles khi user đăng ký
```

## Cài đặt & Chạy local

### 1. Clone và cài dependencies

```bash
git clone <repo-url>
cd community-platform
npm install
```

### 2. Tạo project Supabase

1. Vào [supabase.com](https://supabase.com) → New project
2. Vào **Settings → API** → copy `Project URL` và `anon key`

### 3. Cấu hình biến môi trường

Tạo file `.env.local` ở root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

### 4. Chạy migrations

Vào **Supabase Dashboard → SQL Editor**, chạy lần lượt:

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_rls_policies.sql
supabase/migrations/003_auth_trigger.sql
```

### 5. Tạo Storage buckets

Vào **Supabase Dashboard → Storage → New bucket**, tạo 2 buckets:

| Bucket | Public |
|---|---|
| `avatars` | ✅ |
| `spaces` | ✅ |

### 6. Cấu hình OAuth (tuỳ chọn)

Vào **Supabase Dashboard → Authentication → Providers**:
- **Google**: bật, điền Client ID + Secret từ Google Cloud Console
- **GitHub**: bật, điền Client ID + Secret từ GitHub Developer Settings

Redirect URL cần thêm vào provider: `https://<your-domain>/auth/callback`

### 7. Chạy dev server

```bash
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000)

## Deploy lên Vercel

1. Push code lên GitHub
2. Vào [vercel.com](https://vercel.com) → Import repository
3. Thêm Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy

Sau khi có domain Vercel, thêm URL vào **Supabase → Authentication → URL Configuration → Site URL** và **Redirect URLs**.

## Database Schema

```
profiles          — Thông tin người dùng (username, role, avatar, bio)
spaces            — Không gian cộng đồng (name, slug, is_private)
space_members     — Quan hệ user ↔ space
posts             — Bài viết trong space (title, content rich text, is_pinned)
comments          — Bình luận + reply (parent_id cho nested)
reactions         — Like cho post/comment (target_type: 'post' | 'comment')
notifications     — Thông báo (reply, mention, like)
conversations     — Cuộc hội thoại DM
messages          — Tin nhắn trong conversation
```

Tất cả bảng đều có Row Level Security (RLS). Xem chi tiết tại `supabase/migrations/002_rls_policies.sql`.

## Roadmap

- [ ] Realtime notification badge
- [ ] Search toàn cục (full-text search)
- [ ] Email notifications (Resend)
- [ ] Admin dashboard
- [ ] Dark mode
- [ ] SEO & Open Graph
