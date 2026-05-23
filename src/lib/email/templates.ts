const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

function layout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${title}</title>
<style>
  body { margin:0; padding:0; background:#f4f4f5; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; color:#18181b; }
  .wrap { max-width:560px; margin:40px auto; background:#fff; border-radius:8px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,.08); }
  .header { background:#18181b; padding:24px 32px; }
  .header h1 { margin:0; color:#fff; font-size:18px; font-weight:600; }
  .body { padding:32px; }
  .body p { margin:0 0 16px; line-height:1.6; font-size:15px; }
  .btn { display:inline-block; padding:10px 20px; background:#18181b; color:#fff!important; text-decoration:none; border-radius:6px; font-size:14px; font-weight:500; margin:8px 0 16px; }
  .post-card { border:1px solid #e4e4e7; border-radius:6px; padding:16px; margin-bottom:12px; }
  .post-card h3 { margin:0 0 6px; font-size:15px; }
  .post-card p { margin:0; font-size:13px; color:#71717a; }
  .footer { padding:20px 32px; background:#f4f4f5; font-size:12px; color:#71717a; text-align:center; }
  .footer a { color:#71717a; }
</style>
</head>
<body>
  <div class="wrap">
    <div class="header"><h1>Community</h1></div>
    <div class="body">${body}</div>
    <div class="footer">
      Bạn nhận email này vì đã bật thông báo email.
      <a href="${BASE_URL}/settings/notifications">Tắt thông báo</a>
    </div>
  </div>
</body>
</html>`
}

export function replyEmailHtml(opts: {
  actorName: string
  postTitle: string
  postUrl: string
  isReply: boolean
}): string {
  const action = opts.isReply ? 'đã trả lời bình luận của bạn' : 'đã bình luận vào bài viết của bạn'
  const body = `
    <p><strong>${escHtml(opts.actorName)}</strong> ${action}:</p>
    <div class="post-card"><h3>${escHtml(opts.postTitle)}</h3></div>
    <a class="btn" href="${opts.postUrl}">Xem bình luận</a>
  `
  return layout(`${opts.actorName} ${action}`, body)
}

export function mentionEmailHtml(opts: {
  actorName: string
  postTitle: string
  postUrl: string
}): string {
  const body = `
    <p><strong>${escHtml(opts.actorName)}</strong> đã nhắc đến bạn trong bài viết:</p>
    <div class="post-card"><h3>${escHtml(opts.postTitle)}</h3></div>
    <a class="btn" href="${opts.postUrl}">Xem ngay</a>
  `
  return layout(`${opts.actorName} đã nhắc đến bạn`, body)
}

export type DigestPost = {
  id: string
  title: string
  spaceName: string
  spaceSlug: string
  authorName: string
  excerpt: string
}

export function digestEmailHtml(opts: {
  period: 'daily' | 'weekly'
  posts: DigestPost[]
}): string {
  const label = opts.period === 'daily' ? 'hôm nay' : 'tuần này'
  const cards = opts.posts
    .map(p => {
      const url = `${BASE_URL}/spaces/${p.spaceSlug}/posts/${p.id}`
      return `
        <div class="post-card">
          <h3><a href="${url}" style="color:#18181b;text-decoration:none;">${escHtml(p.title)}</a></h3>
          <p>${escHtml(p.spaceName)} · ${escHtml(p.authorName)}</p>
          ${p.excerpt ? `<p style="margin-top:6px;">${escHtml(p.excerpt.slice(0, 140))}${p.excerpt.length > 140 ? '…' : ''}</p>` : ''}
        </div>`
    })
    .join('')

  const body = `
    <p>Có <strong>${opts.posts.length} bài viết mới</strong> ${label} trong cộng đồng của bạn.</p>
    ${cards}
    <a class="btn" href="${BASE_URL}">Xem tất cả</a>
  `
  return layout(`Tóm tắt bài viết mới ${label}`, body)
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
