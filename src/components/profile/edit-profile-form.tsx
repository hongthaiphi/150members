'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { updateProfile } from '@/lib/actions/profile'
import type { Database } from '@/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']

const handleRegex = /^[a-zA-Z0-9_.-]*$/

const schema = z.object({
  display_name: z.string().max(50, 'Tối đa 50 ký tự').optional().or(z.literal('')),
  bio: z.string().max(300, 'Tối đa 300 ký tự').optional().or(z.literal('')),
  twitter: z.string().max(100).regex(handleRegex, 'Chỉ nhập username, không nhập URL').optional().or(z.literal('')),
  linkedin: z.string().max(100).regex(handleRegex, 'Chỉ nhập username, không nhập URL').optional().or(z.literal('')),
  github: z.string().max(100).regex(handleRegex, 'Chỉ nhập username, không nhập URL').optional().or(z.literal('')),
  website: z.string().refine(val => {
    try {
      const url = new URL(val)
      return url.protocol === 'http:' || url.protocol === 'https:'
    } catch {
      return false
    }
  }, 'URL phải bắt đầu bằng http:// hoặc https://').optional().or(z.literal('')),
})

type FormData = z.infer<typeof schema>

export function EditProfileForm({ profile }: { profile: Profile }) {
  const [saving, setSaving] = useState(false)
  const socialLinks = (profile.social_links as Record<string, string>) ?? {}

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      display_name: profile.display_name ?? '',
      bio: profile.bio ?? '',
      twitter: socialLinks.twitter ?? '',
      linkedin: socialLinks.linkedin ?? '',
      github: socialLinks.github ?? '',
      website: socialLinks.website ?? '',
    },
  })

  async function onSubmit(data: FormData) {
    setSaving(true)
    try {
      const result = await updateProfile({
        display_name: data.display_name ?? '',
        bio: data.bio ?? '',
        social_links: {
          twitter: data.twitter || undefined,
          linkedin: data.linkedin || undefined,
          github: data.github || undefined,
          website: data.website || undefined,
        },
      })
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success('Cập nhật hồ sơ thành công')
      }
    } catch {
      toast.error('Đã xảy ra lỗi, vui lòng thử lại')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); void handleSubmit(onSubmit)(e) }} className="space-y-6">
      <div className="space-y-4">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
          Thông tin cơ bản
        </h3>

        <div className="space-y-1">
          <Label>Username</Label>
          <Input value={profile.username} disabled className="bg-muted" />
          <p className="text-xs text-muted-foreground">Username không thể thay đổi</p>
        </div>

        <div className="space-y-1">
          <Label htmlFor="display_name">Tên hiển thị</Label>
          <Input id="display_name" placeholder="Tên của bạn" {...register('display_name')} />
          {errors.display_name && <p className="text-destructive text-xs">{errors.display_name.message}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="bio">Giới thiệu</Label>
          <Textarea
            id="bio"
            placeholder="Viết vài dòng giới thiệu về bản thân..."
            rows={4}
            {...register('bio')}
          />
          {errors.bio && <p className="text-destructive text-xs">{errors.bio.message}</p>}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
          Mạng xã hội
        </h3>

        {([
          { name: 'twitter', label: 'Twitter / X', placeholder: '@username' },
          { name: 'linkedin', label: 'LinkedIn', placeholder: 'username' },
          { name: 'github', label: 'GitHub', placeholder: 'username' },
          { name: 'website', label: 'Website', placeholder: 'https://example.com' },
        ] as const).map(({ name, label, placeholder }) => (
          <div key={name} className="space-y-1">
            <Label htmlFor={name}>{label}</Label>
            <Input id={name} placeholder={placeholder} {...register(name)} />
            {errors[name] && <p className="text-destructive text-xs">{errors[name]?.message}</p>}
          </div>
        ))}
      </div>

      <Button type="submit" disabled={saving}>
        {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
      </Button>
    </form>
  )
}
