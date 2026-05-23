'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { getOrCreateConversation } from '@/lib/actions/messages'

interface StartConversationButtonProps {
  otherUserId: string
}

export function StartConversationButton({ otherUserId }: StartConversationButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const res = await getOrCreateConversation(otherUserId)
      if (res.id) {
        router.push(`/messages/${res.id}`)
      } else {
        toast.error(res.error || 'Không thể mở cuộc trò chuyện. Vui lòng thử lại.')
      }
    } catch (err) {
      console.error('[StartConversationButton]', err)
      toast.error('Đã xảy ra lỗi: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={loading}>
      <MessageSquare className="h-4 w-4 mr-1.5" />
      {loading ? 'Đang mở...' : 'Nhắn tin'}
    </Button>
  )
}
