# Community Platform — Requirements

> Mô hình: Circle.so | Stack: Next.js 14 + Supabase + Vercel

---

## 1. Authentication

- [ ] Đăng ký bằng email + password
- [ ] Đăng nhập / Đăng xuất
- [ ] OAuth: Google, GitHub
- [ ] Quên mật khẩu / Reset qua email
- [ ] Xác thực email sau đăng ký
- [ ] Session management (JWT)

---

## 2. Hồ sơ thành viên (Profile)

- [ ] Avatar, tên hiển thị, bio
- [ ] Link mạng xã hội (Twitter, LinkedIn, Website)
- [ ] Xem profile người khác
- [ ] Chỉnh sửa profile của mình
- [ ] Badge / role hiển thị (Admin, Moderator, Member)

---

## 3. Spaces (Nhóm chủ đề)

- [ ] Tạo / chỉnh sửa / xóa Space
- [ ] Ảnh bìa và icon cho Space
- [ ] Space công khai / riêng tư
- [ ] Tham gia / rời Space
- [ ] Danh sách Space ở sidebar
- [ ] Sắp xếp thứ tự Space

---

## 4. Posts & Nội dung

- [ ] Tạo bài viết dạng rich text (bold, italic, heading, list)
- [ ] Đính kèm ảnh / file
- [ ] Pin bài viết lên đầu Space
- [ ] Chỉnh sửa / xóa bài viết (tác giả + admin)
- [ ] Like / reaction bài viết
- [ ] Chia sẻ link bài viết

---

## 5. Comments

- [ ] Bình luận dưới bài viết
- [ ] Reply comment (nested 1 cấp)
- [ ] Like comment
- [ ] Chỉnh sửa / xóa comment của mình
- [ ] Mention thành viên (@username)

---

## 6. Thông báo (Notifications)

- [ ] Thông báo realtime (in-app)
- [ ] Thông báo khi có reply / mention
- [ ] Thông báo khi có bài mới trong Space đã follow
- [ ] Đánh dấu đã đọc / chưa đọc
- [ ] Email notification (tùy chọn bật/tắt)

---

## 7. Direct Messages (DM)

- [ ] Nhắn tin 1-1 giữa thành viên
- [ ] Realtime chat
- [ ] Hiển thị trạng thái đã đọc
- [ ] Danh sách cuộc hội thoại

---

## 8. Tìm kiếm

- [ ] Tìm bài viết theo từ khóa
- [ ] Tìm thành viên
- [ ] Tìm Space
- [ ] Lọc kết quả theo Space

---

## 9. Quản trị (Admin)

- [ ] Dashboard: số thành viên, bài viết, hoạt động
- [ ] Mời thành viên qua email
- [ ] Phân quyền: Admin / Moderator / Member
- [ ] Xóa bài viết / comment vi phạm
- [ ] Khóa / ban thành viên
- [ ] Cài đặt chung: tên cộng đồng, logo, màu sắc

---

## 10. UX / Giao diện

- [ ] Responsive mobile
- [ ] Dark mode / Light mode
- [ ] Loading skeleton
- [ ] Empty states (không có bài viết, thành viên,…)
- [ ] Toast notifications
- [ ] Infinite scroll hoặc pagination

---

## Phân loại ưu tiên

| Priority | Features |
|---|---|
| 🔴 MVP | Auth, Profile, Spaces, Posts, Comments, Notifications cơ bản |
| 🟡 V2 | DM, Search, Email notification |
| 🟢 V3 | Admin dashboard, Dark mode, Badge/role nâng cao |

---

## Tech Stack

| Layer | Tool |
|---|---|
| Frontend | Next.js 14 (App Router) |
| UI | shadcn/ui + Tailwind CSS |
| Backend / DB | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Realtime | Supabase Realtime |
| Storage | Supabase Storage |
| Deploy | Vercel |
