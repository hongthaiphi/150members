# Báo cáo An ninh Bảo mật (Security Audit Report) - Update May 2026

Tài liệu này tổng hợp các lỗ hổng bảo mật đã được rà soát và cập nhật sau khi áp dụng các bản vá lỗi.

## 1. Tóm tắt các thay đổi đã thực hiện
- **Auth (Callback Route)**: Đã thêm kiểm tra validate cho tham số `next` để ngăn chặn Open Redirect.
- **OAuth Buttons**: Đã encode URL và validate scheme cho tham số `redirectTo`, loại bỏ các nút không khả dụng.
- **RLS Policies**: Đã cập nhật `supabase/migrations/002_rls_policies.sql` với các chính sách "Robust" (sử dụng `DROP POLICY` để tránh xung đột, mở quyền `SELECT` công khai cho post/space/comment để hỗ trợ tính năng chia sẻ).
- **Post Actions/Comments**: Các hành động viết bài, bình luận, like vẫn yêu cầu người dùng xác thực và là thành viên của Space (nếu là Space riêng tư) thông qua Server Actions.
- **IDOR trong Messages**: Việc gửi tin nhắn đã được kiểm tra chặt chẽ `conversation_participants`.

## 2. Các vấn đề còn tồn đọng (Cần ưu tiên)

| Mức độ | Vấn đề | Tác động | Khuyến nghị |
|:---|:---|:---|:---|
| 🟠 **High** | Thiếu kiểm tra recovery session tại `/reset-password` | Bất kỳ user nào đang đăng nhập có thể đổi mật khẩu của chính họ mà không cần token xác thực. | Kiểm tra `PASSWORD_RECOVERY` event từ Supabase trước khi render form. |
| 🟠 **High** | `/admin` routes không kiểm tra role | Bất kỳ user đã đăng nhập nào cũng có thể truy cập trang quản trị. | Kiểm tra role trong `profiles` table trong middleware. |
| 🟡 **Medium** | Không có rate limiting cho `forgot-password` | Có thể bị spam email. | Thêm rate limit dựa trên IP và email. |
| 🟡 **Medium** | Realtime data leak (WebSocket) | Tin nhắn của các conversation khác có thể được đẩy xuống client của user. | Sử dụng Supabase Realtime channel với bộ lọc `conversation_id`. |
| 🟡 **Medium** | `togglePin` tin tưởng giá trị `currentlyPinned` từ client | Trạng thái pin có thể bị sai lệch do race condition hoặc replay attack. | Fetch trạng thái `is_pinned` từ DB trực tiếp trong Server Action. |

## 3. Khuyến nghị triển khai
1. **Apply SQL Migration**: Đảm bảo file `002_rls_policies.sql` mới nhất đã được áp dụng vào Supabase Dashboard để kích hoạt RLS Robust.
2. **Xử lý các vấn đề còn lại**: Tập trung vào nhóm **High** trong bảng trên để bảo mật hoàn toàn luồng quản trị và reset mật khẩu.
3. **Monitor**: Tiếp tục theo dõi log trên Supabase (trong SQL Editor hoặc Logs panel) nếu có bất kỳ lỗi "403 RLS violation" nào phát sinh sau khi deploy bản cập nhật này.

---
*Tài liệu này phản ánh trạng thái codebase tại ngày 23/05/2026.*
