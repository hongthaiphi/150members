'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { PostResultCard } from '@/components/search/post-result-card'
import { MemberResultCard } from '@/components/search/member-result-card'
import { SpaceCard } from '@/components/spaces/space-card'
import { EmptyState } from '@/components/shared/empty-state'
import { cn } from '@/lib/utils'
import type { PostSearchResult, MemberSearchResult, SpaceSearchResult } from '@/lib/actions/search'

type Props = {
  query: string
  tab: string
  spaceSlug: string
  posts: PostSearchResult[]
  members: MemberSearchResult[]
  spaces: SpaceSearchResult[]
  allSpaces: Array<{ slug: string; name: string; icon: string | null }>
}

export function SearchTabs({ query, tab, spaceSlug, posts, members, spaces, allSpaces }: Props) {
  const searchParams = useSearchParams()

  function buildUrl(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([k, v]) => {
      if (v) params.set(k, v)
      else params.delete(k)
    })
    return `/search?${params.toString()}`
  }

  const tabs = [
    { key: 'posts', label: `Bài viết (${posts.length})` },
    { key: 'members', label: `Thành viên (${members.length})` },
    { key: 'spaces', label: `Spaces (${spaces.length})` },
  ]

  return (
    <div>
      {/* Tab bar */}
      <div className="flex border-b mb-4 gap-0">
        {tabs.map(t => (
          <Link
            key={t.key}
            href={buildUrl({ tab: t.key, space: '' })}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* Posts tab */}
      {tab === 'posts' && (
        <div>
          {allSpaces.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              <Link
                href={buildUrl({ tab: 'posts', space: '' })}
                className={cn(
                  'inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs border transition-colors',
                  !spaceSlug
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:bg-muted'
                )}
              >
                Tất cả
              </Link>
              {allSpaces.map(s => (
                <Link
                  key={s.slug}
                  href={buildUrl({ tab: 'posts', space: s.slug })}
                  className={cn(
                    'inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs border transition-colors',
                    spaceSlug === s.slug
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  )}
                >
                  {s.icon && <span>{s.icon}</span>}
                  {s.name}
                </Link>
              ))}
            </div>
          )}

          {posts.length === 0 ? (
            <EmptyState
              icon="📝"
              title="Không tìm thấy bài viết"
              description={`Không có bài viết nào khớp với "${query}"`}
            />
          ) : (
            <div className="space-y-3">
              {posts.map(post => <PostResultCard key={post.id} post={post} />)}
            </div>
          )}
        </div>
      )}

      {/* Members tab */}
      {tab === 'members' && (
        <div>
          {members.length === 0 ? (
            <EmptyState
              icon="👥"
              title="Không tìm thấy thành viên"
              description={`Không có thành viên nào khớp với "${query}"`}
            />
          ) : (
            <div className="space-y-3">
              {members.map(m => <MemberResultCard key={m.id} member={m} />)}
            </div>
          )}
        </div>
      )}

      {/* Spaces tab */}
      {tab === 'spaces' && (
        <div>
          {spaces.length === 0 ? (
            <EmptyState
              icon="🌌"
              title="Không tìm thấy Space"
              description={`Không có Space nào khớp với "${query}"`}
            />
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {spaces.map(s => <SpaceCard key={s.id} {...s} />)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
