import { InviteForm } from '@/components/admin/invite-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function AdminInvitePage() {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Mời thành viên</h1>

      <Card>
        <CardHeader>
          <CardTitle>Gửi lời mời qua email</CardTitle>
          <CardDescription>
            Người được mời sẽ nhận email với link để tham gia cộng đồng. Sau khi đăng ký, họ sẽ được thêm vào với role mặc định là Member.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InviteForm />
        </CardContent>
      </Card>
    </div>
  )
}
