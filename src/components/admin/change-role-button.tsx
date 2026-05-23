'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChevronDown } from 'lucide-react'
import { changeRole } from '@/lib/actions/admin'
import type { UserRole } from '@/types/database'

const roles: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'moderator', label: 'Moderator' },
  { value: 'member', label: 'Member' },
]

interface ChangeRoleButtonProps {
  userId: string
  currentRole: UserRole
}

export function ChangeRoleButton({ userId, currentRole }: ChangeRoleButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleChange(role: UserRole) {
    if (role === currentRole) return
    setLoading(true)
    const result = await changeRole(userId, role)
    setLoading(false)
    if (result.error) {
      alert(result.error)
    } else {
      router.refresh()
    }
  }

  const currentLabel = roles.find(r => r.value === currentRole)?.label ?? currentRole

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={loading}
        className="inline-flex items-center justify-center gap-1 h-7 px-2 rounded-md border border-input bg-background text-xs font-medium hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:pointer-events-none transition-colors"
      >
        {currentLabel}
        <ChevronDown className="h-3 w-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {roles.map(({ value, label }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => handleChange(value)}
            className={currentRole === value ? 'font-semibold' : ''}
          >
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
