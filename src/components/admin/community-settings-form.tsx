'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateCommunitySettings } from '@/lib/actions/admin'
import { CheckCircle2, Loader2 } from 'lucide-react'

interface CommunitySettingsFormProps {
  initialSettings: Record<string, string>
}

export function CommunitySettingsForm({ initialSettings }: CommunitySettingsFormProps) {
  const [name, setName] = useState(initialSettings.community_name ?? '')
  const [logoUrl, setLogoUrl] = useState(initialSettings.community_logo_url ?? '')
  const [color, setColor] = useState(initialSettings.primary_color ?? '#6366f1')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setLoading(true)

    const result = await updateCommunitySettings({
      community_name: name,
      community_logo_url: logoUrl,
      primary_color: color,
    })

    setLoading(false)
    if (result.error) {
      setError(result.error)
    } else {
      setSuccess(true)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-md">
      <div className="space-y-2">
        <Label htmlFor="community-name">Tên cộng đồng</Label>
        <Input
          id="community-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tên cộng đồng của bạn"
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="logo-url">URL logo</Label>
        <Input
          id="logo-url"
          type="url"
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          placeholder="https://..."
          disabled={loading}
        />
        {logoUrl && (
          <div className="flex items-center gap-2 mt-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt="Logo preview" className="h-10 w-10 rounded object-cover border" />
            <span className="text-xs text-muted-foreground">Preview</span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="primary-color">Màu chủ đạo</Label>
        <div className="flex items-center gap-3">
          <input
            id="primary-color"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            disabled={loading}
            className="h-10 w-16 rounded border cursor-pointer"
          />
          <Input
            value={color}
            onChange={(e) => setColor(e.target.value)}
            placeholder="#6366f1"
            className="font-mono w-32"
            disabled={loading}
          />
          <div className="h-8 w-8 rounded-full border" style={{ backgroundColor: color }} />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {success && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <CheckCircle2 className="h-4 w-4" />
          Cài đặt đã được lưu!
        </div>
      )}

      <Button type="submit" disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
        Lưu cài đặt
      </Button>
    </form>
  )
}
