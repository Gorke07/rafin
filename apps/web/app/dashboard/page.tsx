'use client'

import { BookCoverPlaceholder } from '@/components/books/BookCoverPlaceholder'
import { PageHeader } from '@/components/dashboard/page-header'
import { ReadingCharts } from '@/components/dashboard/reading-charts'
import { ReadingGoalWidget } from '@/components/dashboard/reading-goal'
import { StatCard, StatCardSkeleton } from '@/components/dashboard/stat-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { type RecentlyViewedBook, getRecentlyViewed } from '@/hooks/use-recently-viewed'
import { BookMarked, BookOpen, Building2, MapPin, TrendingUp, User } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface Stats {
  totalBooks: number
  totalLocations: number
  currentlyReading: number
  booksRead: number
  totalAuthors: number
  totalPublishers: number
}

interface RecentBook {
  id: number
  title: string
  coverPath?: string | null
  coverUrl?: string | null
}

interface CurrentlyReadingItem {
  userBook: { status: string; currentPage: number; startedAt: string | null }
  book: RecentBook & { pageCount?: number | null }
}

export default function DashboardPage() {
  const td = useTranslations('dashboard')
  const tc = useTranslations('common')
  const [stats, setStats] = useState<Stats>({
    totalBooks: 0,
    totalLocations: 0,
    currentlyReading: 0,
    booksRead: 0,
    totalAuthors: 0,
    totalPublishers: 0,
  })
  const [recentBooks, setRecentBooks] = useState<RecentBook[]>([])
  const [currentlyReading, setCurrentlyReading] = useState<CurrentlyReadingItem[]>([])
  const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewedBook[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchData()
    setRecentlyViewed(getRecentlyViewed())
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
        setCurrentlyReading(recentData.currentlyReading || [])
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const coverSrc = (book: RecentBook) =>
    book.coverPath ? `${API_URL}${book.coverPath}` : book.coverUrl || null

  const statCards = [
    { label: td('totalBooks'), value: stats.totalBooks, icon: BookOpen, href: '/dashboard/books' },
    {
      label: td('locations'),
      value: stats.totalLocations,
      icon: MapPin,
      href: '/dashboard/locations',
    },
    {
      label: td('totalAuthors'),
      value: stats.totalAuthors,
      icon: User,
      href: '/dashboard/authors',
    },
    {
      label: td('totalPublishers'),
      value: stats.totalPublishers,
      icon: Building2,
      href: '/dashboard/publishers',
    },
    {
      label: td('currentlyReading'),
      value: stats.currentlyReading,
      icon: BookMarked,
      href: '/dashboard/reading',
    },
    {
      label: td('booksRead'),
      value: stats.booksRead,
      icon: TrendingUp,
      href: '/dashboard/reading',
    },
  ]

  return (
    <div className="space-y-8">
      <PageHeader title={td('welcome')} />

      {/* Stats grid */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <StatCardSkeleton key={i} />)
          : statCards.map((card) => (
              <StatCard
                key={card.label}
                label={card.label}
                value={card.value}
                icon={card.icon}
                href={card.href}
                isLoading={isLoading}
              />
            ))}
      </div>

      {/* Two-column sections */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Currently Reading */}
        <Card>
          <CardHeader>
            <CardTitle>{td('currentlyReading')}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-16 w-12 rounded" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : currentlyReading.length === 0 ? (
              <p className="text-sm text-muted-foreground">{td('noBooksInProgress')}</p>
            ) : (
              <div className="space-y-4">
                {currentlyReading.map((item) => {
                  const src = coverSrc(item.book)
                  const progress =
                    item.book.pageCount && item.book.pageCount > 0
                      ? Math.round((item.userBook.currentPage / item.book.pageCount) * 100)
                      : 0
                  return (
                    <Link
                      key={item.book.id}
                      href={`/dashboard/books/${item.book.id}`}
                      className="-mx-2 flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-accent"
                    >
                      <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded bg-muted">
                        {src ? (
                          <Image
                            src={src}
                            alt={item.book.title}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        ) : (
                          <BookCoverPlaceholder title={item.book.title} size="sm" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{item.book.title}</p>
                        <div className="mt-1.5">
                          <Progress value={progress} className="h-1.5" />
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {item.userBook.currentPage} / {item.book.pageCount || '?'} {tc('pages')}
                        </p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recently Added */}
        <Card>
          <CardHeader>
            <CardTitle>{td('recentlyAdded')}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-16 w-12 rounded" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                ))}
              </div>
            ) : recentBooks.length === 0 ? (
              <p className="text-sm text-muted-foreground">{td('noBooksYet')}</p>
            ) : (
              <div className="space-y-3">
                {recentBooks.slice(0, 5).map((book) => {
                  const src = coverSrc(book)
                  return (
                    <Link
                      key={book.id}
                      href={`/dashboard/books/${book.id}`}
                      className="-mx-2 flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-accent"
                    >
                      <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded bg-muted">
                        {src ? (
                          <Image
                            src={src}
                            alt={book.title}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        ) : (
                          <BookCoverPlaceholder title={book.title} size="sm" />
                        )}
                      </div>
                      <p className="min-w-0 truncate text-sm font-medium">{book.title}</p>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <ReadingGoalWidget />
      </div>

      {recentlyViewed.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{td('recentlyViewed')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {recentlyViewed.map((book) => {
                const src = coverSrc(book)
                return (
                  <Link
                    key={book.id}
                    href={`/dashboard/books/${book.id}`}
                    className="group flex w-20 shrink-0 flex-col items-center gap-1.5"
                  >
                    <div className="relative h-24 w-16 overflow-hidden rounded-md bg-muted shadow-sm transition-transform group-hover:scale-105">
                      {src ? (
                        <Image
                          src={src}
                          alt={book.title}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      ) : (
                        <BookCoverPlaceholder title={book.title} size="sm" />
                      )}
                    </div>
                    <p className="line-clamp-2 text-center text-xs leading-tight">{book.title}</p>
                  </Link>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <ReadingCharts />
    </div>
  )
}
