# Community Platform — Task List

> Thứ tự thực hiện theo phase. Mỗi task = 1 PR / 1 commit scope rõ ràng.

---

## 🔴 Phase 1 — Setup & Foundation

### Project Setup
- [x] `SETUP-01` Khởi tạo Next.js 14 với App Router + TypeScript
- [x] `SETUP-02` Cài đặt Tailwind CSS + shadcn/ui
- [ ] `SETUP-03` Tạo project Supabase, lấy API keys
- [x] `SETUP-04` Cấu hình biến môi trường `.env.local`
- [x] `SETUP-05` Setup Supabase client (browser + server)
- [ ] `SETUP-06` Deploy lên Vercel, kết nối repo GitHub
- [ ] `SETUP-07` Cấu hình Supabase environment variables trên Vercel

### Database Schema
- [x] `DB-01` Tạo bảng `profiles` (id, username, avatar_url, bio, role, social_links)
- [x] `DB-02` Tạo bảng `spaces` (id, name, slug, description, cover_image, is_private)
- [x] `DB-03` Tạo bảng `space_members` (space_id, user_id, joined_at)
- [x] `DB-04` Tạo bảng `posts` (id, space_id, author_id, title, content, is_pinned)
- [x] `DB-05` Tạo bảng `comments` (id, post_id, author_id, content, parent_id)
- [x] `DB-06` Tạo bảng `reactions` (id, user_id, target_id, target_type, emoji)
- [x] `DB-07` Tạo bảng `notifications` (id, user_id, type, data, is_read)
- [x] `DB-08` Tạo bảng `conversations` + `messages` cho DM
- [x] `DB-09` Thiết lập Row Level Security (RLS) cho tất cả bảng
- [x] `DB-10` Tạo indexes cho các cột query thường xuyên

---

## 🔴 Phase 2 — Authentication

- [x] `AUTH-01` Cài đặt Supabase Auth + middleware bảo vệ route
- [x] `AUTH-02` Trang đăng ký (`/register`) — email + password
- [x] `AUTH-03` Trang đăng nhập (`/login`)
- [x] `AUTH-04` Chức năng đăng xuất
- [x] `AUTH-05` OAuth Google (Supabase provider)
- [x] `AUTH-06` OAuth GitHub (Supabase provider)
- [x] `AUTH-07` Trang quên mật khẩu + gửi email reset
- [x] `AUTH-08` Trang nhập mật khẩu mới (từ link email)
- [x] `AUTH-09` Xác thực email sau đăng ký (confirm email flow)
- [x] `AUTH-10` Auto-tạo bản ghi `profiles` khi user đăng ký (trigger)

---

## 🔴 Phase 3 — Layout & Navigation

- [x] `UI-01` Layout chính: sidebar trái + content area
- [x] `UI-02` Sidebar: danh sách Spaces đã tham gia
- [x] `UI-03` Header: avatar, notification bell, search bar
- [x] `UI-04` Responsive mobile: hamburger menu, drawer sidebar
- [x] `UI-05` Loading skeleton component dùng chung
- [x] `UI-06` Toast notification component
- [x] `UI-07` Empty state component dùng chung

---

## 🔴 Phase 4 — Profile

- [x] `PROFILE-01` Trang profile cá nhân (`/profile/[username]`)
- [x] `PROFILE-02` Hiển thị avatar, tên, bio, role, social links
- [x] `PROFILE-03` Trang chỉnh sửa profile (`/settings/profile`)
- [x] `PROFILE-04` Upload avatar lên Supabase Storage
- [x] `PROFILE-05` Hiển thị badge role (Admin / Moderator / Member)

---

## 🔴 Phase 5 — Spaces

- [x] `SPACE-01` Trang danh sách tất cả Spaces (`/spaces`)
- [x] `SPACE-02` Trang chi tiết Space (`/spaces/[slug]`)
- [x] `SPACE-03` Form tạo Space mới (tên, mô tả, public/private)
- [x] `SPACE-04` Upload ảnh bìa + icon Space lên Storage
- [x] `SPACE-05` Chỉnh sửa thông tin Space (admin/moderator)
- [x] `SPACE-06` Xóa Space (admin only)
- [x] `SPACE-07` Nút Tham gia / Rời Space
- [x] `SPACE-08` Danh sách thành viên trong Space

---

## 🔴 Phase 6 — Posts

- [x] `POST-01` Danh sách bài viết trong Space (feed)
- [x] `POST-02` Trang chi tiết bài viết (`/spaces/[slug]/posts/[id]`)
- [x] `POST-03` Form tạo bài viết — rich text editor (TipTap)
- [x] `POST-04` Upload ảnh đính kèm vào bài viết
- [x] `POST-05` Chỉnh sửa bài viết (tác giả + admin)
- [x] `POST-06` Xóa bài viết (tác giả + admin)
- [x] `POST-07` Pin / Unpin bài viết (admin/moderator)
- [x] `POST-08` Like / reaction bài viết
- [x] `POST-09` Copy link chia sẻ bài viết
- [x] `POST-10` Infinite scroll hoặc pagination feed

