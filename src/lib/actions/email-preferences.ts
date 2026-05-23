'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type EmailPrefs = {
  email_reply: boolean
  email_mention: boolean
  email_digest: 'none' | 'daily' | 'weekly'
}

export async function getEmailPreferences(): Promise<EmailPrefs | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('email_preferences')
    .select('email_reply, email_mention, email_digest')
    .eq('user_id', user.id)
    .single()

  if (!data) {
    // Row missing — insert defaults then return them
    await supabase.from('email_preferences').insert({ user_id: user.id })
    return { email_reply: true, email_mention: true, email_digest: 'weekly' }
  }

  return data as EmailPrefs
}

export async function updateEmailPreferences(prefs: EmailPrefs) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  const { error } = await supabase
    .from('email_preferences')
    .upsert({ user_id: user.id, ...prefs, updated_at: new Date().toISOString() })

  if (error) return { error: error.message }

  revalidatePath('/settings/notifications')
  return { success: true }
}
