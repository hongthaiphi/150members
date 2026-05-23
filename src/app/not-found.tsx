import Link from 'next/link'
import { Button } from '@/components/ui/button'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: '404 — Trang không tồn tại' }

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-background text-foreground">
      <p className="text-8xl mb-6 select-none">🔍</p>
      <h1 className="text-4xl font-bold mb-2">404</h1>
      <h2 className="text-xl font-semibold mb-3">Trang không tồn tại</h2>
      <p className="text-muted-foreground max-w-sm mb-8">
        Trang bạn đang tìm kiếm có thể đã bị xóa, di chuyển hoặc chưa bao giờ tồn tại.
      </p>
      <div className="flex items-center gap-3">
        <Link href="/">
          <Button>Về trang chủ</Button>
        </Link>
        <Link href="/spaces">
          <Button variant="outline">Khám phá Spaces</Button>
        </Link>
      </div>
    </div>
  )
}
