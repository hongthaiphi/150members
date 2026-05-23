'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, Mail, FileText, Settings, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/members', label: 'Thành viên', icon: Users },
  { href: '/admin/invite', label: 'Mời thành viên', icon: Mail },
  { href: '/admin/content', label: 'Kiểm duyệt nội dung', icon: FileText },
  { href: '/admin/settings', label: 'Cài đặt cộng đồng', icon: Settings },
]

export function AdminNav() {
  const pathname = usePathname()

  return (
    <aside className="w-56 border-r flex flex-col shrink-0 h-full">
      <div className="h-14 flex items-center px-4 border-b shrink-0">
        <span className="font-bold text-sm">Admin Panel</span>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link key={href} href={href}>
              <Button
                variant={isActive ? 'secondary' : 'ghost'}
                className="w-full justify-start gap-2"
                size="sm"
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="text-left">{label}</span>
              </Button>
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t shrink-0">
        <Link href="/">
          <Button variant="ghost" className="w-full justify-start gap-2" size="sm">
            <ArrowLeft className="h-4 w-4" />
            Về trang chủ
          </Button>
        </Link>
      </div>
    </aside>
  )
}
