import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import type { PostSearchResult } from '@/lib/actions/search'

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

export function PostResultCard({ post }: { post: PostSearchResult }) {
  const space = post.spaces
  const author = post.profiles
  const excerpt = stripHtml(post.content).slice(0, 150)

  return (
    <Link
      href={space ? `/spaces/${space.slug}/posts/${post.id}` : '#'}
      className="block border rounded-lg p-4 hover:bg-muted/50 transition-colors"
    >
      {space && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
          <span>{space.icon ?? '📁'}</span>
          <span>{space.name}</span>
        </div>
      )}
      <h3 className="font-medium text-sm leading-snug mb-1 line-clamp-2">{post.title}</h3>
      {excerpt && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{excerpt}</p>
      )}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {author && (
          <>
            <Avatar className="h-4 w-4">
              <AvatarImage src={author.avatar_url ?? undefined} />
              <AvatarFallback className="text-[9px]">
                {(author.display_name ?? author.username).charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span>{author.display_name ?? author.username}</span>
            <span>·</span>
          </>
        )}
        <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: vi })}</span>
      </div>
    </Link>
  )
}
