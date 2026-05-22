'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { MoreHorizontal, Edit, Trash2, Pin, PinOff, Share2, ThumbsUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { deletePost, togglePin, toggleReaction } from '@/lib/actions/posts'

interface PostActionsProps {
  postId: string
  spaceSlug: string
  isAuthor: boolean
  canManage: boolean
  isPinned: boolean
  initialLikeCount: number
  initialLiked: boolean
}

export function PostActions({
  postId,
  spaceSlug,
  isAuthor,
  canManage,
  isPinned,
  initialLikeCount,
  initialLiked,
}: PostActionsProps) {
  const [likeCount, setLikeCount] = useState(initialLikeCount)
  const [liked, setLiked] = useState(initialLiked)
  const [pending, startTransition] = useTransition()

  function handleLike() {
    startTransition(async () => {
      const res = await toggleReaction(postId, 'post', spaceSlug, postId)
      if (res?.error) { toast.error(res.error); return }
      setLiked(!liked)
      setLikeCount(c => liked ? c - 1 : c + 1)
    })
  }

  function handleDelete() {
    if (!confirm('Xóa bài viết này?')) return
    startTransition(async () => {
      const res = await deletePost(postId, spaceSlug)
      if (res?.error) toast.error(res.error)
    })
  }

  function handlePin() {
    startTransition(async () => {
      const res = await togglePin(postId, spaceSlug, isPinned)
      if (res?.error) toast.error(res.error)
      else toast.success(isPinned ? 'Đã bỏ ghim' : 'Đã ghim bài viết')
    })
  }

  function handleShare() {
    navigator.clipboard.writeText(window.location.href)
    toast.success('Đã copy link bài viết')
  }

  return (
    <div className="flex items-center gap-2">
      {/* Like button */}
      <Button
        variant={liked ? 'secondary' : 'ghost'}
        size="sm"
        className="gap-1.5"
        onClick={handleLike}
        disabled={pending}
      >
        <ThumbsUp className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} />
        <span>{likeCount}</span>
      </Button>

      {/* Share */}
      <Button variant="ghost" size="sm" className="gap-1.5" onClick={handleShare}>
        <Share2 className="h-4 w-4" />
        Chia sẻ
      </Button>

      {/* More actions (author / admin) */}
      {(isAuthor || canManage) && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            {isAuthor && (
              <DropdownMenuItem
                render={<Link href={`/spaces/${spaceSlug}/posts/${postId}/edit`} />}
                className="gap-2"
              >
                <Edit className="h-4 w-4" /> Chỉnh sửa
              </DropdownMenuItem>
            )}
            {canManage && (
              <DropdownMenuItem onClick={handlePin} className="gap-2">
                {isPinned
                  ? <><PinOff className="h-4 w-4" /> Bỏ ghim</>
                  : <><Pin className="h-4 w-4" /> Ghim bài viết</>
                }
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleDelete}
              className="gap-2 text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4" /> Xóa bài viết
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
