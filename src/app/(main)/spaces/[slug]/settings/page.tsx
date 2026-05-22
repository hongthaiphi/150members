import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { EditSpaceForm } from '@/components/spaces/edit-space-form'
import { DeleteSpaceButton } from '@/components/spaces/delete-space-button'
import type { Metadata } from 'next'
import type { UserRole } from '@/types/database'

interface Props { params: { slug: string } }

export const metadata: Metadata = { title: 'Cài đặt Space — Community' }

export default async function SpaceSettingsPage({ params }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: space } = await supabase
    .from('spaces')
    .select('*')
    .eq('slug', params.slug)
    .single()

  if (!space) notFound()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const userRole = (profile as { role: UserRole } | null)?.role
  const canManage = space.created_by === user.id || userRole === 'admin' || userRole === 'moderator'

  if (!canManage) redirect(`/spaces/${params.slug}`)

  const isAdmin = userRole === 'admin'

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/spaces/${params.slug}`}>
          <Button variant="ghost" size="sm">← Quay lại</Button>
        </Link>
        <h1 className="text-xl font-bold">Cài đặt Space</h1>
      </div>

      <EditSpaceForm space={space} />

      {isAdmin && (
        <>
          <Separator className="my-8" />
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-destructive">Vùng nguy hiểm</h2>
            <p className="text-sm text-muted-foreground">
              Xóa Space sẽ xóa toàn bộ bài viết, bình luận và thành viên. Hành động này không thể hoàn tác.
            </p>
            <DeleteSpaceButton spaceId={space.id} spaceName={space.name} />
          </div>
        </>
      )}
    </div>
  )
}
