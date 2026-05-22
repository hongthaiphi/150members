'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { joinSpace, leaveSpace } from '@/lib/actions/spaces'

interface JoinLeaveButtonProps {
  spaceId: string
  slug: string
  isMember: boolean
  isCreator: boolean
}

export function JoinLeaveButton({ spaceId, slug, isMember, isCreator }: JoinLeaveButtonProps) {
  const [member, setMember] = useState(isMember)
  const [pending, startTransition] = useTransition()

  function toggle() {
    startTransition(async () => {
      if (member) {
        const res = await leaveSpace(spaceId, slug)
        if (res?.error) { toast.error(res.error); return }
        toast.success('Đã rời Space')
        setMember(false)
      } else {
        const res = await joinSpace(spaceId, slug)
        if (res?.error) { toast.error(res.error); return }
        toast.success('Đã tham gia Space')
        setMember(true)
      }
    })
  }

  if (isCreator) return null

  return (
    <Button
      variant={member ? 'outline' : 'default'}
      size="sm"
      onClick={toggle}
      disabled={pending}
    >
      {pending ? '...' : member ? 'Rời Space' : 'Tham gia'}
    </Button>
  )
}
