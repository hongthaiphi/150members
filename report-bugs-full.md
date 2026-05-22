# Báo cáo lỗi toàn diện — Tất cả tính năng

> Rà soát tự động bằng 3 góc độ độc lập (line-by-line, removed-behavior, cross-file).
> Các lỗi profile đã được báo cáo riêng trong `report-bugs.md`.

---

## 1. Auth (Đăng nhập / Đăng ký / Đặt lại mật khẩu)

---

### 🔴 Critical — Open redirect sau OAuth login

**File:** `src/app/auth/callback/route.ts:7`

**Mô tả:**
Tham số `next` từ URL query được dùng trực tiếp để xây dựng redirect URL mà không được validate:
```ts
const next = searchParams.get('next') ?? '/'
return NextResponse.redirect(`${origin}${next}`)
```
Attacker gửi link `/auth/callback?code=VALID&next=//evil.com` → sau OAuth thành công, user bị redirect ra ngoài site.

**Cách sửa:**
```ts
const raw = searchParams.get('next') ?? '/'
const next = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/'
```

---

### 🔴 Critical — `redirectTo` trong OAuth buttons không được encode/validate

**File:** `src/components/auth/oauth-buttons.tsx:17`

**Mô tả:**
Prop `redirectTo` được nối thẳng vào callback URL mà không qua `encodeURIComponent` và không validate scheme:
```ts
redirectTo: `${window.location.origin}/auth/callback?next=${redirectTo}`
```
Nếu `redirectTo = "//evil.com"`, URL kết quả sẽ redirect user ra ngoài sau OAuth.

**Cách sửa:**
```ts
const safePath = redirectTo.startsWith('/') && !redirectTo.startsWith('//') ? redirectTo : '/'
redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safePath)}`
```

---

### 🟠 High — Reset-password không kiểm tra recovery session — user thường có thể đổi password

**File:** `src/app/(auth)/reset-password/page.tsx:23`

**Mô tả:**
Trang `/reset-password` không kiểm tra sự tồn tại của `PASSWORD_RECOVERY` event từ Supabase. Bất kỳ user nào đang đăng nhập có thể truy cập trang này và gọi `updateUser` để đổi password mà không cần token reset.

**Cách sửa:**
```ts
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') setReady(true)
    else router.push('/forgot-password')
  })
  return () => subscription.unsubscribe()
}, [])
```
Chỉ render form khi `ready === true`.

---

### 🟠 High — `/reset-password` nằm trong `authRoutes` — chặn luồng reset password

**File:** `src/middleware.ts:44`

**Mô tả:**
`/reset-password` được liệt kê trong `authRoutes` (chỉ cho phép user chưa đăng nhập). Nhưng sau khi Supabase exchange code → session được tạo → user đã đăng nhập → middleware redirect về `/`. Kết quả: user không bao giờ đến được trang đổi mật khẩu.

**Cách sửa:**
Xóa `/reset-password` khỏi `authRoutes`. Route này cần cho phép user đã có session (recovery session) truy cập.

---

### 🟠 High — Redirect về `/login` sau reset trong khi session vẫn còn active

**File:** `src/app/(auth)/reset-password/page.tsx:36`

**Mô tả:**
Sau khi đổi password thành công, code gọi `router.push('/login')` mà không sign out. Middleware thấy session còn active và redirect lại `/` ngay lập tức — user không thấy trang login, không có thông báo xác nhận rõ ràng.

**Cách sửa:**
```ts
await supabase.auth.signOut()
router.push('/login')
```

---

### 🟠 High — `/admin` routes chỉ kiểm tra authentication, không kiểm tra role

**File:** `src/middleware.ts:4`

**Mô tả:**
`/admin` được bảo vệ bởi middleware nhưng chỉ kiểm tra user có đăng nhập không (`user != null`). Bất kỳ member nào cũng có thể truy cập tất cả trang admin.

**Cách sửa:**
Sau khi lấy user, query thêm role từ `profiles` table và redirect nếu không phải admin:
```ts
if (pathname.startsWith('/admin')) {
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.redirect(new URL('/', request.url))
}
```

---

### 🟠 High — Cookie mutation trong `setAll` là no-op — session token không được ghi vào browser

**File:** `src/middleware.ts:19`

**Mô tả:**
Trong callback `setAll`, `request.cookies.set(name, value)` chỉ mutate object request cục bộ, không ảnh hưởng đến response. Khi Supabase cần refresh token (session hết hạn), token mới không được ghi vào cookie của browser → session im lặng hết hạn dù `getUser()` trả về valid user.

**Cách sửa:**
Đảm bảo object `supabaseResponse` được tạo sau khi `setAll` được gọi, và là object duy nhất được return — theo đúng hướng dẫn của Supabase SSR docs.

---

### 🟠 High — `forgot-password` dùng sai `redirectTo` — bỏ qua code exchange callback

**File:** `src/app/(auth)/forgot-password/page.tsx:27`

**Mô tả:**
```ts
redirectTo: `${window.location.origin}/reset-password`
```
Supabase gửi link có `?code=...` đến `/reset-password` trực tiếp. Nhưng trang này không gọi `exchangeCodeForSession` → không có session → `updateUser` thất bại.

**Cách sửa:**
```ts
redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`
```

