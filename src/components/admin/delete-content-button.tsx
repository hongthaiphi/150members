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
import { adminDeletePost, adminDeleteComment } from '@/lib/actions/admin'
import { Trash2 } from 'lucide-react'

interface DeleteContentButtonProps {
  id: string
  type: 'post' | 'comment'
  label: string
}

export function DeleteContentButton({ id, type, label }: DeleteContentButtonProps) {
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    setLoading(true)
    const result = type === 'post' ? await adminDeletePost(id) : await adminDeleteComment(id)
    setLoading(false)
    if (result.error) {
      alert(result.error)
    } else {
      setOpen(false)
      router.refresh()
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-destructive"
        disabled={loading}
        onClick={() => setOpen(true)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa {type === 'post' ? 'bài viết' : 'comment'}?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{label}&rdquo; sẽ bị xóa vĩnh viễn. Không thể khôi phục.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
