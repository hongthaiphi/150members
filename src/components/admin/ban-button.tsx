'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { banMember, unbanMember } from '@/lib/actions/admin'

interface BanButtonProps {
  userId: string
  username: string
  isBanned: boolean
}

export function BanButton({ userId, username, isBanned }: BanButtonProps) {
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const router = useRouter()

  async function handleAction() {
    setLoading(true)
    const result = isBanned ? await unbanMember(userId) : await banMember(userId)
    setLoading(false)
    if (result.error) {
      alert(result.error)
    } else {
      setOpen(false)
      router.refresh()
    }
  }

  if (isBanned) {
    return (
      <Button variant="outline" size="sm" className="h-7 text-xs" disabled={loading} onClick={handleAction}>
        Bỏ ban
      </Button>
    )
  }

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        className="h-7 text-xs"
        disabled={loading}
        onClick={() => setOpen(true)}
      >
        Ban
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ban thành viên @{username}?</AlertDialogTitle>
            <AlertDialogDescription>
              Thành viên này sẽ bị chặn khỏi cộng đồng. Bạn có thể bỏ ban bất kỳ lúc nào.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAction}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Ban
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
