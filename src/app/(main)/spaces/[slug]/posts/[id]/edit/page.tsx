import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { PostForm } from '@/components/posts/post-form'
import type { Metadata } from 'next'
import type { UserRole } from '@/types/database'

interface Props { params: { slug: string; id: string } }

export const metadata: Metadata = { title: 'Chỉnh sửa bài viết — Community' }

export default async function EditPostPage({ params }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: space } = await supabase
    .from('spaces')
    .select('id, name, slug')
    .eq('slug', params.slug)
    .single()

  if (!space) notFound()

  const { data: rawPost } = await supabase
    .from('posts')
    .select('id, title, content, author_id')
    .eq('id', params.id)
    .single()

  const post = rawPost as { id: string; title: string; content: string; author_id: string } | null
  if (!post) notFound()

  const { data: rawProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const profile = rawProfile as { role: UserRole } | null
  const canEdit = post.author_id === user.id || profile?.role === 'admin' || profile?.role === 'moderator'

  if (!canEdit) redirect(`/spaces/${params.slug}/posts/${params.id}`)

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/spaces/${params.slug}/posts/${params.id}`}>
          <Button variant="ghost" size="sm">← Quay lại</Button>
        </Link>
        <h1 className="text-xl font-bold">Chỉnh sửa bài viết</h1>
      </div>

      <PostForm
        spaceId={space.id}
        spaceSlug={space.slug}
        postId={post.id}
        defaultTitle={post.title}
        defaultContent={post.content}
        mode="edit"
      />
    </div>
  )
}
