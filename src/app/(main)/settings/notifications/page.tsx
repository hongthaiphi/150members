import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEmailPreferences } from '@/lib/actions/email-preferences'
import { EmailPreferencesForm } from '@/components/settings/email-preferences-form'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Cài đặt thông báo — Community' }

export default async function NotificationSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const prefs = await getEmailPreferences()
  if (!prefs) redirect('/login')

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">Cài đặt thông báo email</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Chọn loại email bạn muốn nhận từ cộng đồng.
      </p>
      <EmailPreferencesForm initial={prefs} />
    </div>
  )
}
