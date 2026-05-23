import { getCommunitySettings } from '@/lib/actions/admin'
import { CommunitySettingsForm } from '@/components/admin/community-settings-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function AdminSettingsPage() {
  const settings = await getCommunitySettings()

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Cài đặt cộng đồng</h1>

      <Card>
        <CardHeader>
          <CardTitle>Thông tin cộng đồng</CardTitle>
          <CardDescription>
            Tùy chỉnh tên, logo và màu sắc cho cộng đồng của bạn.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CommunitySettingsForm initialSettings={settings} />
        </CardContent>
      </Card>
    </div>
  )
}
