'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createComment } from '@/lib/actions/comments'

interface CommentFormProps {
  postId: string
  spaceSlug: string
  parentId?: string
  currentUser: { avatarUrl: string | null; displayName: string }
  onCancel?: () => void
  autoFocus?: boolean
  placeholder?: string
}

export function CommentForm({
  postId,
  spaceSlug,
  parentId,
  currentUser,
  onCancel,
  autoFocus,
  placeholder,
}: CommentFormProps) {
  const [content, setContent] = useState('')
  const [pending, startTransition] = useTransition()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus()
  }, [autoFocus])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = content.trim()
    if (!trimmed) return

    startTransition(async () => {
      const res = await createComment(postId, spaceSlug, trimmed, parentId)
      if (res?.error) {
        toast.error(res.error)
      } else {
        setContent('')
        onCancel?.()
      }
    })
  }

  // Parse @mention suggestions as user types
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); void handleSubmit(e) }} className="flex gap-3">
      <Avatar className="h-8 w-8 shrink-0 mt-0.5">
        <AvatarImage src={currentUser.avatarUrl ?? undefined} />
        <AvatarFallback className="text-xs">
          {currentUser.displayName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 space-y-2">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={e => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? 'Viết bình luận... (Ctrl+Enter để gửi)'}
          rows={2}
          className="resize-none text-sm"
        />
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={!content.trim() || pending}>
            {pending ? 'Đang gửi...' : parentId ? 'Trả lời' : 'Bình luận'}
          </Button>
          {onCancel && (
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              Hủy
            </Button>
          )}
        </div>
      </div>
    </form>
  )
}
