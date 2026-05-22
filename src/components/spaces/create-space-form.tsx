'use client'

import { useTransition, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createSpace } from '@/lib/actions/spaces'

const EMOJIS = ['💬', '🚀', '💡', '📚', '🎯', '🛠️', '🌱', '🎨', '🔥', '⚡', '🌍', '🎮']

const schema = z.object({
  name: z.string().min(2, 'Tên tối thiểu 2 ký tự').max(50, 'Tối đa 50 ký tự'),
  description: z.string().max(300, 'Tối đa 300 ký tự').optional().or(z.literal('')),
  is_private: z.boolean(),
})

type FormData = z.infer<typeof schema>

export function CreateSpaceForm() {
  const [pending, startTransition] = useTransition()
  const [icon, setIcon] = useState('💬')

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', description: '', is_private: false },
  })

  function onSubmit(data: FormData) {
    startTransition(async () => {
      const result = await createSpace({ ...data, icon })
      if (result?.error) toast.error(result.error)
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Icon picker */}
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
        <Input id="name" placeholder="vd: Marketing, Dev Team, Q&A..." {...register('name')} />
        {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="description">Mô tả</Label>
        <Textarea
          id="description"
          placeholder="Space này dành cho..."
          rows={3}
          {...register('description')}
        />
        {errors.description && <p className="text-destructive text-xs">{errors.description.message}</p>}
      </div>

      <div className="flex items-center gap-3 p-4 border rounded-lg">
        <input
          type="checkbox"
          id="is_private"
          className="h-4 w-4"
          {...register('is_private')}
        />
        <div>
          <Label htmlFor="is_private" className="cursor-pointer">Space riêng tư</Label>
          <p className="text-xs text-muted-foreground">Chỉ thành viên được mời mới xem được</p>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Đang tạo...' : 'Tạo Space'}
      </Button>
    </form>
  )
}
