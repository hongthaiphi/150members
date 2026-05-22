import { Badge } from '@/components/ui/badge'
import type { UserRole } from '@/types/database'

const roleConfig: Record<UserRole, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  admin: { label: 'Admin', variant: 'default' },
  moderator: { label: 'Moderator', variant: 'secondary' },
  member: { label: 'Member', variant: 'outline' },
}

export function RoleBadge({ role }: { role: UserRole }) {
  const { label, variant } = roleConfig[role] ?? roleConfig.member
  return <Badge variant={variant}>{label}</Badge>
}
