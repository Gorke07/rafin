'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { BookOpen, MapPin, BookMarked, TrendingUp } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface Stats {
  totalBooks: number
  totalLocations: number
  currentlyReading: number
  booksRead: number
}

interface Book {
  id: number
  title: string
  author: string
}

export default function DashboardPage() {
  const t = useTranslations('nav')
  const td = useTranslations('dashboard')
  const tc = useTranslations('common')
  const [stats, setStats] = useState<Stats>({
    totalBooks: 0,
    totalLocations: 0,
    currentlyReading: 0,
    booksRead: 0,
  })
  const [recentBooks, setRecentBooks] = useState<Book[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [statsRes, recentRes] = await Promise.all([
        fetch(`${API_URL}/api/stats/overview`, { credentials: 'include' }),
        fetch(`${API_URL}/api/stats/recent`, { credentials: 'include' }),
      ])

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
      }

      if (recentRes.ok) {
        const recentData = await recentRes.json()
        setRecentBooks(recentData.recentBooks || [])
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const statCards = [
    { label: td('totalBooks'), value: stats.totalBooks, icon: BookOpen, color: 'bg-blue-500', href: '/dashboard/books' },
    { label: td('locations'), value: stats.totalLocations, icon: MapPin, color: 'bg-green-500', href: '/dashboard/locations' },
    { label: td('currentlyReading'), value: stats.currentlyReading, icon: BookMarked, color: 'bg-orange-500', href: '/dashboard/reading' },
    { label: td('booksRead'), value: stats.booksRead, icon: TrendingUp, color: 'bg-purple-500', href: '/dashboard/reading' },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">{t('home')}</h1>
        <p className="mt-2 text-muted-foreground">
          {td('welcome')}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon, color, href }) => (
          <Link
            key={label}
            href={href}
            className="rounded-lg border bg-card p-6 shadow-sm hover:border-primary transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className={`rounded-full ${color} p-3`}>
                <Icon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold">{isLoading ? '...' : value}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">{td('recentlyAdded')}</h2>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">{tc('loading')}</p>
          ) : recentBooks.length === 0 ? (
            <p className="text-muted-foreground text-sm">{td('noBooksYet')}</p>
          ) : (
            <div className="space-y-3">
              {recentBooks.slice(0, 5).map((book) => (
                <Link
                  key={book.id}
                  href={`/dashboard/books/${book.id}`}
                  className="block p-2 rounded hover:bg-accent -mx-2"
                >
                  <p className="font-medium truncate">{book.title}</p>
                  <p className="text-sm text-muted-foreground truncate">{book.author}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">{td('currentlyReading')}</h2>
          <p className="text-muted-foreground text-sm">{td('noBooksInProgress')}</p>
        </div>
      </div>
    </div>
  )
}
