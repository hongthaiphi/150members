'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawRedirect = searchParams.get('redirectTo') ?? '/'
  const redirectTo = rawRedirect.startsWith('/') ? rawRedirect : '/'
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginForm) {
    setError(null)
    const { error } = await supabase.auth.signInWithPassword(data)
    if (error) {
      setError('Email hoặc mật khẩu không đúng')
      return
    }
    router.refresh()
    router.push(redirectTo)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-md">
              <span className="text-primary-foreground text-sm font-bold">C</span>
            </div>
            <span className="font-bold text-xl tracking-tight">Community</span>
          </div>
        </div>

        <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-5">
          <div className="text-center space-y-1">
            <h1 className="text-xl font-bold">Đăng nhập</h1>
            <p className="text-muted-foreground text-sm">Chào mừng trở lại</p>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); void handleSubmit(onSubmit)(e) }} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" {...register('email')} />
              {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="password" className="text-sm font-medium">Mật khẩu</Label>
                <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                  Quên mật khẩu?
                </Link>
              </div>
              <Input id="password" type="password" placeholder="••••••••" {...register('password')} />
              {errors.password && <p className="text-destructive text-xs">{errors.password.message}</p>}
            </div>

            {error && (
              <div className="text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full font-medium" disabled={isSubmitting}>
              {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-4">
          Chưa có tài khoản?{' '}
          <Link href="/register" className="text-foreground font-semibold hover:underline">
            Đăng ký ngay
          </Link>
        </p>
      </div>
    </div>
  )
}
