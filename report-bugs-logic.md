# Báo cáo rà soát lỗi Logic & Bảo mật — Community Platform

Báo cáo này liệt kê các lỗi logic, lỗ hổng bảo mật và vấn đề hiệu năng được phát hiện trong codebase hiện tại (không bao gồm các lỗi đã báo cáo trong `report-bugs.md`).

---

## 🔴 Critical (Nghiêm trọng)

### 1. Race Condition khi tạo cuộc hội thoại (Direct Message)

**File:** `src/lib/actions/messages.ts:31-41`

**Mô tả:**
Hàm `getOrCreateConversation` kiểm tra sự tồn tại của cuộc hội thoại giữa 2 người, nếu chưa có thì tạo mới. Tuy nhiên, việc kiểm tra (`SELECT`) và tạo (`INSERT`) không phải là một transaction nguyên tử.
Nếu hai người dùng cùng lúc nhấn "Nhắn tin" cho nhau, hoặc một người dùng click nhanh nhiều lần, hệ thống có thể tạo ra 2 hoặc nhiều cuộc hội thoại độc lập giữa cùng một cặp user.

**Hệ quả:** Tin nhắn bị phân tán vào nhiều box chat khác nhau, gây trải nghiệm tồi tệ và sai lệch dữ liệu.

**Cách sửa:** 
- Thêm `UNIQUE` constraint trên cặp `(user_id_1, user_id_2)` (cần chuẩn hóa ID để user_id nhỏ hơn luôn đứng trước).
- Hoặc sử dụng một hàm PostgreSQL (Stored Procedure) với logic `INSERT ... ON CONFLICT DO UPDATE`.

### 2. Thiếu Sanitization nội dung Rich Text phía Server

**File:** `src/lib/actions/posts.ts` và `src/lib/actions/comments.ts`

**Mô tả:**
Hệ thống nhận `content` (HTML) trực tiếp từ client và lưu thẳng vào database mà không qua bất kỳ bước làm sạch (sanitize) nào ở phía server. Mặc dù Tiptap ở client tạo ra HTML "sạch", kẻ tấn công có thể bypass client-side editor để gửi request thủ công chứa `<script>`, `<iframe>` hoặc các event handler như `onerror`.

**Hệ quả:** Stored XSS. Mọi người xem bài viết hoặc bình luận đó đều bị thực thi mã độc.

**Cách sửa:** Sử dụng thư viện như `isomorphic-dompurify` để sanitize HTML trong server action trước khi `INSERT` hoặc `UPDATE` vào database.

---

## 🟠 High (Cao)

### 3. Hiệu năng sụp đổ khi tải bài viết có nhiều bình luận (Reaction loading)

**File:** `src/app/(main)/spaces/[slug]/posts/[id]/page.tsx:75-81`

**Mô tả:**
Để hiển thị số lượt Like, code hiện tại tải **tất cả** các bản ghi reaction của bài viết và của **tất cả** comment liên quan vào bộ nhớ JS, sau đó dùng hàm `.filter()` để đếm.
Nếu một bài viết có 100 comment và mỗi comment có 50 like, server sẽ phải fetch 5000+ dòng dữ liệu chỉ để hiển thị một vài con số.

**Hệ quả:** Response time cực chậm, tốn RAM server và băng thông database khi bài viết trở nên phổ biến.

**Cách sửa:** 
- Sử dụng SQL `COUNT` kết hợp với `GROUP BY target_id` để lấy số lượng trực tiếp từ DB.
- Lý tưởng nhất là lưu `like_count` trực tiếp vào bảng `posts` và `comments`.

### 4. Injection vào Meta Tags qua `generateMetadata`

**File:** `src/app/(main)/spaces/[slug]/posts/[id]/page.tsx:24`

**Mô tả:**
```ts
description: post.content.replace(/<[^>]+>/g, '').slice(0, 160)
```
Regex này rất thô sơ. Nếu nội dung bài viết là `"> <script>alert(1)</script>`, sau khi qua regex nó vẫn giữ lại `">` (vì không phải tag HTML). Khi render vào thuộc tính `content` của thẻ meta, nó có thể đóng thẻ sớm và inject code.

