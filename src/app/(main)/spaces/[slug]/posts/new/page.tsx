import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { PostForm } from '@/components/posts/post-form'
import type { Metadata } from 'next'

interface Props { params: { slug: string } }

export const metadata: Metadata = { title: 'Đăng bài viết mới — Community' }

export default async function NewPostPage({ params }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: space } = await supabase
    .from('spaces')
    .select('id, name, slug')
    .eq('slug', params.slug)
    .single()

  if (!space) notFound()

  // Must be a member
  const { data: membership } = await supabase
    .from('space_members')
    .select('user_id')
    .eq('space_id', space.id)
    .eq('user_id', user.id)
    .single()

  if (!membership) redirect(`/spaces/${params.slug}`)

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/spaces/${params.slug}`}>
          <Button variant="ghost" size="sm">← Quay lại</Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold">Đăng bài viết mới</h1>
          <p className="text-sm text-muted-foreground">Space: {space.name}</p>
        </div>
      </div>

      <PostForm spaceId={space.id} spaceSlug={space.slug} />
    </div>
  )
}
