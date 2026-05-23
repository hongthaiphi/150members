# Tài liệu Vận hành & Phát triển — 150members Community Platform

> **Dành cho:** DevOps / Sys Admin không chuyên frontend  
> **Cập nhật:** 2026-05-23  
> **Trình độ giả định:** Quen với Linux, Docker, Git, biết sơ về web — chưa cần biết React/Next.js

---

## Mục lục

1. [Tổng quan hệ thống](#1-tổng-quan-hệ-thống)
2. [Kiến trúc và các dịch vụ liên quan](#2-kiến-trúc-và-các-dịch-vụ-liên-quan)
3. [Cấu trúc thư mục project](#3-cấu-trúc-thư-mục-project)
4. [Các biến môi trường (Environment Variables)](#4-các-biến-môi-trường-environment-variables)
5. [Cài đặt môi trường phát triển local](#5-cài-đặt-môi-trường-phát-triển-local)
6. [Quy trình deploy lên production](#6-quy-trình-deploy-lên-production)
7. [Quản lý database (Supabase)](#7-quản-lý-database-supabase)
8. [Quản lý file upload (Storage)](#8-quản-lý-file-upload-storage)
9. [Cách thêm tính năng mới — hướng dẫn từng bước](#9-cách-thêm-tính-năng-mới--hướng-dẫn-từng-bước)
10. [Quy trình làm việc với Git & Branch](#10-quy-trình-làm-việc-với-git--branch)
11. [Monitoring & Logs](#11-monitoring--logs)
12. [Xử lý sự cố thường gặp](#12-xử-lý-sự-cố-thường-gặp)
13. [Checklist bảo mật trước khi deploy](#13-checklist-bảo-mật-trước-khi-deploy)
14. [Danh sách tài khoản & dashboard cần quản lý](#14-danh-sách-tài-khoản--dashboard-cần-quản-lý)

---

## 1. Tổng quan hệ thống

**150members** là một nền tảng cộng đồng (forum + nhắn tin nội bộ) dành cho tối đa ~150 thành viên. Người dùng có thể:

- Tạo **Spaces** (nhóm chủ đề) — có thể public hoặc private
- Đăng **bài viết** và **bình luận** trong các Space
- **Like** bài viết / bình luận
- **Nhắn tin riêng** (DM) giữa các thành viên
- Admin có thể **mời**, **khóa tài khoản**, **phân quyền** thành viên

### Công nghệ sử dụng (giải thích đơn giản)

| Công nghệ | Vai trò | Tương đương khái niệm cũ |
|-----------|---------|--------------------------|
| **Next.js 14** | Framework web (frontend + backend gộp chung) | Apache + PHP nhưng viết bằng JavaScript |
| **Supabase** | Database + Auth + File storage (cloud) | PostgreSQL + Keycloak + MinIO gộp lại |
| **Vercel** | Hosting, CI/CD tự động | Nginx + Jenkins nhưng dùng cloud |
| **Upstash Redis** | Rate limiting (đếm số request) | Redis cloud, trả phí theo lượng dùng |
| **Resend** | Gửi email (invite, thông báo) | SendGrid / SMTP relay |

---

## 2. Kiến trúc và các dịch vụ liên quan

```
┌─────────────────────────────────────────────────────────────────┐
│                        INTERNET                                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     VERCEL (Hosting)                             │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Next.js Application                          │   │
│  │                                                           │   │
│  │  ┌─────────────────┐    ┌──────────────────────────┐    │   │
│  │  │  Frontend Pages  │    │   Server Actions (API)   │    │   │
│  │  │  (React/HTML)    │    │   (xử lý logic ở server) │    │   │
│  │  └────────┬────────┘    └─────────────┬────────────┘    │   │
│  └───────────┼─────────────────────────── ┼ ───────────────┘   │
└──────────────┼─────────────────────────── ┼ ───────────────────┘
               │                             │
     ┌─────────▼─────────┐       ┌──────────▼──────────┐
     │   SUPABASE (Cloud) │       │  UPSTASH REDIS      │
     │                    │       │  (Rate Limiting)     │
     │  ┌──────────────┐  │       └─────────────────────┘
     │  │ PostgreSQL DB │  │
     │  │ (dữ liệu app) │  │       ┌─────────────────────┐
     │  └──────────────┘  │       │  RESEND (Email)      │
     │  ┌──────────────┐  │       │  (gửi email invite)  │
     │  │ Auth (đăng   │  │       └─────────────────────┘
     │  │ nhập/ký)     │  │
     │  └──────────────┘  │
     │  ┌──────────────┐  │
     │  │ Storage      │  │
     │  │ (ảnh upload) │  │
     │  └──────────────┘  │
     └────────────────────┘
```

### Luồng dữ liệu khi user đăng nhập và đăng bài

```
User bấm "Đăng bài"
        │
        ▼
Vercel nhận request
        │
        ▼
Next.js kiểm tra token đăng nhập (qua Supabase Auth)
        │
        ├── Chưa đăng nhập → redirect về trang /login
        │
        └── Đã đăng nhập → chạy Server Action "createPost"
                │
                ├── Validate nội dung (độ dài, HTML injection)
                ├── Kiểm tra quyền (có phải thành viên Space?)
                └── Lưu vào PostgreSQL (Supabase)
                        │
                        └── Trả về trang bài viết mới
```

---

## 3. Cấu trúc thư mục project

```
150members/
│
├── src/                          ← Toàn bộ code ứng dụng
│   │
│   ├── app/                      ← Các trang web (mỗi thư mục = 1 URL)
│   │   ├── (auth)/               ← Trang đăng nhập, đăng ký
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (main)/               ← Trang chính sau khi đăng nhập
│   │   │   ├── spaces/           ← /spaces, /spaces/[tên-space]
│   │   │   ├── messages/         ← /messages (nhắn tin)
│   │   │   ├── profile/          ← /profile/[username]
│   │   │   └── settings/         ← /settings/profile
│   │   ├── admin/                ← Trang quản trị (/admin/*)
│   │   └── api/                  ← API endpoints
│   │       └── upload/           ← POST /api/upload (upload ảnh)
│   │
│   ├── components/               ← Các khối giao diện tái sử dụng
│   │   ├── ui/                   ← Button, Input, Modal... (đừng sửa)
│   │   ├── layout/               ← Sidebar, header
│   │   ├── posts/                ← Khối hiển thị bài viết
│   │   └── ...
│   │
│   └── lib/                      ← Logic xử lý dữ liệu
│       ├── actions/              ← ← ĐÂY LÀ NƠI QUAN TRỌNG NHẤT
│       │   ├── spaces.ts         ← Tạo/sửa/xóa Space
│       │   ├── posts.ts          ← Tạo/sửa/xóa bài viết
│       │   ├── comments.ts       ← Bình luận
│       │   ├── messages.ts       ← Nhắn tin DM
│       │   ├── profile.ts        ← Cập nhật hồ sơ
│       │   ├── admin.ts          ← Chức năng admin
│       │   └── search.ts         ← Tìm kiếm
│       └── supabase/
│           ├── server.ts         ← Kết nối DB phía server
│           ├── client.ts         ← Kết nối DB phía browser
│           └── admin.ts          ← Kết nối DB quyền root (service role)
│
├── supabase/
│   └── migrations/               ← Lịch sử thay đổi cấu trúc DB
│       ├── 001_initial_schema.sql
│       ├── 002_rls_policies.sql
│       └── ...
│
├── .env.local                    ← ⚠️ File bí mật — KHÔNG commit lên Git
├── package.json                  ← Danh sách thư viện và scripts
└── next.config.mjs               ← Cấu hình Next.js
```

### Quy tắc vàng khi đọc code

- **Muốn hiểu trang web nào làm gì** → xem `src/app/[đường-dẫn]/page.tsx`
- **Muốn hiểu logic nghiệp vụ** → xem `src/lib/actions/*.ts`
- **Muốn hiểu cấu trúc DB** → xem `supabase/migrations/001_initial_schema.sql`
- **Muốn hiểu ai được phép làm gì trên DB** → xem `supabase/migrations/002_rls_policies.sql` và `007_rls_hardening.sql`

---

## 4. Các biến môi trường (Environment Variables)

Tất cả được lưu trong file `.env.local` (local dev) và Vercel Dashboard (production).

### 4.1 Supabase — Bắt buộc

```bash
# URL của Supabase project (lấy từ Supabase Dashboard > Settings > API)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxx.supabase.co

# Anon key — key công khai, browser được phép biết
# (lấy từ Supabase Dashboard > Settings > API > anon public)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhb...

# Service Role key — key bí mật, chỉ dùng phía server, KHÔNG để lộ ra browser
# (lấy từ Supabase Dashboard > Settings > API > service_role)
SUPABASE_SERVICE_ROLE_KEY=eyJhb...
```

> **Lưu ý bảo mật:** `NEXT_PUBLIC_*` là public (browser thấy được). `SUPABASE_SERVICE_ROLE_KEY` là secret — ai có key này có toàn quyền đọc/ghi DB, bỏ qua mọi phân quyền.

### 4.2 Upstash Redis — Bắt buộc (rate limiting upload ảnh)

```bash
# Lấy từ console.upstash.com > Database > REST API
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=Axxxxx...
```

> Nếu thiếu 2 biến này, rate limiting sẽ bị tắt (upload vẫn hoạt động nhưng không có giới hạn).

### 4.3 Email — Tùy chọn

```bash
# API key của Resend.com (dịch vụ gửi email)
RESEND_API_KEY=re_...

# Email người gửi (phải xác minh domain trên Resend)
EMAIL_FROM=Community <noreply@yourdomain.com>

# URL công khai của app (dùng trong link email)
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Secret để bảo vệ endpoint gửi email digest định kỳ
CRON_SECRET=một-chuỗi-random-dài-bất-kỳ
```

### 4.4 Cách thêm env var mới lên Vercel

```bash
# Cách 1: Qua CLI (nhanh nhất)
vercel env add TEN_BIEN_MOI

# Cách 2: Qua web dashboard
# Vào vercel.com > project 150members > Settings > Environment Variables
```

---

## 5. Cài đặt môi trường phát triển local

### 5.1 Yêu cầu

- **Node.js 18+** (kiểm tra: `node --version`)
- **npm** (đi kèm Node.js)
- **Git**
- Tài khoản **Supabase** (free tier đủ dùng)

### 5.2 Các bước cài đặt

**Bước 1: Clone repo**
```bash
git clone git@github.com:hongthaiphi/150members.git
cd 150members
```

**Bước 2: Cài thư viện**
```bash
npm install
```

**Bước 3: Tạo file `.env.local`**
```bash
# Tạo file từ template
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhb...
SUPABASE_SERVICE_ROLE_KEY=eyJhb...
NEXT_PUBLIC_APP_URL=http://localhost:3000
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=Axxxxx
EOF
```

Điền giá trị thực từ Supabase Dashboard và Upstash Console.

**Bước 4: Chạy migrations trên Supabase**

Vào Supabase Dashboard > SQL Editor, chạy từng file theo thứ tự:
```
001_initial_schema.sql
002_rls_policies.sql
003_auth_trigger.sql
004_storage_policies.sql
005_bug_fixes.sql
006_admin_features.sql
007_rls_hardening.sql
008_fix_message_update_rls.sql
009_fix_storage_policies.sql
010_fix_rls_private_content.sql
```

**Bước 5: Chạy dev server**
```bash
npm run dev
```

Mở trình duyệt: `http://localhost:3000`

### 5.3 Đặt tài khoản đầu tiên làm Admin

Sau khi đăng ký tài khoản đầu tiên trên localhost, vào Supabase Dashboard > Table Editor > `profiles` > tìm user đó > sửa cột `role` thành `admin`.

---

## 6. Quy trình deploy lên production

### 6.1 Cách hoạt động (tự động)

Vercel đã được kết nối với GitHub repo. Mỗi khi có code mới được push:

```
Developer push code lên GitHub
           │
           ▼
Vercel tự động phát hiện
           │
           ▼
Vercel chạy: npm run build
           │
     ┌─────┴──────┐
     │ Thành công  │ ← Deploy lên production tự động
     └─────────────┘
           │
     ┌─────┴──────┐
     │ Thất bại   │ ← Giữ nguyên version cũ, gửi thông báo lỗi
     └─────────────┘
```

### 6.2 Quy trình làm việc chuẩn

```bash
# 1. Tạo branch mới cho tính năng/fix
git checkout -b feature/ten-tinh-nang

# 2. Sửa code
# ...

# 3. Kiểm tra TypeScript không có lỗi
npx tsc --noEmit

# 4. Kiểm tra ESLint không có lỗi
npm run lint

# 5. Commit
git add [các file thay đổi]
git commit -m "feat: mô tả ngắn gọn tính năng"

# 6. Push lên GitHub
git push -u origin feature/ten-tinh-nang

# 7. Tạo Pull Request trên GitHub
# Vercel tự động tạo preview URL cho PR
# Kiểm tra preview URL trước khi merge

# 8. Merge vào main → Vercel tự deploy production
```

### 6.3 Kiểm tra trạng thái deploy

```bash
# Xem danh sách deployments gần đây
vercel list

# Xem logs của deployment
vercel logs [deployment-url]
```

Hoặc vào **vercel.com > project 150members > Deployments** để xem giao diện.

### 6.4 Rollback (quay về version cũ)

```bash
# Qua CLI
vercel rollback

# Hoặc qua Dashboard:
# Vercel > Deployments > tìm version cũ > "..." > Promote to Production
```

---

## 7. Quản lý database (Supabase)

### 7.1 Cấu trúc các bảng chính

```
profiles          ← Thông tin người dùng
    │
    ├── spaces    ← Các Space (nhóm) do user tạo
    │       │
    │       └── posts  ← Bài viết trong Space
    │               │
    │               └── comments  ← Bình luận
    │               └── reactions ← Like
    │
    ├── conversations  ← Cuộc hội thoại DM
    │       │
    │       ├── conversation_participants  ← Ai tham gia
    │       └── messages  ← Nội dung tin nhắn
    │
    └── notifications  ← Thông báo
```

### 7.2 Thêm cột mới vào bảng (migration)

Khi cần thêm tính năng mới liên quan đến DB, KHÔNG sửa file migration cũ. Tạo file mới:

```bash
# Đặt tên theo quy ước: số thứ tự + mô tả
# Ví dụ: thêm cột "tags" vào bảng posts
```

Tạo file `supabase/migrations/011_add_post_tags.sql`:

```sql
-- 011: Thêm tính năng tags cho bài viết

-- Thêm cột mới
ALTER TABLE posts ADD COLUMN tags TEXT[] DEFAULT '{}';

-- Thêm index để tìm kiếm nhanh theo tag
CREATE INDEX idx_posts_tags ON posts USING GIN(tags);
```

Sau đó chạy file này trên Supabase Dashboard > SQL Editor.

> **Quy tắc vàng:** Chỉ thêm, không xóa/sửa cột đang có dữ liệu — dễ mất dữ liệu production.

### 7.3 Row Level Security (RLS) — Hiểu đơn giản

RLS là hệ thống phân quyền ở tầng database. Hãy nghĩ nó như **firewall rules cho từng bảng**.

```
Ví dụ: Bảng "posts"
- SELECT: ai cũng đọc được posts của public space
          chỉ member đọc được posts của private space
          admin đọc được tất cả
- INSERT: chỉ member của space mới đăng được
- UPDATE: chỉ tác giả hoặc admin/moderator mới sửa được
- DELETE: chỉ tác giả hoặc admin/moderator mới xóa được
```

Khi thêm bảng mới, **bắt buộc phải viết RLS policy** cho nó, nếu không toàn bộ data sẽ public.

### 7.4 Backup database

Supabase tự động backup hàng ngày (trên paid plan). Để export thủ công:

```bash
# Cài Supabase CLI
npm install -g supabase

# Login
supabase login

# Export dữ liệu (cần project ref từ Dashboard > Settings > General)
supabase db dump --project-ref [PROJECT_REF] > backup_$(date +%Y%m%d).sql
```

### 7.5 Xem logs database

Supabase Dashboard > Logs > Postgres — xem các query đang chạy, phát hiện query chậm.

---

## 8. Quản lý file upload (Storage)

### 8.1 Cấu trúc bucket

```
Supabase Storage
├── avatars/          ← Ảnh đại diện người dùng
│   └── {user_id}/    ← Mỗi user một thư mục riêng
│       └── {timestamp}.jpg
│
├── spaces/           ← Ảnh bìa và icon của Space
│   └── {user_id}/
│       └── {timestamp}.jpg
│
└── posts/            ← Ảnh trong bài viết (bucket tạo tự động)
    └── {user_id}/
        └── {timestamp}.jpg
```

Tất cả bucket đều **public** (ai cũng xem được URL ảnh) nhưng chỉ **owner mới upload/xóa được** nhờ RLS.

### 8.2 Giới hạn upload

| Thông số | Giá trị |
|----------|---------|
| Kích thước tối đa | 5 MB |
| Định dạng cho phép | JPEG, PNG, WebP, GIF |
| Rate limit | 20 ảnh/phút/user |

Thay đổi giới hạn trong file `src/app/api/upload/route.ts`:
```typescript
const MAX_SIZE = 5 * 1024 * 1024  // ← Sửa số này (bytes)
```

### 8.3 Dọn file rác

Hiện chưa có cơ chế tự xóa file cũ khi user upload ảnh mới (file cũ vẫn còn trong bucket). Xóa thủ công qua Supabase Dashboard > Storage.

---

## 9. Cách thêm tính năng mới — hướng dẫn từng bước

### Ví dụ thực tế: Thêm tính năng "Đánh dấu bài viết yêu thích"

Đây là ví dụ đầy đủ từ A-Z để bạn nắm được quy trình.

---

#### Bước 1: Thiết kế — hỏi trước khi code

Trước khi viết bất kỳ dòng code nào, trả lời các câu hỏi:

- **Dữ liệu lưu ở đâu?** → Cần bảng `bookmarks` mới trong DB
- **Ai được làm gì?** → User đã đăng nhập có thể bookmark/unbookmark bài viết của mình
- **Giao diện thay đổi gì?** → Thêm nút bookmark trên mỗi bài viết

---

#### Bước 2: Tạo migration — thêm bảng vào DB

Tạo file `supabase/migrations/012_bookmarks.sql`:

```sql
-- 012: Tính năng đánh dấu bài viết yêu thích

CREATE TABLE bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id)   -- Mỗi user chỉ bookmark mỗi bài 1 lần
);

-- Index để tìm bookmarks của 1 user nhanh
CREATE INDEX idx_bookmarks_user_id ON bookmarks(user_id);

-- Bật RLS
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- Chỉ user đó mới thấy bookmarks của mình
CREATE POLICY "Users can view their own bookmarks" ON bookmarks
  FOR SELECT USING (auth.uid() = user_id);

-- Chỉ user đó mới tạo bookmark cho mình
CREATE POLICY "Users can create their own bookmarks" ON bookmarks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Chỉ user đó mới xóa bookmark của mình
CREATE POLICY "Users can delete their own bookmarks" ON bookmarks
  FOR DELETE USING (auth.uid() = user_id);
```

Chạy file này trên **Supabase Dashboard > SQL Editor**.

---

#### Bước 3: Viết Server Action — logic xử lý

Thêm vào file `src/lib/actions/posts.ts`:

```typescript
// Thêm vào cuối file

export async function toggleBookmark(postId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  // Kiểm tra đã bookmark chưa
  const { data: existing } = await supabase
    .from('bookmarks')
    .select('id')
    .eq('user_id', user.id)
    .eq('post_id', postId)
    .single()

  if (existing) {
    // Đã bookmark → xóa đi
    await supabase.from('bookmarks').delete().eq('id', existing.id)
    return { success: true, bookmarked: false }
  } else {
    // Chưa bookmark → thêm vào
    await supabase.from('bookmarks').insert({ user_id: user.id, post_id: postId })
    return { success: true, bookmarked: true }
  }
}
```

---

#### Bước 4: Cập nhật TypeScript types

Sau khi thêm bảng mới, cập nhật file `src/types/database.ts` để TypeScript nhận biết bảng `bookmarks`. Thêm vào phần `Tables`:

```typescript
bookmarks: {
  Row: {
    id: string
    user_id: string
    post_id: string
    created_at: string
  }
  Insert: {
    id?: string
    user_id: string
    post_id: string
    created_at?: string
  }
  Update: {
    id?: string
    user_id?: string
    post_id?: string
    created_at?: string
  }
}
```

---

#### Bước 5: Tạo component giao diện

Tạo file `src/components/posts/bookmark-button.tsx`:

```typescript
'use client'  // ← Bắt buộc cho component có tương tác (click)

import { useState } from 'react'
import { Bookmark } from 'lucide-react'
import { toggleBookmark } from '@/lib/actions/posts'

interface Props {
  postId: string
  initialBookmarked: boolean
}

export function BookmarkButton({ postId, initialBookmarked }: Props) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked)

  async function handleClick() {
    const result = await toggleBookmark(postId)
    if (result.success) {
      setBookmarked(result.bookmarked)
    }
  }

  return (
    <button onClick={handleClick} title={bookmarked ? 'Bỏ bookmark' : 'Bookmark'}>
      <Bookmark
        className={bookmarked ? 'fill-current text-yellow-500' : 'text-gray-400'}
      />
    </button>
  )
}
```

---

#### Bước 6: Gắn component vào trang

Trong trang bài viết `src/app/(main)/spaces/[slug]/posts/[id]/page.tsx`, fetch trạng thái bookmark và thêm component:

```typescript
// Thêm vào phần fetch dữ liệu (cùng với fetch membership)
const { data: bookmarkData } = user
  ? await supabase.from('bookmarks')
      .select('id')
      .eq('post_id', params.id)
      .eq('user_id', user.id)
      .single()
  : { data: null }

const isBookmarked = !!bookmarkData

// Thêm vào phần JSX (giao diện)
{user && (
  <BookmarkButton postId={post.id} initialBookmarked={isBookmarked} />
)}
```

---

#### Bước 7: Kiểm tra trước khi commit

```bash
# Kiểm tra TypeScript
npx tsc --noEmit

# Kiểm tra ESLint
npm run lint

# Chạy local và test thủ công
npm run dev
```

---

#### Bước 8: Commit và deploy

```bash
git add supabase/migrations/012_bookmarks.sql \
        src/lib/actions/posts.ts \
        src/types/database.ts \
        src/components/posts/bookmark-button.tsx \
        src/app/\(main\)/spaces/\[slug\]/posts/\[id\]/page.tsx

git commit -m "feat: thêm tính năng bookmark bài viết"
git push
```

Vercel tự động build và deploy.

---

## 10. Quy trình làm việc với Git & Branch

### 10.1 Sơ đồ branch

```
main (production)
  │
  ├── feature/ten-tinh-nang    ← Tính năng mới
  ├── fix/mo-ta-bug            ← Sửa lỗi
  └── fix/security-*           ← Sửa bảo mật (ưu tiên cao)
```

### 10.2 Quy ước đặt tên commit

```
feat: thêm tính năng đánh dấu bài viết
fix: sửa lỗi không hiển thị ảnh avatar
fix(security): chặn truy cập bài viết private khi chưa đăng nhập
chore: cập nhật thư viện
docs: cập nhật tài liệu
```

### 10.3 Các lệnh Git thường dùng

```bash
# Xem trạng thái file
git status

# Xem lịch sử commit
git log --oneline -10

# Tạo branch mới từ main
git checkout main && git pull && git checkout -b feature/ten-branch

# Xem diff trước khi commit
git diff

# Hủy thay đổi chưa commit của 1 file (cẩn thận!)
git checkout -- src/lib/actions/posts.ts

# Quay về commit trước (tạo commit mới, không mất lịch sử)
git revert HEAD
```

---

## 11. Monitoring & Logs

### 11.1 Logs ứng dụng (Vercel)

```bash
# Xem runtime logs (lỗi, console.log từ server)
vercel logs --follow

# Hoặc qua web: vercel.com > project > Logs tab
```

Lọc theo:
- **Error** → chỉ xem lỗi
- **Function** → xem Server Action calls
- **Edge** → xem middleware

### 11.2 Logs database (Supabase)

- **Supabase Dashboard > Logs > Postgres** → xem query SQL
- **Supabase Dashboard > Logs > Auth** → xem đăng nhập thất bại
- **Supabase Dashboard > Logs > API** → xem tất cả API calls đến Supabase

### 11.3 Metrics Vercel Analytics

Đã tích hợp Vercel Analytics. Xem tại:
**vercel.com > project 150members > Analytics**

Gồm: lượt truy cập, trang phổ biến, thời gian load.

### 11.4 Các cảnh báo cần chú ý

| Dấu hiệu | Nguyên nhân có thể | Hành động |
|----------|-------------------|-----------|
| Build thất bại trên Vercel | Lỗi TypeScript hoặc ESLint | Chạy `npx tsc --noEmit` và `npm run lint` local |
| Trang trắng sau deploy | Lỗi runtime chưa được bắt | Xem Vercel Logs > Error |
| Upload ảnh bị 429 | Vượt rate limit (20/phút) | Bình thường, user thử lại sau 1 phút |
| Upload ảnh bị 500 | Upstash Redis down hoặc thiếu env var | Kiểm tra Upstash console và Vercel env vars |
| Đăng nhập không được | Supabase Auth lỗi | Kiểm tra Supabase Dashboard > Auth > Logs |

---

## 12. Xử lý sự cố thường gặp

### 12.1 Build thất bại — "Type error"

```bash
# Chạy local để xem lỗi chi tiết
npx tsc --noEmit

# Lỗi thường gặp: thêm cột DB mới nhưng chưa cập nhật types
# → Cập nhật src/types/database.ts
```

### 12.2 Trang báo lỗi "Internal Server Error"

```bash
# Xem log chi tiết
vercel logs --follow

# Tìm dòng có chữ "Error" hoặc "Exception"
```

Nguyên nhân phổ biến:
- Thiếu env var → kiểm tra `vercel env list`
- Query DB lỗi → kiểm tra Supabase Logs

### 12.3 User không đăng nhập được

1. Kiểm tra Supabase Dashboard > Authentication > Users — user có tồn tại không?
2. Kiểm tra Supabase Dashboard > Authentication > Email Templates — đã xác minh email chưa?
3. Kiểm tra Supabase > Auth > URL Configuration — `Site URL` phải đúng với domain production.

### 12.4 Ảnh không hiển thị sau upload

1. Kiểm tra file `next.config.mjs` — domain Supabase phải nằm trong danh sách `remotePatterns`
2. Kiểm tra bucket có ở chế độ public không (Supabase Dashboard > Storage > bucket > Settings)

### 12.5 User bị ban nhưng vẫn vào được

1. Kiểm tra cột `is_banned = true` trong bảng `profiles`
2. Kiểm tra middleware.ts — có đoạn redirect về `/banned` khi `is_banned = true`
3. Nếu user đang dùng token cũ: Supabase Dashboard > Authentication > Users > tìm user > "Send password reset" hoặc xóa session

### 12.6 Rollback khẩn cấp

```bash
# 1. Rollback code về version trước
vercel rollback

# 2. Nếu migration DB đã chạy và gây lỗi → cần viết migration "undo"
# Ví dụ: đã ADD COLUMN → viết DROP COLUMN trong migration mới
# Không dùng ALTER trực tiếp trên production nếu có thể tránh
```

---

## 13. Checklist bảo mật trước khi deploy

Chạy qua danh sách này mỗi lần merge PR có thay đổi về logic hoặc DB:

### Code

- [ ] Server Action mới có kiểm tra `auth.getUser()` trước khi xử lý không?
- [ ] Logic liên quan đến private space có kiểm tra membership không?
- [ ] Dữ liệu user nhập vào có được validate ở phía server không (không chỉ client)?
- [ ] Có dùng `createAdminClient()` đúng chỗ không — chỉ khi thực sự cần bypass RLS?

### Database

- [ ] Bảng mới có bật `ENABLE ROW LEVEL SECURITY` không?
- [ ] Mỗi operation (SELECT/INSERT/UPDATE/DELETE) có policy RLS riêng không?
- [ ] Policy có kiểm tra `auth.uid()` đúng không (không phải tautology)?

### Environment

- [ ] Env var mới đã được thêm vào Vercel production chưa?
- [ ] `SUPABASE_SERVICE_ROLE_KEY` không bị đưa vào code frontend (không có prefix `NEXT_PUBLIC_`)?

### Sau deploy

- [ ] Thử thủ công luồng chính (đăng nhập, đăng bài, comment)?
- [ ] Kiểm tra Vercel Logs xem có lỗi bất thường không?

---

## 14. Danh sách tài khoản & dashboard cần quản lý

| Dịch vụ | URL | Dùng để làm gì |
|---------|-----|----------------|
| **Vercel** | vercel.com | Deploy, logs, env vars, domain |
| **Supabase** | supabase.com | DB, Auth, Storage, RLS policies |
| **Upstash** | console.upstash.com | Redis cho rate limiting |
| **Resend** | resend.com | Gửi email, xem email logs |
| **GitHub** | github.com/hongthaiphi/150members | Source code, Pull Requests |

### Thứ tự kiểm tra khi có sự cố

```
1. Vercel Logs → xem lỗi runtime
2. Supabase Logs → xem lỗi DB hoặc Auth
3. Upstash Console → xem Redis còn hoạt động không
4. GitHub → xem commit nào gây ra vấn đề
```

---

## Phụ lục A: Giải thích thuật ngữ

| Thuật ngữ | Giải thích |
|-----------|-----------|
| **Server Action** | Hàm JavaScript chạy ở phía server, được gọi từ giao diện. Tương tự PHP function nhưng bảo mật hơn vì không expose endpoint |
| **RLS (Row Level Security)** | Hệ thống phân quyền ở tầng database — ai được đọc/ghi dòng nào trong bảng |
| **Migration** | File SQL ghi lại mỗi lần thay đổi cấu trúc DB. Đọc theo số thứ tự để hiểu lịch sử |
| **SECURITY DEFINER** | Function PostgreSQL chạy với quyền của người tạo (không phải người gọi) — cần cẩn thận khi dùng |
| **Anon key** | API key công khai cho phép đọc dữ liệu theo RLS (không bypass RLS) |
| **Service Role key** | API key bí mật, bypass hoàn toàn RLS — chỉ dùng phía server |
| **SSR (Server-Side Rendering)** | Trang web được render ở server rồi gửi HTML về browser — tốt cho SEO |
| **Edge** | Code chạy gần user nhất (CDN edge nodes) — dùng cho middleware |
| **Bucket** | Thư mục lưu trữ file trên Supabase Storage |

---

## Phụ lục B: Cấu trúc URL của app

```
/                           → Trang chủ (feed)
/login                      → Đăng nhập
/register                   → Đăng ký
/spaces                     → Danh sách Space
/spaces/new                 → Tạo Space mới
/spaces/{slug}              → Trang Space (ví dụ: /spaces/dev-team)
/spaces/{slug}/posts/new    → Tạo bài viết
/spaces/{slug}/posts/{id}   → Xem bài viết
/spaces/{slug}/settings     → Cài đặt Space
/messages                   → Danh sách tin nhắn
/messages/{id}              → Cuộc hội thoại
/profile/{username}         → Trang cá nhân
/settings/profile           → Cài đặt tài khoản
/search                     → Tìm kiếm
/admin                      → Dashboard admin
/admin/members              → Quản lý thành viên
/admin/content              → Quản lý nội dung
/admin/invite               → Mời thành viên
/admin/settings             → Cài đặt cộng đồng
```

---

*Tài liệu này được tạo ngày 2026-05-23. Cập nhật khi có thay đổi kiến trúc lớn.*
