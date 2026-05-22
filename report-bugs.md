# Báo cáo lỗi — Profile Features

Danh sách lỗi được phát hiện qua rà soát code các tính năng liên quan đến profile.

---

## 🔴 Critical

### 1. Stored XSS qua `javascript:` URI trong trường website

**File:** `src/components/profile/social-links.tsx:31`

**Mô tả:**
```ts
const href = value.startsWith('http') ? value : `${prefix}${value}`
```
Với field `website`, `prefix = ''`. Giá trị `javascript:alert(document.cookie)` không bắt đầu bằng `'http'` nên đi vào nhánh `prefix + value`, tạo ra `href="javascript:..."`. Mọi người xem trang profile đều bị kích hoạt script khi click vào link đó.

**Kịch bản khai thác:** User A lưu website = `javascript:alert(document.cookie)`. Mọi visitor xem profile của User A và click vào link website đều bị thực thi script tùy ý trong trình duyệt.

**Cách sửa:**
- Thêm `.url()` validation vào Zod schema cho tất cả các field social trong `edit-profile-form.tsx`
- Và/hoặc ở `social-links.tsx`, chỉ render `href` nếu URL hợp lệ theo `new URL()` và scheme là `http` hoặc `https`

---

### 2. Prefix bypass — open redirect trên Twitter/LinkedIn/GitHub

**File:** `src/components/profile/social-links.tsx:31`

**Mô tả:**
Cùng logic ở dòng 31: nếu user lưu `twitter = "https://evil.com"`, điều kiện `value.startsWith('http')` là `true` → `href = "https://evil.com"` (bỏ qua hoàn toàn prefix `https://twitter.com/`). Link trông như một profile Twitter hợp lệ nhưng thực chất trỏ đến site tùy ý của kẻ tấn công.

**Kịch bản khai thác:** User lưu `linkedin = "https://phishing-site.com"`. Visitor click vào icon LinkedIn trên profile sẽ bị redirect đến site lừa đảo.

**Cách sửa:**
- Với các field handle (twitter, linkedin, github): chỉ cho phép bare username, validate bằng regex `^[a-zA-Z0-9_.\-]+$`, không cho phép full URL
- Schema trong `edit-profile-form.tsx` cần thêm `.regex()` cho 3 field này

---

## 🟠 High

### 3. Save button bị disabled vĩnh viễn khi `updateProfile` throw exception

**File:** `src/components/profile/edit-profile-form.tsx:44-56`

**Mô tả:**
```ts
async function onSubmit(data: FormData) {
  setSaving(true)
  const result = await updateProfile(...)  // nếu throw → thoát ngay
  setSaving(false)                          // không bao giờ được gọi
  ...
}
```
`setSaving(false)` không nằm trong `finally` block. Khi `updateProfile` ném exception (lỗi mạng, server action lỗi...), `saving` mãi mãi là `true` → button "Lưu thay đổi" bị disable suốt phiên làm việc, user phải reload trang mới dùng được.

**Cách sửa:**
```ts
async function onSubmit(data: FormData) {
  setSaving(true)
  try {
    const result = await updateProfile(...)
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success('Cập nhật hồ sơ thành công')
    }
  } catch {
    toast.error('Đã xảy ra lỗi, vui lòng thử lại')
  } finally {
    setSaving(false)
  }
}
```

---

### 4. Href bị broken `/spaces/undefined/posts/<id>` khi post không có space

**File:** `src/app/(main)/profile/[username]/page.tsx:119`

**Mô tả:**
```tsx
<Link href={`/spaces/${post.spaces?.slug}/posts/${post.id}`}>
  {post.title}
</Link>
```
Khi một post không gắn với space nào (`post.spaces === null`), `post.spaces?.slug` là `undefined`, template literal tạo ra `/spaces/undefined/posts/<id>`. Guard `{post.spaces && ...}` ở dòng 127 chỉ bảo vệ link tên space bên dưới, không bảo vệ link tiêu đề bài viết ở dòng 119.

**Cách sửa:**
```tsx
<CardTitle className="text-sm font-medium">
  {post.spaces ? (
    <Link href={`/spaces/${post.spaces.slug}/posts/${post.id}`} className="hover:underline">
      {post.title}
    </Link>
  ) : (
    <span>{post.title}</span>
  )}
</CardTitle>
```

