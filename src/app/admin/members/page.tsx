import { getMembers } from '@/lib/actions/admin'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ChangeRoleButton } from '@/components/admin/change-role-button'
import { BanButton } from '@/components/admin/ban-button'
import type { UserRole } from '@/types/database'

const roleColors: Record<UserRole, string> = {
  admin: 'bg-red-100 text-red-700 border-red-200',
  moderator: 'bg-blue-100 text-blue-700 border-blue-200',
  member: 'bg-gray-100 text-gray-700 border-gray-200',
}

export default async function AdminMembersPage() {
  const { data: members, count, error } = await getMembers(1, 50)

  if (error) return <div className="p-6 text-destructive">{error}</div>

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Thành viên</h1>
        <span className="text-sm text-muted-foreground">{count} thành viên</span>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Thành viên</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Ngày tham gia</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Trạng thái</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {members?.map((member) => (
              <tr key={member.id} className={member.is_banned ? 'opacity-50' : ''}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={member.avatar_url ?? undefined} />
                      <AvatarFallback className="text-xs">
                        {(member.display_name ?? member.username).charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{member.display_name ?? member.username}</p>
                      <p className="text-xs text-muted-foreground">@{member.username}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(member.created_at).toLocaleDateString('vi-VN')}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${roleColors[member.role]}`}>
                      {member.role}
                    </span>
                    {member.is_banned && (
                      <Badge variant="destructive" className="text-xs">Banned</Badge>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <ChangeRoleButton userId={member.id} currentRole={member.role} />
                    <BanButton userId={member.id} username={member.username} isBanned={member.is_banned} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {(!members || members.length === 0) && (
          <div className="text-center py-12 text-muted-foreground">
            Không có thành viên nào.
          </div>
        )}
      </div>
    </div>
  )
}
