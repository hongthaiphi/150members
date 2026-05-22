'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RichTextEditor } from './rich-text-editor'
import { createPost, updatePost } from '@/lib/actions/posts'

const schema = z.object({
  title: z.string().min(3, 'Tiêu đề tối thiểu 3 ký tự').max(200, 'Tối đa 200 ký tự'),
})

type FormData = z.infer<typeof schema>

interface PostFormProps {
  spaceId: string
  spaceSlug: string
  postId?: string
  defaultTitle?: string
  defaultContent?: string
  mode?: 'create' | 'edit'
}

export function PostForm({
  spaceId,
  spaceSlug,
  postId,
  defaultTitle = '',
  defaultContent = '',
  mode = 'create',
}: PostFormProps) {
  const [content, setContent] = useState(defaultContent)
  const [pending, startTransition] = useTransition()

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { title: defaultTitle },
  })

  function onSubmit(data: FormData) {
    if (!content || content === '<p></p>') {
      toast.error('Nội dung bài viết không được để trống')
      return
    }
    startTransition(async () => {
      const result = mode === 'edit' && postId
        ? await updatePost(postId, spaceSlug, { title: data.title, content })
        : await createPost(spaceId, spaceSlug, { title: data.title, content })

      if (result?.error) toast.error(result.error)
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-1">
        <Label htmlFor="title">Tiêu đề *</Label>
        <Input
          id="title"
          placeholder="Tiêu đề bài viết..."
          className="text-base font-medium"
          {...register('title')}
        />
        {errors.title && <p className="text-destructive text-xs">{errors.title.message}</p>}
      </div>

      <div className="space-y-1">
        <Label>Nội dung *</Label>
        <RichTextEditor
          content={defaultContent}
          onChange={setContent}
          placeholder="Chia sẻ điều gì đó với cộng đồng..."
        />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending
            ? mode === 'edit' ? 'Đang lưu...' : 'Đang đăng...'
            : mode === 'edit' ? 'Lưu thay đổi' : 'Đăng bài'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => history.back()} disabled={pending}>
          Hủy
        </Button>
      </div>
    </form>
  )
}
