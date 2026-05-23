'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function MainError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('[MainError]', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <p className="text-6xl mb-5 select-none">⚠️</p>
      <h2 className="text-xl font-bold mb-2">Đã xảy ra lỗi</h2>
      <p className="text-muted-foreground max-w-sm mb-6 text-sm">
        Trang này gặp sự cố không mong muốn.
        {process.env.NODE_ENV === 'development' && error.message
          ? ` (${error.message})`
          : ' Vui lòng thử lại.'}
      </p>
      <div className="flex items-center gap-3">
        <Button onClick={reset} size="sm">Thử lại</Button>
        <Link href="/">
          <Button variant="outline" size="sm">Về trang chủ</Button>
        </Link>
      </div>
    </div>
  )
}
