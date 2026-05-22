'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { deleteSpace } from '@/lib/actions/spaces'

interface DeleteSpaceButtonProps {
  spaceId: string
  spaceName: string
}

export function DeleteSpaceButton({ spaceId, spaceName }: DeleteSpaceButtonProps) {
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState('')
  const [pending, startTransition] = useTransition()

  function handleDelete() {
    if (confirm !== spaceName) return
    startTransition(async () => {
      const result = await deleteSpace(spaceId)
      if (result?.error) toast.error(result.error)
    })
  }

  return (
    <>
      <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
        Xóa Space
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa Space</DialogTitle>
            <DialogDescription>
              Hành động này không thể hoàn tác. Toàn bộ nội dung trong Space sẽ bị xóa vĩnh viễn.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Label htmlFor="confirm-name">
              Nhập <strong>{spaceName}</strong> để xác nhận
            </Label>
            <Input
              id="confirm-name"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder={spaceName}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>Hủy</Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={confirm !== spaceName || pending}
            >
              {pending ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
