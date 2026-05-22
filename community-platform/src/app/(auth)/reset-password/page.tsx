'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const schema = z.object({
  password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Mật khẩu xác nhận không khớp',
  path: ['confirmPassword'],
})

type Form = z.infer<typeof schema>

export default function ResetPasswordPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: Form) {
    setError(null)
    const { error } = await supabase.auth.updateUser({ password: data.password })
    if (error) { setError(error.message); return }
    router.push('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Đặt lại mật khẩu</h1>
          <p className="text-muted-foreground text-sm">Nhập mật khẩu mới cho tài khoản của bạn</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="password">Mật khẩu mới</Label>
            <Input id="password" type="password" {...register('password')} />
            {errors.password && <p className="text-destructive text-xs">{errors.password.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
            <Input id="confirmPassword" type="password" {...register('confirmPassword')} />
            {errors.confirmPassword && <p className="text-destructive text-xs">{errors.confirmPassword.message}</p>}
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
          </Button>
        </form>
      </div>
    </div>
  )
}
