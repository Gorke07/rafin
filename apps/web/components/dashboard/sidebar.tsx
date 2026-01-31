'use client'

import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  BookMarked,
  BookOpen,
  Building2,
  ChevronsLeft,
  ChevronsRight,
  Home,
  Library,
  LogOut,
  MapPin,
  Menu,
  Settings,
  Tag,
  User,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'

const STORAGE_KEY = 'sidebar-collapsed'
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface SidebarContextValue {
  isCollapsed: boolean
  toggleCollapse: () => void
  isMobileOpen: boolean
  setMobileOpen: (v: boolean) => void
}

const SidebarContext = createContext<SidebarContextValue>({
  isCollapsed: false,
  toggleCollapse: () => {},
  isMobileOpen: false,
  setMobileOpen: () => {},
})

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'true') setIsCollapsed(true)
  }, [])

  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev
      localStorage.setItem(STORAGE_KEY, String(next))
      return next
    })
  }, [])

  return (
    <SidebarContext.Provider value={{ isCollapsed, toggleCollapse, isMobileOpen, setMobileOpen }}>
      {children}
    </SidebarContext.Provider>
  )
}

function useNavItems() {
  const t = useTranslations('nav')
  return [
    { href: '/dashboard', label: t('home'), icon: Home },
    { href: '/dashboard/books', label: t('books'), icon: BookOpen },
    { href: '/dashboard/authors', label: t('authors'), icon: User },
    { href: '/dashboard/publishers', label: t('publishers'), icon: Building2 },
    { href: '/dashboard/collections', label: t('collections'), icon: Library },
    { href: '/dashboard/categories', label: t('categories'), icon: Tag },
    { href: '/dashboard/locations', label: t('locations'), icon: MapPin },
    { href: '/dashboard/reading', label: t('reading'), icon: BookMarked },
    { href: '/dashboard/settings', label: t('settings'), icon: Settings },
  ]
}

function useIsActive() {
  const pathname = usePathname()
  return (href: string) => (href === '/dashboard' ? pathname === href : pathname.startsWith(href))
}

function useLogout() {
  const t = useTranslations('nav')
  const handleLogout = async () => {
    await fetch(`${API_URL}/api/auth/sign-out`, {
      method: 'POST',
      credentials: 'include',
    })
    window.location.href = '/login'
  }
  return { handleLogout, logoutLabel: t('logout') }
}

export function Sidebar() {
  const { isCollapsed, toggleCollapse } = useContext(SidebarContext)
  const t = useTranslations('common')
  const navItems = useNavItems()
  const isActive = useIsActive()
  const { handleLogout, logoutLabel } = useLogout()

  return (
    <aside
      className={cn(
        'hidden flex-col border-r bg-card transition-[width] duration-200 lg:flex',
        isCollapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          'flex h-14 items-center border-b px-4',
          isCollapsed ? 'justify-center' : 'justify-between',
        )}
      >
        {!isCollapsed && (
          <Link href="/dashboard" className="text-xl font-bold">
            Rafin
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={toggleCollapse}
          aria-label={isCollapsed ? t('expand') : t('collapse')}
        >
          {isCollapsed ? (
            <ChevronsRight className="h-4 w-4" />
          ) : (
            <ChevronsLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          const link = (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                active
                  ? 'border-l-2 border-primary bg-accent text-accent-foreground'
                  : 'hover:bg-accent',
                isCollapsed && 'justify-center px-0',
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!isCollapsed && label}
            </Link>
          )

          if (isCollapsed) {
            return (
              <Tooltip key={href}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right">{label}</TooltipContent>
              </Tooltip>
            )
          }

          return link
        })}
      </nav>

      {/* Footer */}
      <div className="border-t p-2">
        {isCollapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center justify-center rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{logoutLabel}</TooltipContent>
          </Tooltip>
        ) : (
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <LogOut className="h-5 w-5" />
            {logoutLabel}
          </button>
        )}
      </div>
    </aside>
  )
}

export function MobileHeader() {
  const { setMobileOpen } = useContext(SidebarContext)
  const t = useTranslations('common')

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-card px-4 lg:hidden">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => setMobileOpen(true)}
        aria-label={t('menu')}
      >
        <Menu className="h-5 w-5" />
      </Button>
      <Link href="/dashboard" className="text-lg font-bold">
        Rafin
      </Link>
    </header>
  )
}

export function MobileSidebar() {
  const { isMobileOpen, setMobileOpen } = useContext(SidebarContext)
  const navItems = useNavItems()
  const isActive = useIsActive()
  const { handleLogout, logoutLabel } = useLogout()
  const pathname = usePathname()

  useEffect(() => {
    if (pathname) setMobileOpen(false)
  }, [pathname, setMobileOpen])

  return (
    <Sheet open={isMobileOpen} onOpenChange={setMobileOpen}>
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="border-b px-4">
          <SheetTitle className="text-left text-xl font-bold">Rafin</SheetTitle>
        </SheetHeader>

        <nav className="flex-1 space-y-1 p-2">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                isActive(href)
                  ? 'border-l-2 border-primary bg-accent text-accent-foreground'
                  : 'hover:bg-accent',
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="border-t p-2">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <LogOut className="h-5 w-5" />
            {logoutLabel}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
