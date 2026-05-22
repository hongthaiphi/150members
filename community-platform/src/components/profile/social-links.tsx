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

export function SocialLinks({ links }: { links: SocialLinks }) {
  const active = items.filter(({ key }) => links[key])
  if (active.length === 0) return null

  return (
    <div className="flex items-center gap-3">
      {active.map(({ key, icon: Icon, label, prefix }) => {
        const value = links[key]!
        const href = value.startsWith('http') ? value : `${prefix}${value}`
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
