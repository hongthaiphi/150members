import { createClient } from '@/lib/supabase/server'
import { LoginForm } from './login-form'

export default async function LoginPage() {
  const supabase = await createClient()
  const { data: settings } = await supabase
    .from('community_settings')
    .select('value')
    .eq('key', 'community_name')
    .maybeSingle()
  const communityName = (settings as { value: string } | null)?.value || 'Community'

  return <LoginForm communityName={communityName} />
}
