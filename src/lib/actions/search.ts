'use server'

import { createClient } from '@/lib/supabase/server'

export type PostSearchResult = {
  id: string
  title: string
  content: string
  created_at: string
  spaces: { name: string; slug: string; icon: string | null } | null
  profiles: { username: string; display_name: string | null; avatar_url: string | null } | null
}

export type MemberSearchResult = {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  role: string
  bio: string | null
}

export type SpaceSearchResult = {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  is_private: boolean
  memberCount: number
}

export async function searchPosts(query: string, spaceSlug?: string): Promise<PostSearchResult[]> {
  if (!query.trim()) return []
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const q = `%${query.trim()}%`

  let builder = supabase
    .from('posts')
    .select('id, title, content, created_at, spaces!space_id(name, slug, icon, is_private), profiles!author_id(username, display_name, avatar_url)')
    .or(`title.ilike.${q},content.ilike.${q}`)
    .order('created_at', { ascending: false })
    .limit(30)

  if (spaceSlug) {
    const { data: space } = await supabase.from('spaces').select('id').eq('slug', spaceSlug).single()
    if (space) builder = builder.eq('space_id', space.id)
  }

  const { data } = await builder
  const rows = (data ?? []) as unknown as Array<PostSearchResult & { spaces: { is_private: boolean; name: string; slug: string; icon: string | null } | null }>

  // Filter out posts in private spaces the user isn't a member of
  if (!rows.length) return []

  const privateSpaceSlugs = rows
    .filter(r => r.spaces?.is_private)
    .map(r => r.spaces?.slug)
    .filter(Boolean) as string[]

  if (privateSpaceSlugs.length === 0) return rows

  if (!user) return rows.filter(r => !r.spaces?.is_private)

  const { data: memberships } = await supabase
    .from('space_members')
    .select('space_id')
    .eq('user_id', user.id)

  const memberSpaceIds = new Set((memberships ?? []).map(m => m.space_id))

  const { data: privateSpaces } = await supabase
    .from('spaces')
    .select('id, slug')
    .eq('is_private', true)

  const privateSlugToId = new Map((privateSpaces ?? []).map(s => [s.slug, s.id]))

  return rows.filter(r => {
    if (!r.spaces?.is_private) return true
    const sid = privateSlugToId.get(r.spaces.slug)
    return sid ? memberSpaceIds.has(sid) : false
  })
}

export async function searchMembers(query: string): Promise<MemberSearchResult[]> {
  if (!query.trim()) return []
  const supabase = await createClient()
  const q = `%${query.trim()}%`

  const { data } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, role, bio')
    .or(`username.ilike.${q},display_name.ilike.${q}`)
    .order('username', { ascending: true })
    .limit(30)

  return (data ?? []) as MemberSearchResult[]
}

export async function searchSpaces(query: string): Promise<SpaceSearchResult[]> {
  if (!query.trim()) return []
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const q = `%${query.trim()}%`

  const { data } = await supabase
    .from('spaces')
    .select('id, name, slug, description, icon, is_private')
    .or(`name.ilike.${q},description.ilike.${q}`)
    .order('name', { ascending: true })
    .limit(30)

  const spaces = (data ?? []) as Array<{ id: string; name: string; slug: string; description: string | null; icon: string | null; is_private: boolean }>

  let memberSpaceIds = new Set<string>()
  if (user) {
    const { data: memberships } = await supabase
      .from('space_members')
      .select('space_id')
      .eq('user_id', user.id)
    memberSpaceIds = new Set((memberships ?? []).map(m => m.space_id))
  }

  const visible = spaces.filter(s => !s.is_private || memberSpaceIds.has(s.id))

  const results = await Promise.all(
    visible.map(async (space) => {
      const { count } = await supabase
        .from('space_members')
        .select('*', { count: 'exact', head: true })
        .eq('space_id', space.id)
      return { ...space, memberCount: count ?? 0 }
    })
  )

  return results
}
