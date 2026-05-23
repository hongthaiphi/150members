'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch — only render after mount
  useEffect(() => setMounted(true), [])
  if (!mounted) return <div className="h-8 w-8" />

  function cycleTheme() {
    if (theme === 'light') setTheme('dark')
    else if (theme === 'dark') setTheme('system')
    else setTheme('light')
  }

  const Icon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor
  const label =
    theme === 'light' ? 'Chế độ sáng (nhấn để tối)' :
    theme === 'dark' ? 'Chế độ tối (nhấn để theo hệ thống)' :
    'Theo hệ thống (nhấn để sáng)'

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={cycleTheme}
      title={label}
      aria-label={label}
    >
      <Icon className="h-4 w-4" />
    </Button>
  )
}
