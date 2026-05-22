import { Globe, Link } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type SocialLinks = {
  twitter?: string
  linkedin?: string
  website?: string
  github?: string
}

const items: Array<{
  key: keyof SocialLinks
  icon: LucideIcon
  label: string
  prefix: string
}> = [
  { key: 'twitter', icon: Link, label: 'Twitter / X', prefix: 'https://twitter.com/' },
  { key: 'linkedin', icon: Link, label: 'LinkedIn', prefix: 'https://linkedin.com/in/' },
  { key: 'github', icon: Link, label: 'GitHub', prefix: 'https://github.com/' },
  { key: 'website', icon: Globe, label: 'Website', prefix: '' },
]

function buildHref(key: keyof SocialLinks, value: string, prefix: string): string | null {
  if (key === 'website') {
    try {
      const url = new URL(value)
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
      return value
    } catch {
      return null
    }
  }
  // For handles (twitter, linkedin, github): always prepend prefix to prevent open redirect
  return `${prefix}${value}`
}

export function SocialLinks({ links }: { links: SocialLinks }) {
  const active = items.filter(({ key }) => links[key])
  if (active.length === 0) return null

  return (
    <div className="flex items-center gap-3">
      {active.map(({ key, icon: Icon, label, prefix }) => {
        const value = links[key]!
        const href = buildHref(key, value, prefix)
        if (!href) return null
        return (
          <a
            key={key}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            title={label}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </a>
        )
      })}
    </div>
  )
}