---

### 🟡 Medium — Không có rate limiting cho forgot-password — có thể spam email

**File:** `src/app/(auth)/forgot-password/page.tsx:27`

**Mô tả:**
Không có giới hạn số lần gửi email reset. Script có thể gửi hàng trăm request/phút đến `resetPasswordForEmail` cho cùng một email → spam inbox nạn nhân hoặc exhaust SMTP quota.

**Cách sửa:**
Wrap trong server action hoặc API route với rate limiting theo IP và email (ví dụ: 3 lần/15 phút).

---

### 🟡 Medium — Không có rate limiting cho login — có thể brute-force mật khẩu

**File:** `src/app/(auth)/login/page.tsx:26`

**Mô tả:**
Không có giới hạn số lần đăng nhập sai. Attacker có thể brute-force password không giới hạn nếu Supabase không tự giới hạn (và Supabase mặc định thường rất permissive).

**Cách sửa:**
Thêm server-side rate limiting (per IP + per email), hoặc cấu hình và verify Supabase auth rate limit đã bật.

---

### 🟡 Medium — `signUp` cho email đã tồn tại luôn hiển thị success — email enumeration

**File:** `src/app/(auth)/register/page.tsx:37`

**Mô tả:**
Khi email đã đăng ký, Supabase trả về `{ error: null, data: { user: null } }`. Code chỉ kiểm tra `if (error)` → luôn hiển thị màn hình "kiểm tra email". Attacker có thể dùng để enumerate email hợp lệ trong hệ thống.

**Cách sửa:**
```ts
if (!error && !data.user && !data.session) {
  // Email đã tồn tại — nhưng hiển thị cùng message để tránh leak
}
```
Đảm bảo message hiển thị cho cả hai trường hợp đều giống nhau.

---

### 🟡 Medium — Raw Supabase error message hiển thị trực tiếp ra UI

**File:** `src/app/(auth)/register/page.tsx:43`

**Mô tả:**
`error.message` từ Supabase (ví dụ: "User already registered") được render thẳng vào DOM, lộ thông tin nội bộ về backend cho attacker.

**Cách sửa:**
Map error code sang message thân thiện bằng tiếng Việt thay vì forward raw error.

---

### 🔵 Low — `router.push` trước `router.refresh` có thể gây flash nội dung sai

**File:** `src/app/(auth)/login/page.tsx:42`

**Mô tả:**
`router.push(redirectTo)` chạy trước `router.refresh()`. Server-component ở trang đích có thể render trước khi session cookie được propagate, gây flash trang "chưa đăng nhập".

**Cách sửa:**
Gọi `router.refresh()` trước, hoặc dùng `onAuthStateChange` listener để navigate sau khi session được confirm.

