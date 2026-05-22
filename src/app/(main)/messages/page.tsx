import { MessageSquare } from 'lucide-react'

export default function MessagesPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 h-full">
      <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="font-semibold text-lg mb-1">Tin nhắn trực tiếp</h3>
      <p className="text-muted-foreground text-sm max-w-xs">
        Chọn một cuộc trò chuyện, hoặc bắt đầu cuộc trò chuyện mới từ trang hồ sơ của thành viên.
      </p>
    </div>
  )
}