---

## 🔴 Phase 7 — Comments

- [x] `COMMENT-01` Hiển thị danh sách comment dưới bài viết
- [x] `COMMENT-02` Form thêm comment mới
- [x] `COMMENT-03` Reply comment (nested 1 cấp)
- [x] `COMMENT-04` Like comment
- [x] `COMMENT-05` Chỉnh sửa comment của mình
- [x] `COMMENT-06` Xóa comment (tác giả + admin)
- [x] `COMMENT-07` Mention thành viên bằng @username — dropdown gợi ý

---

## 🔴 Phase 8 — Notifications (cơ bản)

- [x] `NOTIF-01` Tạo notification record khi có reply / mention / like
- [ ] `NOTIF-02` Realtime notification badge (số chưa đọc) qua Supabase Realtime
- [x] `NOTIF-03` Dropdown danh sách notification
- [x] `NOTIF-04` Đánh dấu đã đọc (từng item + mark all)
- [x] `NOTIF-05` Click notification → điều hướng đến bài viết/comment liên quan

---

## 🟡 Phase 9 — Direct Messages

- [ ] `DM-01` Trang DM (`/messages`)
- [ ] `DM-02` Danh sách cuộc hội thoại
- [ ] `DM-03` Trang chat 1-1 (`/messages/[conversationId]`)
- [ ] `DM-04` Gửi / nhận tin nhắn realtime (Supabase Realtime)
- [ ] `DM-05` Hiển thị trạng thái đã đọc
- [ ] `DM-06` Bắt đầu cuộc hội thoại mới từ profile người khác

---

## 🟡 Phase 10 — Search

- [ ] `SEARCH-01` Search bar toàn cục trong header
- [ ] `SEARCH-02` Tìm kiếm bài viết theo từ khóa (Supabase full-text search)
- [ ] `SEARCH-03` Tìm kiếm thành viên theo tên / username
- [ ] `SEARCH-04` Tìm kiếm Space
- [ ] `SEARCH-05` Lọc kết quả theo Space

---

## 🟡 Phase 11 — Email Notifications

- [ ] `EMAIL-01` Cấu hình Resend hoặc Supabase SMTP
- [ ] `EMAIL-02` Email thông báo reply / mention
- [ ] `EMAIL-03` Email digest bài viết mới (hàng ngày / hàng tuần)
- [ ] `EMAIL-04` Trang cài đặt bật/tắt từng loại email notification

---

## 🟢 Phase 12 — Admin

- [ ] `ADMIN-01` Route `/admin` — chỉ Admin truy cập (middleware)
- [ ] `ADMIN-02` Dashboard: thống kê members, posts, spaces
- [ ] `ADMIN-03` Mời thành viên qua email (gửi invite link)
- [ ] `ADMIN-04` Phân quyền: nâng / hạ role thành viên
- [ ] `ADMIN-05` Xóa bài viết / comment vi phạm
- [ ] `ADMIN-06` Khóa / ban thành viên
- [ ] `ADMIN-07` Cài đặt cộng đồng: tên, logo, màu chủ đạo

---

## 🟢 Phase 13 — Polish

- [ ] `POLISH-01` Dark mode / Light mode toggle
- [ ] `POLISH-02` SEO: metadata, Open Graph cho bài viết
- [ ] `POLISH-03` Error boundary + trang 404 / 500
- [ ] `POLISH-04` Rate limiting cho API routes
- [ ] `POLISH-05` Kiểm tra RLS — security audit
- [ ] `POLISH-06` Performance: image optimization, lazy loading
- [ ] `POLISH-07` Viết README hướng dẫn deploy

---

## Tổng quan

| Phase | Số task | Hoàn thành | Priority |
|---|---|---|---|
| Setup + DB | 17 | 14/17 | 🔴 MVP |
| Auth | 10 | 10/10 | 🔴 MVP |
| Layout + UI | 7 | 7/7 | 🔴 MVP |
| Profile | 5 | 5/5 | 🔴 MVP |
| Spaces | 8 | 8/8 | 🔴 MVP |
| Posts | 10 | 10/10 | 🔴 MVP |
| Comments | 7 | 7/7 | 🔴 MVP |
| Notifications | 5 | 4/5 | 🔴 MVP |
| DM | 6 | 0/6 | 🟡 V2 |
| Search | 5 | 0/5 | 🟡 V2 |
| Email | 4 | 0/4 | 🟡 V2 |
| Admin | 7 | 0/7 | 🟢 V3 |
| Polish | 7 | 0/7 | 🟢 V3 |
| **Tổng** | **98** | **65/98** | |
