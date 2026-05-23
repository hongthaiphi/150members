'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { updateEmailPreferences, type EmailPrefs } from '@/lib/actions/email-preferences'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface Props {
  initial: EmailPrefs
}

const digestOptions = [
  { value: 'none', label: 'Tắt' },
  { value: 'daily', label: 'Hàng ngày' },
  { value: 'weekly', label: 'Hàng tuần' },
] as const

export function EmailPreferencesForm({ initial }: Props) {
  const [prefs, setPrefs] = useState<EmailPrefs>(initial)
  const [pending, startTransition] = useTransition()

  function toggle(key: 'email_reply' | 'email_mention') {
    setPrefs(p => ({ ...p, [key]: !p[key] }))
  }

  function setDigest(value: EmailPrefs['email_digest']) {
    setPrefs(p => ({ ...p, email_digest: value }))
  }

  function save() {
    startTransition(async () => {
      const result = await updateEmailPreferences(prefs)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Đã lưu cài đặt')
      }
    })
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-base font-semibold mb-4">Thông báo tức thì</h2>
        <div className="space-y-4">
          <ToggleRow
            id="email_reply"
            label="Có người trả lời bình luận của bạn"
            description="Nhận email khi ai đó bình luận hoặc reply vào bài bạn đã đăng."
            checked={prefs.email_reply}
            onChange={() => toggle('email_reply')}
          />
          <ToggleRow
            id="email_mention"
            label="Được nhắc đến bằng @mention"
            description="Nhận email khi ai đó dùng @username của bạn trong bình luận."
            checked={prefs.email_mention}
            onChange={() => toggle('email_mention')}
          />
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold mb-1">Email digest bài viết mới</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Nhận tóm tắt các bài viết mới trong cộng đồng.
        </p>
        <div className="flex gap-3 flex-wrap">
          {digestOptions.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setDigest(opt.value)}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                prefs.email_digest === opt.value
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-background border-border hover:bg-muted'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      <Button onClick={save} disabled={pending}>
        {pending ? 'Đang lưu…' : 'Lưu cài đặt'}
      </Button>
    </div>
  )
}

function ToggleRow({
  id, label, description, checked, onChange,
}: {
  id: string
  label: string
  description: string
  checked: boolean
  onChange: () => void
}) {
  return (
    <div className="flex items-start justify-between gap-4 p-4 rounded-lg border">
      <div>
        <Label htmlFor={id} className="text-sm font-medium cursor-pointer">{label}</Label>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={`relative shrink-0 w-10 h-6 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          checked ? 'bg-foreground' : 'bg-input'
        }`}
      >
        <span
          className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-background shadow transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}
