import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { SpaceCard } from '@/components/spaces/space-card'
import { EmptyState } from '@/components/shared/empty-state'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Spaces — Community' }

type SpaceWithCount = {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  is_private: boolean
  memberCount: number
}

export default async function SpacesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: spaces } = await supabase
    .from('spaces')
    .select('id, name, slug, description, icon, is_private')
    .order('created_at', { ascending: false })

  // Get member counts
  const spacesWithCount: SpaceWithCount[] = await Promise.all(
    (spaces ?? []).map(async (space) => {
      const { count } = await supabase
        .from('space_members')
        .select('*', { count: 'exact', head: true })
        .eq('space_id', space.id)
      return { ...space, memberCount: count ?? 0 }
    })
  )

  // Current user's memberships
  const { data: memberships } = user
    ? await supabase.from('space_members').select('space_id').eq('user_id', user.id)
    : { data: [] }
  const memberSpaceIds = new Set((memberships as Array<{ space_id: string }> | null)?.map(m => m.space_id) ?? [])

  const mySpaces = spacesWithCount.filter(s => memberSpaceIds.has(s.id))
  const otherSpaces = spacesWithCount.filter(s => !memberSpaceIds.has(s.id))

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Spaces</h1>
        <Link href="/spaces/new">
          <Button>+ Tạo Space</Button>
        </Link>
      </div>

      {spacesWithCount.length === 0 ? (
        <EmptyState
          icon="🌌"
          title="Chưa có Space nào"
          description="Tạo Space đầu tiên để bắt đầu xây dựng cộng đồng"
          action={
            <Link href="/spaces/new"><Button>Tạo Space ngay</Button></Link>
          }
        />
      ) : (
        <div className="space-y-8">
          {mySpaces.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Spaces của tôi
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {mySpaces.map(space => <SpaceCard key={space.id} {...space} />)}
              </div>
            </section>
          )}

          {otherSpaces.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Khám phá
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {otherSpaces.map(space => <SpaceCard key={space.id} {...space} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
