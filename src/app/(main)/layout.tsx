export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { MobileSidebar } from '@/components/layout/mobile-sidebar'

type SpaceItem = { id: string; name: string; slug: string; icon: string | null }

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // For post detail page, we allow guests
  // Note: we can't easily check pathname in Server Layout, but we can check if it's NOT a guest-friendly page if we wanted.
  // However, the middleware already handles protection for other pages.
  // So here we just shouldn't redirect if it's a page that might be public.
  
  // Actually, MainLayout is used for all (main) routes. 
  // If user is null, we only skip redirect for specific routes if we knew them.
  // But wait, if I remove 'redirect' here, then the page component itself must handle guest vs user.
  
  const { data: profile } = user ? await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single() : { data: null }

  const { data: rawMemberships } = user ? await supabase
    .from('space_members')
    .select('space_id')
    .eq('user_id', user.id) : { data: null }

  const memberships = rawMemberships as Array<{ space_id: string }> | null

  let spaces: SpaceItem[] = []
  if (memberships && memberships.length > 0) {
    const ids = memberships.map(m => m.space_id)
    const { data: spaceData } = await supabase
      .from('spaces')
      .select('id, name, slug, icon')
      .in('id', ids)
    spaces = (spaceData ?? []) as SpaceItem[]
  }

  const { data: settingsRows } = await supabase
    .from('community_settings')
    .select('key, value')
    .eq('key', 'community_name')
    .maybeSingle()
  const communityName = (settingsRows as { key: string; value: string } | null)?.value || 'Community'

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar spaces={spaces} profile={profile} communityName={communityName} className="hidden md:flex" />
      <MobileSidebar spaces={spaces} profile={profile} communityName={communityName} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden pt-14 md:pt-0">
        <Header profile={profile} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
