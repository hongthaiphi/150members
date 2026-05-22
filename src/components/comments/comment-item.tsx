'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { toast } from 'sonner'
import { ThumbsUp, Reply, Edit, Trash2, Check, X } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { CommentForm } from './comment-form'
import { deleteComment, updateComment, toggleCommentReaction } from '@/lib/actions/comments'

export type CommentData = {
  id: string
  content: string
  created_at: string
  updated_at: string
  parent_id: string | null
  author: {
    id: string
    username: string
    display_name: string | null
    avatar_url: string | null
  }
  likeCount: number
  liked: boolean
  replies?: CommentData[]
}

interface CommentItemProps {
  comment: CommentData
  postId: string
  spaceSlug: string
  currentUser: { id: string; avatarUrl: string | null; displayName: string } | null
  depth?: number
}

export function CommentItem({ comment, postId, spaceSlug, currentUser, depth = 0 }: CommentItemProps) {
  const [showReply, setShowReply] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState(comment.content)
  const [likes, setLikes] = useState(comment.likeCount)
  const [liked, setLiked] = useState(comment.liked)
  const [pending, startTransition] = useTransition()

  const isAuthor = currentUser?.id === comment.author.id

  function handleLike() {
    if (!currentUser) return
    startTransition(async () => {
      const res = await toggleCommentReaction(comment.id, postId, spaceSlug)
      if (res?.error) { toast.error(res.error); return }
      setLiked(!liked)
      setLikes(l => liked ? l - 1 : l + 1)
    })
  }

  function handleDelete() {
    if (!confirm('Xóa bình luận này?')) return
    startTransition(async () => {
      const res = await deleteComment(comment.id, postId, spaceSlug)
      if (res?.error) toast.error(res.error)
    })
  }

  async function handleSaveEdit() {
    const trimmed = editContent.trim()
    if (!trimmed) return
    startTransition(async () => {
      const res = await updateComment(comment.id, postId, spaceSlug, trimmed)
      if (res?.error) toast.error(res.error)
      else setEditing(false)
    })
  }

  // Parse @mentions in content to links
  function renderContent(text: string) {
    const parts = text.split(/(@\w+)/g)
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        const username = part.slice(1)
        return (
          <Link key={i} href={`/profile/${username}`} className="text-primary font-medium hover:underline">
            {part}
          </Link>
        )
      }
      return part
    })
  }

  return (
    <div className={`flex gap-3 ${depth > 0 ? 'ml-10 mt-3' : ''}`}>
      <Link href={`/profile/${comment.author.username}`}>
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={comment.author.avatar_url ?? undefined} />
          <AvatarFallback className="text-xs">
            {(comment.author.display_name ?? comment.author.username).charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </Link>

      <div className="flex-1 min-w-0">
        <div className="bg-muted/50 rounded-lg px-3 py-2">
          <div className="flex items-center gap-2 mb-1">
            <Link href={`/profile/${comment.author.username}`} className="font-medium text-sm hover:underline">
              {comment.author.display_name ?? comment.author.username}
            </Link>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: vi })}
            </span>
            {comment.updated_at !== comment.created_at && (
              <span className="text-xs text-muted-foreground italic">(đã sửa)</span>
            )}
          </div>

          {editing ? (
            <div className="space-y-2">
              <Textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                rows={2}
                className="resize-none text-sm"
                autoFocus
              />
              <div className="flex gap-2">
                <Button size="sm" className="h-7 gap-1" onClick={handleSaveEdit} disabled={pending}>
                  <Check className="h-3 w-3" /> Lưu
                </Button>
                <Button size="sm" variant="ghost" className="h-7 gap-1" onClick={() => setEditing(false)}>
                  <X className="h-3 w-3" /> Hủy
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm leading-relaxed">{renderContent(comment.content)}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 mt-1 pl-1">
          <button
            onClick={handleLike}
            disabled={!currentUser || pending}
            className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded hover:bg-muted transition-colors ${liked ? 'text-primary' : 'text-muted-foreground'}`}
          >
            <ThumbsUp className={`h-3 w-3 ${liked ? 'fill-current' : ''}`} />
            {likes > 0 && <span>{likes}</span>}
          </button>

          {currentUser && depth === 0 && (
            <button
              onClick={() => setShowReply(!showReply)}
              className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Reply className="h-3 w-3" /> Trả lời
            </button>
          )}

          {isAuthor && (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Edit className="h-3 w-3" /> Sửa
            </button>
          )}

          {isAuthor && (
            <button
              onClick={handleDelete}
              disabled={pending}
              className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded text-muted-foreground hover:bg-muted hover:text-destructive transition-colors"
            >
              <Trash2 className="h-3 w-3" /> Xóa
            </button>
          )}
        </div>

        {/* Reply form */}
        {showReply && currentUser && (
          <div className="mt-3">
            <CommentForm
              postId={postId}
              spaceSlug={spaceSlug}
              parentId={comment.id}
              currentUser={currentUser}
              onCancel={() => setShowReply(false)}
              autoFocus
              placeholder={`Trả lời @${comment.author.username}...`}
            />
          </div>
        )}

        {/* Nested replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-2 space-y-3">
            {comment.replies.map(reply => (
              <CommentItem
                key={reply.id}
                comment={reply}
                postId={postId}
                spaceSlug={spaceSlug}
                currentUser={currentUser}
                depth={1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
