'use client'

import { useTransition, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { updateSpace } from '@/lib/actions/spaces'
import type { Database } from '@/types/database'

type Space = Database['public']['Tables']['spaces']['Row']

const EMOJIS = ['💬', '🚀', '💡', '📚', '🎯', '🛠️', '🌱', '🎨', '🔥', '⚡', '🌍', '🎮']

const schema = z.object({
  name: z.string().min(2, 'Tên tối thiểu 2 ký tự').max(50, 'Tối đa 50 ký tự'),
  description: z.string().max(300, 'Tối đa 300 ký tự').optional().or(z.literal('')),
  is_private: z.boolean(),
})

type FormData = z.infer<typeof schema>

export function EditSpaceForm({ space }: { space: Space }) {
  const [pending, startTransition] = useTransition()
  const [icon, setIcon] = useState(space.icon ?? '💬')
  const [uploadingCover, setUploadingCover] = useState(false)
  const [coverUrl, setCoverUrl] = useState(space.cover_image)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: space.name,
      description: space.description ?? '',
      is_private: space.is_private,
    },
  })

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingCover(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('bucket', 'spaces')
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const json = await res.json() as { url?: string; error?: string }
      if (!res.ok || json.error) throw new Error(json.error)
      await updateSpace(space.id, { cover_image: json.url })
      setCoverUrl(json.url!)
      toast.success('Cập nhật ảnh bìa thành công')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload thất bại')
    } finally {
      setUploadingCover(false)
    }
  }

  function onSubmit(data: FormData) {
    startTransition(async () => {
      const result = await updateSpace(space.id, { ...data, icon })
      if (result?.error) toast.error(result.error)
      else toast.success('Cập nhật Space thành công')
    })
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); void handleSubmit(onSubmit)(e) }} className="space-y-6">
      {/* Cover image */}
      <div className="space-y-2">
        <Label>Ảnh bìa</Label>
        <div
          className="relative h-32 rounded-lg border-2 border-dashed bg-muted flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => document.getElementById('cover-upload')?.click()}
        >
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverUrl} alt="Cover" className="absolute inset-0 w-full h-full object-cover" />
          ) : null}
          <div className="relative z-10 text-center">
            {uploadingCover
              ? <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
              : <p className="text-sm text-muted-foreground">Nhấn để upload ảnh bìa</p>
            }
          </div>
        </div>
        <input
          id="cover-upload"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleCoverUpload}
        />
      </div>

      {/* Icon */}
      <div className="space-y-2">
        <Label>Icon Space</Label>
        <div className="flex flex-wrap gap-2">
          {EMOJIS.map(e => (
            <button
              key={e}
              type="button"
              onClick={() => setIcon(e)}
              className={`text-2xl w-10 h-10 rounded-lg border-2 transition-colors ${icon === e ? 'border-primary bg-primary/10' : 'border-transparent hover:border-muted-foreground/30'}`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="name">Tên Space *</Label>
        <Input id="name" {...register('name')} />
        {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="description">Mô tả</Label>
        <Textarea id="description" rows={3} {...register('description')} />
        {errors.description && <p className="text-destructive text-xs">{errors.description.message}</p>}
      </div>

      <div className="flex items-center gap-3 p-4 border rounded-lg">
        <input type="checkbox" id="is_private" className="h-4 w-4" {...register('is_private')} />
        <div>
          <Label htmlFor="is_private" className="cursor-pointer">Space riêng tư</Label>
          <p className="text-xs text-muted-foreground">Chỉ thành viên được mời mới xem được</p>
        </div>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? 'Đang lưu...' : 'Lưu thay đổi'}
      </Button>
    </form>
  )
}