---

### 🔵 Low — Mật khẩu không có yêu cầu độ phức tạp

**File:** `src/app/(auth)/register/page.tsx:17`

**Mô tả:**
Schema chỉ yêu cầu tối thiểu 8 ký tự. `aaaaaaaa` là mật khẩu hợp lệ.

**Cách sửa:**
```ts
password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, 'Mật khẩu phải có chữ hoa, chữ thường và số')
```

---

## 2. Posts / Comments / Spaces

---

### 🔴 Critical — Client-side "load more" query bỏ qua kiểm soát truy cập private space

**File:** `src/components/posts/load-more-posts.tsx:39`

**Mô tả:**
Component gọi Supabase client-side trực tiếp để phân trang bài viết, chỉ filter theo `space_id`. Không kiểm tra membership. Bất kỳ user nào biết `spaceId` (dễ lấy từ page source) đều có thể paginate toàn bộ bài viết của private space mà không cần là member.

**Cách sửa:**
Chuyển logic "load more" sang server action hoặc API route, re-validate membership trước khi trả data.

---

### 🔴 Critical — Trang chi tiết bài viết của private space không chặn non-member

**File:** `src/app/(main)/spaces/[slug]/posts/[id]/page.tsx:63`

**Mô tả:**
Sau khi lấy space và post, trang không gọi `notFound()` hay redirect khi `space.is_private === true` và user không phải member. Toàn bộ nội dung bài viết, comments, reactions hiển thị cho bất kỳ ai biết URL.

**Cách sửa:**
```ts
if (space.is_private && !isMember && !canManage) {
  notFound()
}
```
Đặt ngay sau khi kiểm tra membership, trước khi render bất kỳ content nào.

---

### 🟠 High — Stored XSS — `setLink` trong rich text editor chấp nhận `javascript:` URL

**File:** `src/components/posts/rich-text-editor.tsx:90`

**Mô tả:**
```ts
const url = window.prompt('URL')
editor.chain().setLink({ href: url }).run()
```
Không có validation scheme. User nhập `javascript:alert(document.cookie)` → được lưu vào DB → mọi người click link trong bài viết đều bị thực thi script.

**Cách sửa:**
```ts
if (!url.match(/^https?:\/\/|^mailto:/)) return
```
Hoặc cấu hình Tiptap Link extension với `protocols: ['https', 'http', 'mailto'], validate: true`.

---

### 🟠 High — IDOR trong `updatePost` — không ràng buộc post với space

**File:** `src/lib/actions/posts.ts:53`

**Mô tả:**
`updatePost` nhận `postId` và `spaceSlug` là hai tham số độc lập. Kiểm tra ownership chỉ verify `author_id === user.id` nhưng câu UPDATE không filter theo `space_id`. Một moderator của space A có thể update bài viết ở space B bằng cách cung cấp `postId` của space B.

**Cách sửa:**
Fetch post kèm `space_id`, verify `post.space_id === space.id` (lookup qua `spaceSlug`) trước khi cho phép update.

---

### 🟠 High — IDOR trong `deletePost` — tương tự `updatePost`

**File:** `src/lib/actions/posts.ts:76`

**Mô tả:**
Câu `.delete().eq('id', postId)` không kèm `.eq('space_id', ...)`. Moderator bất kỳ space có thể xóa bài viết ở space khác nếu biết `postId`.

**Cách sửa:**
Thêm `.eq('space_id', resolvedSpace.id)` vào câu delete, hoặc verify `post.space_id` trước.

---

### 🟠 High — Không kiểm tra membership trước khi tạo comment

**File:** `src/lib/actions/comments.ts:21`

**Mô tả:**
`createComment` chỉ kiểm tra user đã đăng nhập. Không verify user là member của space chứa post. Bất kỳ user đăng nhập nào cũng có thể comment vào bài viết của private space nếu biết `postId`.

