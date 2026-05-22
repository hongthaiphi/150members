'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getOrCreateConversation } from '@/lib/actions/messages'

interface StartConversationButtonProps {
  otherUserId: string
}

export function StartConversationButton({ otherUserId }: StartConversationButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    const convId = await getOrCreateConversation(otherUserId)
    if (convId) {
      router.push(`/messages/${convId}`)
    }
    setLoading(false)
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={loading}>
      <MessageSquare className="h-4 w-4 mr-1.5" />
      {loading ? 'Đang mở...' : 'Nhắn tin'}
    </Button>
  )
}
