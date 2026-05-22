import { CommentItem, type CommentData } from './comment-item'
import { CommentForm } from './comment-form'
import { Separator } from '@/components/ui/separator'

interface CommentListProps {
  comments: CommentData[]
  postId: string
  spaceSlug: string
  currentUser: { id: string; avatarUrl: string | null; displayName: string } | null
}

export function CommentList({ comments, postId, spaceSlug, currentUser }: CommentListProps) {
  // Separate top-level comments and replies
  const topLevel = comments.filter(c => !c.parent_id)
  const repliesMap = new Map<string, CommentData[]>()
  comments.filter(c => c.parent_id).forEach(reply => {
    const list = repliesMap.get(reply.parent_id!) ?? []
    list.push(reply)
    repliesMap.set(reply.parent_id!, list)
  })

  const commentsWithReplies = topLevel.map(c => ({
    ...c,
    replies: repliesMap.get(c.id) ?? [],
  }))

  return (
    <div>
      <Separator className="mb-6" />
      <h2 className="font-semibold mb-5">
        Bình luận ({comments.length})
      </h2>

      {currentUser && (
        <div className="mb-6">
          <CommentForm
            postId={postId}
            spaceSlug={spaceSlug}
            currentUser={currentUser}
          />
        </div>
      )}

      {commentsWithReplies.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Chưa có bình luận nào. Hãy là người đầu tiên!
        </p>
      ) : (
        <div className="space-y-5">
          {commentsWithReplies.map(comment => (
            <CommentItem
              key={comment.id}
              comment={comment}
              postId={postId}
              spaceSlug={spaceSlug}
              currentUser={currentUser}
            />
          ))}
        </div>
      )}
    </div>
  )
}
