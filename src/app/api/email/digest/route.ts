import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email/client'
import { digestEmailHtml, type DigestPost } from '@/lib/email/templates'
import sanitizeHtml from 'sanitize-html'

// Called by Vercel Cron (configured in vercel.json).
// Also callable manually: GET /api/email/digest?period=daily&secret=<CRON_SECRET>
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const period = (req.nextUrl.searchParams.get('period') ?? 'daily') as 'daily' | 'weekly'
  const since = new Date(
    Date.now() - (period === 'weekly' ? 7 : 1) * 24 * 60 * 60 * 1000
  ).toISOString()

  // Use service-role client to bypass RLS for cross-user queries
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch new posts in the period
  const { data: posts } = await admin
    .from('posts')
    .select('id, title, content, author_id, space_id, spaces!space_id(name, slug), profiles!author_id(username, display_name)')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(20)

  if (!posts || posts.length === 0) {
    return NextResponse.json({ sent: 0, reason: 'no new posts' })
  }

  const digestPosts: DigestPost[] = (posts as unknown as Array<{
    id: string
    title: string
    content: string
    spaces: { name: string; slug: string } | null
    profiles: { username: string; display_name: string | null } | null
  }>).map(p => ({
    id: p.id,
    title: p.title,
    spaceName: p.spaces?.name ?? '',
    spaceSlug: p.spaces?.slug ?? '',
    authorName: p.profiles?.display_name ?? p.profiles?.username ?? '',
    excerpt: htmlToText(p.content),
  }))

  // Find users who want this digest frequency
  const { data: prefs } = await admin
    .from('email_preferences')
    .select('user_id')
    .eq('email_digest', period)

  if (!prefs || prefs.length === 0) {
    return NextResponse.json({ sent: 0, reason: 'no subscribers' })
  }

  const subject = period === 'daily'
    ? 'Tóm tắt bài viết mới hôm nay'
    : 'Tóm tắt bài viết mới tuần này'
  const html = digestEmailHtml({ period, posts: digestPosts })

  let sent = 0
  for (const pref of prefs) {
    const { data: authUser } = await admin.auth.admin.getUserById(pref.user_id)
    const email = authUser?.user?.email
    if (!email) continue
    await sendEmail({ to: email, subject, html })
    sent++
  }

  return NextResponse.json({ sent })
}

function htmlToText(html: string): string {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, ' ')
    .trim()
}
