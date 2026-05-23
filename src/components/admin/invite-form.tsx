'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { inviteMember } from '@/lib/actions/admin'
import { CheckCircle2, Loader2 } from 'lucide-react'

export function InviteForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setLoading(true)

    const result = await inviteMember(email.trim())
    setLoading(false)

    if (result.error) {
      setError(result.error)
    } else {
      setSuccess(true)
      setEmail('')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div className="space-y-2">
        <Label htmlFor="email">Địa chỉ email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
          required
          disabled={loading}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {success && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <CheckCircle2 className="h-4 w-4" />
          Email mời đã được gửi thành công!
        </div>
      )}

      <Button type="submit" disabled={loading || !email}>
        {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
        Gửi lời mời
      </Button>
    </form>
  )
}
