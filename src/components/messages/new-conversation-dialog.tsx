'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { searchUsersForDM, getOrCreateConversation } from '@/lib/actions/messages'

type UserResult = {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
}

export function NewConversationDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UserResult[]>([])
  const [searching, setSearching] = useState(false)
  const [startingId, setStartingId] = useState<string | null>(null)

  async function handleSearch(value: string) {
    setQuery(value)
    if (!value.trim()) {
      setResults([])
      return
    }
    setSearching(true)
    const users = await searchUsersForDM(value)
    setResults(users)
    setSearching(false)
  }

  async function handleSelect(userId: string) {
    setStartingId(userId)
    try {
      const res = await getOrCreateConversation(userId)
      if (res.id) {
        setOpen(false)
        setQuery('')
        setResults([])
        router.push(`/messages/${res.id}`)
      } else {
        toast.error(res.error || 'Không thể mở cuộc trò chuyện. Vui lòng thử lại.')
      }
    } catch (err) {
      console.error('[NewConversationDialog]', err)
      toast.error('Đã xảy ra lỗi: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setStartingId(null)
    }
  }

  function handleOpenChange(val: boolean) {
    setOpen(val)
    if (!val) {
      setQuery('')
      setResults([])
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors outline-none"
        title="Cuộc trò chuyện mới"
      >
        <Plus className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tin nhắn mới</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-1">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm theo tên hoặc username..."
              value={query}
              onChange={e => handleSearch(e.target.value)}
              className="pl-8"
              autoFocus
            />
          </div>

          <div className="min-h-[80px] max-h-64 overflow-y-auto">
            {searching ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : results.length === 0 && query.trim() ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Không tìm thấy thành viên nào
              </p>
            ) : results.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nhập tên để tìm kiếm thành viên
              </p>
            ) : (
              <div className="space-y-1">
                {results.map(user => (
                  <button
                    key={user.id}
                    onClick={() => handleSelect(user.id)}
                    disabled={startingId === user.id}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted transition-colors disabled:opacity-60 text-left"
                  >
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarImage src={user.avatar_url ?? undefined} />
                      <AvatarFallback className="text-sm">
                        {(user.display_name ?? user.username).charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user.display_name ?? user.username}</p>
                      <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                    </div>
                    {startingId === user.id && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
