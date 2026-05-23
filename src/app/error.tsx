'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log to error reporting service in production
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <html lang="vi">
      <body className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
        <p className="text-8xl mb-6 select-none">⚠️</p>
        <h1 className="text-4xl font-bold mb-2">500</h1>
        <h2 className="text-xl font-semibold mb-3">Đã xảy ra lỗi</h2>
        <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-8">
          Máy chủ gặp sự cố không mong muốn. Vui lòng thử lại hoặc liên hệ quản trị viên nếu lỗi tiếp tục.
        </p>
        {process.env.NODE_ENV === 'development' && error.message && (
          <pre className="mb-6 text-left text-xs bg-gray-100 dark:bg-gray-900 rounded-lg p-4 max-w-lg w-full overflow-auto text-red-600 dark:text-red-400">
            {error.message}
          </pre>
        )}
        <Button onClick={reset}>Thử lại</Button>
      </body>
    </html>
  )
}