**Hệ quả:** Phá vỡ cấu trúc HTML của trang hoặc XSS (tùy thuộc vào cách Next.js handle escaping, nhưng logic này là không an toàn).

**Cách sửa:** Sử dụng hàm chuyên dụng để convert HTML sang plain text (ví dụ `html-to-text`) và đảm bảo output được escape các ký tự đặc biệt.

### 5. Inconsistency (Sai lệch dữ liệu) trong Invalidation Cache

**File:** `src/lib/actions/posts.ts` (Hàm `updatePost`, `deletePost`)

**Mô tả:**
Server action nhận `spaceSlug` từ client và dùng nó để gọi `revalidatePath`. Kẻ tấn công có thể truyền một `postId` của Space A nhưng truyền `spaceSlug` của Space B. Code không kiểm tra sự khớp nhau này trước khi thực hiện revalidate.

**Hệ quả:** Cache của Space B bị xóa vô tội vạ, trong khi Space A (nơi dữ liệu thực sự thay đổi) không được cập nhật.

**Cách sửa:** Luôn lấy `slug` trực tiếp từ database dựa trên `space_id` của bài viết đang được xử lý, thay vì tin tưởng vào tham số từ client.

---

## 🟡 Medium (Trung bình)

### 6. Thông báo bị "Snapshot" tên người dùng (Stale Data)

**File:** `src/lib/actions/comments.ts:70-79`

**Mô tả:**
Khi tạo thông báo, hệ thống lấy `display_name` hiện tại của người comment và lưu vào JSONB. Nếu sau đó người này đổi tên, các thông báo cũ vẫn hiển thị tên cũ.

**Hệ quả:** Thông tin không đồng nhất, gây nhầm lẫn cho người dùng.

**Cách sửa:** Chỉ lưu `actor_id` trong bảng notifications. Khi hiển thị, thực hiện `JOIN` với bảng `profiles` để lấy tên và avatar mới nhất.

### 7. Thiếu giới hạn độ dài nội dung (Payload Size)

**File:** `src/lib/actions/posts.ts`

**Mô tả:**
Server action không kiểm tra độ dài của `title` và `content` (ngoài validation ở client). Một attacker có thể gửi một bài viết nặng vài chục MB nội dung text.

**Hệ quả:** Database phình to, lỗi timeout khi render và tốn tài nguyên xử lý.

**Cách sửa:** Thêm `zod` validation ở server side cho mọi action, giới hạn `content` tối đa (ví dụ 50,000 ký tự).

---

## 🔵 Low (Thấp)

### 8. Lãng phí truy vấn `getProfile`

**File:** `src/lib/actions/posts.ts` và `comments.ts`

**Mô tả:**
Nhiều hàm thực hiện `getProfile` để kiểm tra quyền admin/moderator. Việc này tạo thêm một round-trip tới database cho mỗi action. 

**Cách sửa:** 
- Tích hợp role vào JWT metadata của Supabase Auth nếu có thể.
- Hoặc sử dụng cơ chế cache trong request (ví dụ `React cache()` nếu gọi trong cùng một render cycle, tuy nhiên đây là server action nên cần giải pháp khác như memoization).

### 9. Upload ảnh vào sai Bucket

**File:** `src/components/posts/rich-text-editor.tsx:75`

**Mô tả:**
```ts
fd.append('bucket', 'avatars')
```
Khi upload ảnh trong bài viết, code đang hardcode bucket là `avatars`. Đáng lẽ nên là một bucket riêng cho nội dung bài viết (`posts` hoặc `uploads`) để dễ quản lý và phân quyền.

---

## Tóm tắt số lượng lỗi

| Mức độ | Số lượng | Vấn đề chính |
|---|---|---|
| 🔴 Critical | 2 | Race condition DM, Server-side XSS |
| 🟠 High | 3 | Hiệu năng Like/Reaction, Meta injection, Cache inconsistency |
| 🟡 Medium | 2 | Stale notification data, Missing length limits |
| 🔵 Low | 2 | Redundant queries, Wrong storage bucket |
