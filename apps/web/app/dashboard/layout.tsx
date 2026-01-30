'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, Building2, Home, MapPin, BookMarked, Library, Settings, LogOut, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations('nav')
  const pathname = usePathname()

  const navItems = [
    { href: '/dashboard', label: t('home'), icon: Home },
    { href: '/dashboard/books', label: t('books'), icon: BookOpen },
    { href: '/dashboard/authors', label: t('authors'), icon: User },
    { href: '/dashboard/publishers', label: t('publishers'), icon: Building2 },
    { href: '/dashboard/collections', label: t('collections'), icon: Library },
    { href: '/dashboard/locations', label: t('locations'), icon: MapPin },
    { href: '/dashboard/reading', label: t('reading'), icon: BookMarked },
    { href: '/dashboard/settings', label: t('settings'), icon: Settings },
  ]

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href)

  const handleLogout = async () => {
    await fetch(`${API_URL}/api/auth/sign-out`, {
      method: 'POST',
      credentials: 'include',
    })
    window.location.href = '/login'
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r bg-card p-4 flex flex-col">
        <h1 className="mb-8 text-2xl font-bold">Rafin</h1>
        <nav className="space-y-1 flex-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 transition-colors',
                isActive(href)
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent',
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          ))}
        </nav>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 rounded-md px-3 py-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <LogOut className="h-5 w-5" />
          {t('logout')}
        </button>
      </aside>
      <main className="flex-1 p-8 bg-background">{children}</main>
    </div>
  )
}