**Cách sửa:**
Sau khi lấy post (đã có để tạo notification), query `space_members` với `(space_id, user.id)` và trả lỗi nếu không phải member.

---

### 🟠 High — `joinSpace` không kiểm tra `is_private` — bất kỳ user nào có thể tự join private space

**File:** `src/lib/actions/spaces.ts:120`

**Mô tả:**
`joinSpace` chỉ kiểm tra user đã đăng nhập, không kiểm tra space có `is_private` hay không, không kiểm tra invite. Bất kỳ user nào có thể gọi trực tiếp server action để tự thêm mình vào bất kỳ private space nào nếu biết `spaceId`.

**Kịch bản khai thác:** Space "secret-club" có `is_private=true`. User B không được mời, gọi `joinSpace('space-uuid', 'secret-club')` từ browser console → row `space_members` được insert → User B thành member đầy đủ, đọc được toàn bộ bài viết và comments.

**Cách sửa:**
```ts
const { data: space } = await supabase.from('spaces').select('is_private').eq('id', spaceId).single()
if (space?.is_private) return { error: 'Không thể tự tham gia space riêng tư' }
```

---

### 🟠 High — Mass-assignment trong `updateSpace` — toàn bộ object data được spread vào DB

**File:** `src/lib/actions/spaces.ts:85`

**Mô tả:**
```ts
.update({ ...data, updated_at: ... })
```
`data` được spread trực tiếp không qua allowlist. Caller có thể inject các field như `slug`, `created_by`, `id` vào câu update.

**Cách sửa:**
```ts
.update({
  name: data.name,
  description: data.description,
  is_private: data.is_private,
  icon: data.icon,
  cover_image: data.cover_image,
  updated_at: new Date().toISOString(),
})
```

---

### 🟡 Medium — Private spaces hiển thị tên/mô tả cho tất cả user kể cả non-member

**File:** `src/app/(main)/spaces/page.tsx:24`

**Mô tả:**
Query lấy tất cả spaces không filter `is_private`. Tên, slug, mô tả, icon của private spaces hiển thị cho mọi user đăng nhập (và có thể cả chưa đăng nhập tùy RLS).

**Cách sửa:**
Filter để chỉ trả về: public spaces + private spaces mà user là member.

---

### 🟡 Medium — Danh sách member của private space không yêu cầu auth hoặc membership

**File:** `src/app/(main)/spaces/[slug]/members/page.tsx:27`

**Mô tả:**
Trang không kiểm tra user đã đăng nhập, cũng không kiểm tra membership. Bất kỳ ai (kể cả chưa đăng nhập) có thể truy cập `/spaces/<slug>/members` và xem toàn bộ danh sách member kèm username, avatar, role.

**Cách sửa:**
```ts
if (!user) redirect('/login')
if (space.is_private && !isMember) notFound()
```

---

### 🟡 Medium — `togglePin` tin tưởng giá trị `currentlyPinned` từ client

**File:** `src/lib/actions/posts.ts:110`

**Mô tả:**
```ts
.update({ is_pinned: !currentlyPinned })
```
Giá trị boolean đến từ client. Nếu attacker gửi `currentlyPinned=false` khi post đang pinned, post vẫn bị pin (toggle lại thành true). Race condition hoặc replay attack có thể làm trạng thái pin không đồng bộ với DB.

**Cách sửa:**
Đọc `is_pinned` từ DB trong server action rồi toggle giá trị đó thay vì tin `currentlyPinned` từ client.

---

### 🟡 Medium — Stale-closure bug trong optimistic like — double-click làm sai số đếm

**File:** `src/components/posts/post-actions.tsx:44`

**Mô tả:**
`handleLike` dùng `liked` từ closure để tính `setLikeCount`. Nếu user click nhanh trong khi request đang pending, closure vẫn giữ giá trị cũ → count bị sai.

**Cách sửa:**
Thêm `disabled={pending}` vào nút like để không cho double-click trong lúc request đang chạy.

---

### 🟡 Medium — Error từ `updateSpace` không được kiểm tra khi upload cover image

