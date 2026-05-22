'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const schema = z.object({ email: z.string().email('Email không hợp lệ') })
type Form = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: Form) {
    setError(null)
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) { setError(error.message); return }
    setSent(true)
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm space-y-4 text-center">
          <div className="text-4xl">📧</div>
          <h1 className="text-2xl font-bold">Đã gửi email</h1>
          <p className="text-muted-foreground text-sm">
            Kiểm tra hộp thư và nhấn link để đặt lại mật khẩu.
          </p>
          <Link href="/login" className="text-sm hover:underline block">Quay lại đăng nhập</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Quên mật khẩu</h1>
          <p className="text-muted-foreground text-sm">Nhập email để nhận link đặt lại mật khẩu</p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); void handleSubmit(onSubmit)(e) }} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register('email')} />
            {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Đang gửi...' : 'Gửi link đặt lại'}
          </Button>
        </form>

        <Link href="/login" className="block text-center text-sm text-muted-foreground hover:underline">
          Quay lại đăng nhập
        </Link>
      </div>
    </div>
  )
}
