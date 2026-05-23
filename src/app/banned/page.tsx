import { Ban } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function BannedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-4">
          <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <Ban className="h-8 w-8 text-destructive" />
          </div>
        </div>
        <h1 className="text-2xl font-bold mb-2">Tài khoản bị khóa</h1>
        <p className="text-muted-foreground mb-6">
          Tài khoản của bạn đã bị khóa khỏi cộng đồng này. Nếu bạn cho rằng đây là nhầm lẫn, hãy liên hệ với quản trị viên.
        </p>
        <Link href="/login">
          <Button variant="outline">Đăng nhập bằng tài khoản khác</Button>
        </Link>
      </div>
    </div>
  )
}
