'use client'

import { useState, useTransition } from 'react'
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
  isGuest?: boolean
}

export function PostActions({
  postId,
  spaceSlug,
  isAuthor,
  canManage,
  isPinned,
  initialLikeCount,
  initialLiked,
  isGuest = false,
}: PostActionsProps) {
  const [likeCount, setLikeCount] = useState(initialLikeCount)
  const [liked, setLiked] = useState(initialLiked)
  const [pending, startTransition] = useTransition()

  function handleLike() {
    if (isGuest) {
      toast.error('Vui lòng đăng nhập để thực hiện tính năng này')
      return
    }
    startTransition(async () => {
      const res = await toggleReaction(postId, 'post', spaceSlug, postId)
      if (res?.error) { toast.error(res.error); return }
      setLiked(prev => {
        const nowLiked = !prev
        setLikeCount(c => nowLiked ? c + 1 : c - 1)
        return nowLiked
      })
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
      const res = await togglePin(postId, spaceSlug)
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
          <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors outline-none">
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isAuthor && (
              <DropdownMenuItem
                onClick={() => { window.location.href = `/spaces/${spaceSlug}/posts/${postId}/edit` }}
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
              variant="destructive"
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" /> Xóa bài viết
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
