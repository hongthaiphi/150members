'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Camera, Loader2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { updateAvatar } from '@/lib/actions/profile'

interface AvatarUploadProps {
  currentUrl: string | null
  displayName: string
}

export function AvatarUpload({ currentUrl, displayName }: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(currentUrl)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    return () => {
      if (preview && preview.startsWith('blob:')) URL.revokeObjectURL(preview)
    }
  }, [preview])

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const newPreview = URL.createObjectURL(file)
    setPreview(prev => {
      if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev)
      return newPreview
    })
    setUploading(true)

    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('bucket', 'avatars')
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const json = await res.json() as { url?: string; error?: string }
      if (!res.ok || json.error) throw new Error(json.error ?? 'Upload thất bại')

      const result = await updateAvatar(json.url!)
      if (result?.error) throw new Error(result.error)
      toast.success('Cập nhật ảnh đại diện thành công')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi không xác định')
      setPreview(currentUrl)
      if (inputRef.current) inputRef.current.value = ''
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="relative w-fit">
      <Avatar className="h-24 w-24">
        <AvatarImage src={preview ?? undefined} />
        <AvatarFallback className="text-2xl">
          {displayName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 hover:opacity-100 transition-opacity disabled:opacity-100 disabled:cursor-not-allowed"
        aria-label="Thay đổi ảnh đại diện"
      >
        {uploading
          ? <Loader2 className="h-6 w-6 text-white animate-spin" />
          : <Camera className="h-6 w-6 text-white" />
        }
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  )
}
