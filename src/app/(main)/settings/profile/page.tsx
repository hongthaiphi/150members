import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Separator } from '@/components/ui/separator'
import { AvatarUpload } from '@/components/profile/avatar-upload'
import { EditProfileForm } from '@/components/profile/edit-profile-form'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Chỉnh sửa hồ sơ — Community' }

export default async function EditProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Chỉnh sửa hồ sơ</h1>

      <div className="mb-6">
        <h2 className="font-semibold mb-3">Ảnh đại diện</h2>
        <AvatarUpload
          currentUrl={profile.avatar_url}
          displayName={profile.display_name ?? profile.username}
        />
      </div>

      <Separator className="my-6" />

      <EditProfileForm profile={profile} />
    </div>
  )
}
