'use client'

import { BookCoverPlaceholder } from '@/components/books/BookCoverPlaceholder'
import { EmptyState } from '@/components/dashboard/empty-state'
import { PageHeader } from '@/components/dashboard/page-header'
import { ReadingPageCharts } from '@/components/reading/reading-page-charts'
import { ReadingStats } from '@/components/reading/reading-stats'
import { ReadingTimeline } from '@/components/reading/reading-timeline'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BookMarked, BookOpen, CheckCircle, Search, XCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

type ReadingStatus = 'reading' | 'tbr' | 'completed' | 'dnf'

interface UserBookWithBook {
  userBook: {
    status: string
    currentPage: number
    startedAt: string | null
    finishedAt: string | null
    createdAt: string
  }
  book: {
    id: number
    title: string
    coverPath?: string | null
    coverUrl?: string | null
    pageCount?: number | null
  }
}

interface ReadingStatsData {
  totalPagesRead: number
  booksThisYear: number
  avgDaysToFinish: number | null
  currentlyReading: number
  monthlyPages: Array<{ month: string; pages: number }>
  categoryBreakdown: Array<{ name: string; count: number }>
  timeline: Array<{
    bookId: number
    title: string
    coverPath: string | null
    coverUrl: string | null
    pageCount: number | null
    status: string
    startedAt: string | null
    finishedAt: string | null
  }>
  readingGoal: { targetBooks: number; completedBooks: number } | null
}

export default function ReadingPage() {
  const t = useTranslations('reading')
  const tc = useTranslations('common')
  const [activeTab, setActiveTab] = useState<ReadingStatus>('reading')
  const [userBooks, setUserBooks] = useState<UserBookWithBook[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statsData, setStatsData] = useState<ReadingStatsData | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  const fetchBooks = useCallback(async (status: ReadingStatus) => {
    setIsLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/user-books?status=${status}`, {
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        setUserBooks(data.userBooks || [])
      }
    } catch (error) {
      console.error('Failed to fetch reading list:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/stats/reading`, {
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        setStatsData(data)
      }
    } catch (error) {
      console.error('Failed to fetch reading stats:', error)
    } finally {
      setStatsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBooks(activeTab)
  }, [activeTab, fetchBooks])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const coverSrc = (book: UserBookWithBook['book']) =>
    book.coverPath ? `${API_URL}${book.coverPath}` : book.coverUrl || null

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleDateString()
  }

  const statusLabels: Record<ReadingStatus, string> = {
    reading: t('reading'),
    tbr: t('tbr'),
    completed: t('completed'),
    dnf: t('dnf'),
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} />

      {/* Stats Cards */}
      {statsLoading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-1">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : statsData ? (
        <ReadingStats
          booksThisYear={statsData.booksThisYear}
          totalPagesRead={statsData.totalPagesRead}
          currentlyReading={statsData.currentlyReading}
          avgDaysToFinish={statsData.avgDaysToFinish}
          readingGoal={statsData.readingGoal}
        />
      ) : null}

      {/* Main content: Charts + Tabs | Timeline sidebar */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Charts */}
          {statsLoading ? (
            <div className="grid gap-6 md:grid-cols-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <Card key={i}>
                  <CardContent>
                    <Skeleton className="h-[240px] w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : statsData ? (
            <ReadingPageCharts
              monthlyPages={statsData.monthlyPages}
              categoryBreakdown={statsData.categoryBreakdown}
            />
          ) : null}

          {/* Tabs: book lists */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ReadingStatus)}>
            <TabsList variant="line">
              <TabsTrigger value="reading">
                <BookOpen className="h-4 w-4" />
                {t('reading')}
              </TabsTrigger>
              <TabsTrigger value="tbr">
                <BookMarked className="h-4 w-4" />
                {t('tbr')}
              </TabsTrigger>
              <TabsTrigger value="completed">
                <CheckCircle className="h-4 w-4" />
                {t('completed')}
              </TabsTrigger>
              <TabsTrigger value="dnf">
                <XCircle className="h-4 w-4" />
                {t('dnf')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              {isLoading ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i}>
                      <CardContent className="flex gap-4">
                        <Skeleton className="h-24 w-16 shrink-0 rounded" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                          <Skeleton className="mt-2 h-2 w-full" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : userBooks.length === 0 ? (
                <EmptyState
                  icon={BookMarked}
                  title={t('noBooksInTab')}
                  description={t('noBooksInTabHint', { status: statusLabels[activeTab] })}
                  action={
                    <Button variant="outline" asChild>
                      <Link href="/dashboard/books">
                        <Search className="h-4 w-4" />
                        {t('goToBooks')}
                      </Link>
                    </Button>
                  }
                />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {userBooks.map((item) => {
                    const src = coverSrc(item.book)
                    return (
                      <Link key={item.book.id} href={`/dashboard/books/${item.book.id}`}>
                        <Card className="h-full transition-colors hover:bg-accent/50">
                          <CardContent className="flex gap-4">
                            <div className="h-24 w-16 shrink-0 overflow-hidden rounded bg-muted">
                              {src ? (
                                <img
                                  src={src}
                                  alt={item.book.title}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <BookCoverPlaceholder title={item.book.title} size="sm" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="line-clamp-2 text-sm font-medium">
                                {item.book.title}
                              </h3>

                              {activeTab === 'reading' && (
                                <div className="mt-2">
                                  <Progress
                                    value={
                                      item.book.pageCount && item.book.pageCount > 0
                                        ? (item.userBook.currentPage / item.book.pageCount) * 100
                                        : 0
                                    }
                                    className="h-1.5"
                                  />
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {t('pageOf', {
                                      current: item.userBook.currentPage,
                                      total: item.book.pageCount || '?',
                                    })}
                                  </p>
                                  {item.userBook.startedAt && (
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                      {t('startedAt', {
                                        date: formatDate(item.userBook.startedAt),
                                      })}
                                    </p>
                                  )}
                                </div>
                              )}

                              {activeTab === 'tbr' && item.userBook.createdAt && (
                                <p className="mt-2 text-xs text-muted-foreground">
                                  {formatDate(item.userBook.createdAt)}
                                </p>
                              )}

                              {activeTab === 'completed' && (
                                <div className="mt-2 space-y-0.5">
                                  {item.userBook.finishedAt && (
                                    <p className="text-xs text-muted-foreground">
                                      {t('finishedAt', {
                                        date: formatDate(item.userBook.finishedAt),
                                      })}
                                    </p>
                                  )}
                                  {item.book.pageCount && (
                                    <p className="text-xs text-muted-foreground">
                                      {item.book.pageCount} {tc('pages')}
                                    </p>
                                  )}
                                </div>
                              )}

                              {activeTab === 'dnf' && item.userBook.currentPage > 0 && (
                                <p className="mt-2 text-xs text-muted-foreground">
                                  {t('pageOf', {
                                    current: item.userBook.currentPage,
                                    total: item.book.pageCount || '?',
                                  })}
                                </p>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    )
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Timeline sidebar */}
        <div>
          {statsLoading ? (
            <Card>
              <CardContent>
                <Skeleton className="h-[300px] w-full" />
              </CardContent>
            </Card>
          ) : statsData ? (
            <ReadingTimeline timeline={statsData.timeline} />
          ) : null}
        </div>
      </div>
    </div>
  )
}