**File:** `src/components/spaces/edit-space-form.tsx:54`

**Mô tả:**
```ts
await updateSpace(space.id, { cover_image: json.url })
// result không được check
setCoverUrl(json.url) // luôn set dù có lỗi
toast.success('...')   // luôn hiện success
```
Nếu `updateSpace` trả về `{ error }`, UI vẫn hiển thị success và preview ảnh mới, trong khi DB không được cập nhật.

**Cách sửa:**
```ts
const result = await updateSpace(space.id, { cover_image: json.url })
if (result?.error) { toast.error(result.error); return }
setCoverUrl(json.url)
toast.success('...')
```

---

## 3. Messages / Notifications / Upload

---

### 🔴 Critical — `sendMessage` không kiểm tra caller có phải member của conversation không

**File:** `src/lib/actions/messages.ts:46`

**Mô tả:**
Action chỉ kiểm tra user đã đăng nhập, không verify user có trong `conversation_participants` của `conversationId`. Bất kỳ user đăng nhập nào có thể gửi tin nhắn vào bất kỳ conversation nào nếu biết UUID.

**Kịch bản:** Attacker tìm UUID conversation của victim → gọi `sendMessage(victimConvId, 'spam')` → tin nhắn được insert thành công.

**Cách sửa:**
```ts
const { data: member } = await supabase
  .from('conversation_participants')
  .select('id')
  .eq('conversation_id', conversationId)
  .eq('user_id', user.id)
  .single()
if (!member) return { error: 'Không có quyền' }
```

---

### 🟠 High — IDOR trong `markRead` notification — không filter theo `user_id`

**File:** `src/components/layout/notification-dropdown.tsx:74`

**Mô tả:**
```ts
.update({ is_read: true }).eq('id', id)
```
Không có `.eq('user_id', user.id)`. Attacker đoán hoặc enumerate UUID của notification của victim và đánh dấu đã đọc — ảnh hưởng đến unread count của victim.

**Cách sửa:**
```ts
.update({ is_read: true }).eq('id', id).eq('user_id', user.id)
```

---

### 🟠 High — Notification href xây từ data DB không được validate — XSS/open redirect

**File:** `src/components/layout/notification-dropdown.tsx:109`

**Mô tả:**
```ts
href={`/spaces/${data.space_slug}/posts/${data.post_id}`}
```
Nếu trigger DB insert notification với `space_slug = "javascript:alert(1)//"`, href trở thành link nguy hiểm cho tất cả user nhận notification đó.

**Cách sửa:**
Validate `data.space_slug` match pattern `^[a-z0-9-]+$` và `data.post_id` là valid UUID trước khi xây href.

---

### 🟠 High — Upload API chỉ validate MIME type từ client — có thể bypass bằng spoofed Content-Type

**File:** `src/app/api/upload/route.ts:17`

**Mô tả:**
```ts
if (!ALLOWED_TYPES.includes(file.type)) ...
```
`file.type` là giá trị do client cung cấp. Attacker upload file PHP hoặc SVG có script với header `Content-Type: image/jpeg` → API chấp nhận → file được serve từ storage.

**Cách sửa:**
Đọc magic bytes từ đầu file để verify thực sự là ảnh (JPEG: `FF D8 FF`, PNG: `89 50 4E 47`, WebP: `52 49 46 46`).

---

### 🟠 High — File extension lấy từ filename của client — không an toàn

**File:** `src/app/api/upload/route.ts:24`

**Mô tả:**
```ts
const ext = file.name.split('.').pop()
// path: `${user.id}/${Date.now()}.${ext}`
```
File không có extension → `ext = undefined` → path kết thúc bằng `.undefined`. File tên `a.b.html` → ext `html`. Filename do client kiểm soát hoàn toàn.

**Cách sửa:**
Derive extension từ MIME type đã validate qua whitelist map, không dùng filename:
```ts
const EXT_MAP = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
const ext = EXT_MAP[file.type as keyof typeof EXT_MAP] ?? 'bin'
```