---

## 🟡 Medium

### 5. `revalidatePath('/profile/undefined')` khi SELECT username sau update thất bại

**File:** `src/lib/actions/profile.ts:40` và `:63`

**Mô tả:**
```ts
const { data: profile } = await supabase
  .from('profiles').select('username').eq('id', user.id).single()

revalidatePath(`/profile/${profile?.username}`)  // '/profile/undefined' nếu profile null
```
Sau khi UPDATE thành công, code thực hiện một SELECT thứ hai để lấy username. Nếu SELECT này thất bại (race condition, RLS issue, network blip), `profile` là `null` → `revalidatePath('/profile/undefined')` được gọi thay vì path thực. Cache của trang profile không được invalidate → dữ liệu cũ tiếp tục được phục vụ. Lỗi này tồn tại ở cả `updateProfile` (dòng 40) và `updateAvatar` (dòng 63).

**Cách sửa:**
```ts
if (profile?.username) {
  revalidatePath(`/profile/${profile.username}`)
}
```
Hoặc tốt hơn: không cần SELECT thêm, dùng luôn giá trị đã có từ trước đó (truyền `username` vào action).

---

## 🔵 Low

### 6. Object URL từ `URL.createObjectURL` không bao giờ được revoke — memory leak

**File:** `src/components/profile/avatar-upload.tsx:23`

**Mô tả:**
```ts
setPreview(URL.createObjectURL(file))
```
Mỗi lần user chọn file, một blob URL mới được tạo nhưng blob URL cũ không được `URL.revokeObjectURL()` — không khi component unmount, không khi chọn file mới, không khi upload lỗi. Trong session dài với nhiều lần thay đổi avatar, các blob URL tích lũy và không được giải phóng.

**Cách sửa:**
```ts
// Revoke URL cũ trước khi tạo mới
const newPreview = URL.createObjectURL(file)
setPreview(prev => {
  if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev)
  return newPreview
})

// Cleanup khi unmount
useEffect(() => {
  return () => {
    if (preview && preview.startsWith('blob:')) URL.revokeObjectURL(preview)
  }
}, [preview])
```

---

### 7. File input không reset sau khi upload thất bại — không thể retry cùng file

**File:** `src/components/profile/avatar-upload.tsx:37-42`

**Mô tả:**
```ts
} catch (err) {
  toast.error(err instanceof Error ? err.message : 'Lỗi không xác định')
  setPreview(currentUrl)
  // inputRef.current bị bỏ quên — vẫn giữ file cũ
}
```
Khi upload thất bại, preview được khôi phục về ảnh cũ, nhưng `<input type="file">` vẫn giữ file đã chọn. Sự kiện `onChange` không fire nếu user chọn lại đúng file đó → user bị kẹt, không thể retry upload với cùng file mà không chọn file khác trước.

**Cách sửa:**
```ts
} catch (err) {
  toast.error(err instanceof Error ? err.message : 'Lỗi không xác định')
  setPreview(currentUrl)
  if (inputRef.current) inputRef.current.value = ''  // reset để cho phép retry
}
```

---

## Tóm tắt

| # | Mức độ | File | Dòng | Vấn đề |
|---|--------|------|------|--------|
| 1 | 🔴 Critical | `social-links.tsx` | 31 | Stored XSS via `javascript:` URI |
| 2 | 🔴 Critical | `social-links.tsx` | 31 | Prefix bypass / open redirect |
| 3 | 🟠 High | `edit-profile-form.tsx` | 44–56 | Button disabled vĩnh viễn khi throw |
| 4 | 🟠 High | `profile/[username]/page.tsx` | 119 | Href `/spaces/undefined/posts/...` |
| 5 | 🟡 Medium | `actions/profile.ts` | 40, 63 | `revalidatePath('/profile/undefined')` |
| 6 | 🔵 Low | `avatar-upload.tsx` | 23 | Memory leak blob URL |
| 7 | 🔵 Low | `avatar-upload.tsx` | 37–42 | Không thể retry upload cùng file |
