import Link from 'next/link'
import { getRecentContent } from '@/lib/actions/admin'
import { DeleteContentButton } from '@/components/admin/delete-content-button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ExternalLink } from 'lucide-react'

type PostItem = {
  id: string
  title: string
  created_at: string
  profiles: { username: string; display_name: string | null } | null
  spaces: { name: string; slug: string } | null
}

type CommentItem = {
  id: string
  content: string
  created_at: string
  post_id: string
  profiles: { username: string; display_name: string | null } | null
}

export default async function AdminContentPage() {
  const [postsResult, commentsResult] = await Promise.all([
    getRecentContent('posts'),
    getRecentContent('comments'),
  ])

  const posts = (postsResult.data ?? []) as unknown as PostItem[]
  const comments = (commentsResult.data ?? []) as unknown as CommentItem[]

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Kiểm duyệt nội dung</h1>

      <Tabs defaultValue="posts">
        <TabsList className="mb-4">
          <TabsTrigger value="posts">Bài viết ({posts.length})</TabsTrigger>
          <TabsTrigger value="comments">Comments ({comments.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="posts">
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tiêu đề</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tác giả</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Space</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Ngày</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Xóa</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {posts.map((post) => (
                  <tr key={post.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium line-clamp-1 max-w-xs">{post.title}</span>
                        {post.spaces?.slug && (
                          <Link
                            href={`/spaces/${post.spaces.slug}/posts/${post.id}`}
                            target="_blank"
                            className="text-muted-foreground hover:text-foreground shrink-0"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      @{post.profiles?.username}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {post.spaces?.name}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {new Date(post.created_at).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DeleteContentButton id={post.id} type="post" label={post.title} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {posts.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">Không có bài viết nào.</div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="comments">
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nội dung</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tác giả</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Ngày</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Xóa</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {comments.map((comment) => (
                  <tr key={comment.id}>
                    <td className="px-4 py-3">
                      <p className="line-clamp-2 max-w-sm text-muted-foreground"
                        dangerouslySetInnerHTML={{ __html: comment.content.replace(/<[^>]*>/g, ' ').slice(0, 150) }}
                      />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      @{comment.profiles?.username}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {new Date(comment.created_at).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DeleteContentButton
                        id={comment.id}
                        type="comment"
                        label={comment.content.replace(/<[^>]*>/g, ' ').slice(0, 60)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {comments.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">Không có comment nào.</div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
