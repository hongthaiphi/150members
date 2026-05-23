import { Suspense } from 'react'
import { Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { searchPosts, searchMembers, searchSpaces } from '@/lib/actions/search'
import { SearchTabs } from '@/components/search/search-tabs'
import type { Metadata } from 'next'

type Props = {
  searchParams: { q?: string; tab?: string; space?: string }
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const q = searchParams.q ?? ''
  return { title: q ? `Tìm kiếm "${q}" — Community` : 'Tìm kiếm — Community' }
}

export default async function SearchPage({ searchParams }: Props) {
  const query = (searchParams.q ?? '').trim()
  const tab = searchParams.tab ?? 'posts'
  const spaceSlug = searchParams.space ?? ''

  if (!query) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-xl font-semibold mb-2">Tìm kiếm</h1>
        <p className="text-muted-foreground text-sm">
          Nhập từ khóa vào thanh tìm kiếm để tìm bài viết, thành viên và Spaces.
        </p>
      </div>
    )
  }

  // Fetch all results in parallel
  const [posts, members, spaces] = await Promise.all([
    searchPosts(query, spaceSlug),
    searchMembers(query),
    searchSpaces(query),
  ])

  // Fetch all public/accessible spaces for the space filter
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let memberSpaceIds = new Set<string>()
  if (user) {
    const { data: memberships } = await supabase
      .from('space_members')
      .select('space_id')
      .eq('user_id', user.id)
    memberSpaceIds = new Set((memberships ?? []).map(m => m.space_id))
  }

  const { data: allSpacesRaw } = await supabase
    .from('spaces')
    .select('id, name, slug, icon, is_private')
    .order('name', { ascending: true })

  const allSpaces = (allSpacesRaw ?? [])
    .filter(s => !s.is_private || memberSpaceIds.has(s.id))
    .map(s => ({ slug: s.slug, name: s.name, icon: s.icon }))

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">
          Kết quả cho &ldquo;{query}&rdquo;
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {posts.length + members.length + spaces.length} kết quả
        </p>
      </div>

      <Suspense>
        <SearchTabs
          query={query}
          tab={tab}
          spaceSlug={spaceSlug}
          posts={posts}
          members={members}
          spaces={spaces}
          allSpaces={allSpaces}
        />
      </Suspense>
    </div>
  )
}