---

### 🟠 High — `getOrCreateConversation` không verify `otherUserId` tồn tại

**File:** `src/lib/actions/messages.ts:30`

**Mô tả:**
Conversation được tạo với `otherUserId` tùy ý mà không check user có tồn tại trong `profiles`. Có thể tạo conversation orphaned với UUID không hợp lệ, gây lỗi FK hoặc lộ thông tin nội bộ.

**Cách sửa:**
```ts
const { data: other } = await supabase.from('profiles').select('id').eq('id', otherUserId).single()
if (!other) return null
```

---

### 🟡 Medium — Realtime subscription messages không filter — data của conversation khác được gửi đến client

**File:** `src/components/messages/conversation-list.tsx:25`

**Mô tả:**
Subscription lắng nghe toàn bộ `messages` table mà không filter theo `conversation_id`. Mọi message mới trong hệ thống đều được đẩy xuống browser của user (dù client filter trước khi hiển thị). Đây là data leak qua WebSocket.

**Cách sửa:**
Dùng Supabase realtime filter:
```ts
.on('INSERT', { filter: `conversation_id=in.(${userConvIds.join(',')})` }, handler)
```
Hoặc đảm bảo RLS được enforce trên realtime channel.

---

### 🟡 Medium — `markConversationRead` không được `await` trong useEffect — lỗi bị bỏ qua

**File:** `src/components/messages/message-thread.tsx:42`

**Mô tả:**
```ts
useEffect(() => {
  markConversationRead(conversationId) // missing await, unhandled promise
}, [conversationId])
```
Network error hoặc auth error sẽ là unhandled rejection im lặng — unread count không được cập nhật.

**Cách sửa:**
```ts
useEffect(() => {
  markConversationRead(conversationId).catch(console.error)
}, [conversationId])
```

---

### 🔵 Low — Bucket selection permissive — bất kỳ value nào không phải `spaces` đều vào bucket `avatars`

**File:** `src/app/api/upload/route.ts:25`

**Mô tả:**
```ts
const bucket = formBucket === 'spaces' ? 'spaces' : 'avatars'
```
Client gửi `bucket=anything` → file vào bucket `avatars`. Không có allowlist chặt chẽ.

**Cách sửa:**
```ts
const ALLOWED_BUCKETS = ['avatars', 'spaces'] as const
const bucket = ALLOWED_BUCKETS.includes(formBucket as any) ? formBucket : null
if (!bucket) return NextResponse.json({ error: 'Invalid bucket' }, { status: 400 })
```

---

### 🔵 Low — Query messages không có LIMIT trong layout — có thể load vài trăm nghìn rows

**File:** `src/app/(main)/messages/layout.tsx:52`

**Mô tả:**
Query lấy tất cả messages của tất cả conversations của user để tính `last_message` mà không có LIMIT. User có 50 conversations mỗi cái 10.000 tin nhắn → 500.000 rows được load mỗi lần render layout.

**Cách sửa:**
Dùng window function hoặc lateral join để lấy chỉ tin nhắn mới nhất của mỗi conversation. Không cần load tất cả messages.

---

## Tóm tắt

