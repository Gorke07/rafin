'use client'

import { BookCoverPlaceholder } from '@/components/books/BookCoverPlaceholder'
import { EmptyState } from '@/components/dashboard/empty-state'
import { PageHeader } from '@/components/dashboard/page-header'
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

export default function ReadingPage() {
  const t = useTranslations('reading')
  const tc = useTranslations('common')
  const [activeTab, setActiveTab] = useState<ReadingStatus>('reading')
  const [userBooks, setUserBooks] = useState<UserBookWithBook[]>([])
  const [isLoading, setIsLoading] = useState(true)

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

  useEffect(() => {
    fetchBooks(activeTab)
  }, [activeTab, fetchBooks])

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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                          <h3 className="line-clamp-2 text-sm font-medium">{item.book.title}</h3>

                          {/* Reading tab: progress bar */}
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
                                  {t('startedAt', { date: formatDate(item.userBook.startedAt) })}
                                </p>
                              )}
                            </div>
                          )}

                          {/* TBR tab: added date */}
                          {activeTab === 'tbr' && item.userBook.createdAt && (
                            <p className="mt-2 text-xs text-muted-foreground">
                              {formatDate(item.userBook.createdAt)}
                            </p>
                          )}

                          {/* Completed tab: finished date + total pages */}
                          {activeTab === 'completed' && (
                            <div className="mt-2 space-y-0.5">
                              {item.userBook.finishedAt && (
                                <p className="text-xs text-muted-foreground">
                                  {t('finishedAt', { date: formatDate(item.userBook.finishedAt) })}
                                </p>
                              )}
                              {item.book.pageCount && (
                                <p className="text-xs text-muted-foreground">
                                  {item.book.pageCount} {tc('pages')}
                                </p>
                              )}
                            </div>
                          )}

                          {/* DNF tab: stopped page */}
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
  )
}
