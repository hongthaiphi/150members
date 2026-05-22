import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CreateSpaceForm } from '@/components/spaces/create-space-form'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Tạo Space mới — Community' }

export default async function NewSpacePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Tạo Space mới</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Space là nơi nhóm thành viên cùng chủ đề tập trung thảo luận
        </p>
      </div>
      <CreateSpaceForm />
    </div>
  )
}