| # | Mức độ | Nhóm | File | Dòng | Vấn đề |
|---|--------|-------|------|------|--------|
| 1 | 🔴 Critical | Auth | `auth/callback/route.ts` | 7 | Open redirect qua `next` param |
| 2 | 🔴 Critical | Auth | `oauth-buttons.tsx` | 17 | `redirectTo` không encode/validate |
| 3 | 🔴 Critical | Posts | `load-more-posts.tsx` | 39 | Client query bỏ qua private-space access |
| 4 | 🔴 Critical | Posts | `spaces/[slug]/posts/[id]/page.tsx` | 63 | Private post hiển thị cho non-member |
| 5 | 🔴 Critical | Messages | `actions/messages.ts` | 46 | `sendMessage` không check membership |
| 6 | 🟠 High | Auth | `reset-password/page.tsx` | 23 | Form dùng được mà không cần recovery session |
| 7 | 🟠 High | Auth | `reset-password/page.tsx` | 36 | Redirect `/login` trong khi session còn active |
| 8 | 🟠 High | Auth | `middleware.ts` | 44 | `/reset-password` trong authRoutes — chặn luồng reset |
| 9 | 🟠 High | Auth | `middleware.ts` | 4 | `/admin` không check role |
| 10 | 🟠 High | Auth | `middleware.ts` | 19 | Cookie `setAll` là no-op — session không được refresh |
| 11 | 🟠 High | Auth | `forgot-password/page.tsx` | 27 | `redirectTo` sai — bỏ qua code exchange |
| 12 | 🟠 High | Posts | `rich-text-editor.tsx` | 90 | Stored XSS qua `javascript:` link |
| 13 | 🟠 High | Posts | `actions/posts.ts` | 53 | IDOR `updatePost` — cross-space |
| 14 | 🟠 High | Posts | `actions/posts.ts` | 76 | IDOR `deletePost` — cross-space |
| 15 | 🟠 High | Posts | `actions/comments.ts` | 21 | Không check membership trước khi comment |
| 16 | 🟠 High | Posts | `actions/spaces.ts` | 120 | `joinSpace` không check `is_private` — tự join private space |
| 17 | 🟠 High | Posts | `actions/spaces.ts` | 85 | Mass-assignment trong `updateSpace` |
| 18 | 🟠 High | Messages | `notification-dropdown.tsx` | 74 | IDOR `markRead` — không filter `user_id` |
| 19 | 🟠 High | Messages | `notification-dropdown.tsx` | 109 | Notification href từ data DB không validate |
| 20 | 🟠 High | Messages | `api/upload/route.ts` | 17 | MIME type validate từ client — bypass được |
| 21 | 🟠 High | Messages | `api/upload/route.ts` | 24 | Extension từ filename client — không an toàn |
| 22 | 🟠 High | Messages | `actions/messages.ts` | 30 | `getOrCreateConversation` không check user tồn tại |
| 23 | 🟡 Medium | Auth | `forgot-password/page.tsx` | 27 | Không có rate limiting — spam email |
| 24 | 🟡 Medium | Auth | `login/page.tsx` | 26 | Không có rate limiting — brute-force |
| 25 | 🟡 Medium | Auth | `register/page.tsx` | 37 | Email enumeration qua signUp response |
| 26 | 🟡 Medium | Auth | `register/page.tsx` | 43 | Raw Supabase error lộ ra UI |
| 27 | 🟡 Medium | Posts | `spaces/page.tsx` | 24 | Private spaces lộ tên/mô tả cho tất cả |
| 28 | 🟡 Medium | Posts | `spaces/[slug]/members/page.tsx` | 27 | Member list private space không cần auth |
| 29 | 🟡 Medium | Posts | `actions/posts.ts` | 110 | `togglePin` tin client boolean |
| 30 | 🟡 Medium | Posts | `post-actions.tsx` | 44 | Stale-closure double-click like |
| 31 | 🟡 Medium | Posts | `edit-space-form.tsx` | 54 | Cover upload không check lỗi từ `updateSpace` |
| 32 | 🟡 Medium | Messages | `conversation-list.tsx` | 25 | Realtime sub nhận data của tất cả conversations |
| 33 | 🟡 Medium | Messages | `message-thread.tsx` | 42 | `markConversationRead` không await |
| 34 | 🔵 Low | Auth | `login/page.tsx` | 42 | `router.push` trước `router.refresh` — race |
| 35 | 🔵 Low | Auth | `register/page.tsx` | 17 | Mật khẩu không có yêu cầu độ phức tạp |
| 36 | 🔵 Low | Messages | `api/upload/route.ts` | 25 | Bucket selection không có allowlist chặt |
| 37 | 🔵 Low | Messages | `messages/layout.tsx` | 52 | Query messages không có LIMIT |
