import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { MobileSidebar } from '@/components/layout/mobile-sidebar'

type SpaceItem = { id: string; name: string; slug: string; icon: string | null }

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: rawMemberships } = await supabase
    .from('space_members')
    .select('space_id')
    .eq('user_id', user.id)

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

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar spaces={spaces} profile={profile} className="hidden md:flex" />
      <MobileSidebar spaces={spaces} profile={profile} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header profile={profile} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
