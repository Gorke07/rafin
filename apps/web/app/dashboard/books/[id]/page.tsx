'use client'

import { use, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import DOMPurify from 'dompurify'
import { ArrowLeft, Book, Calendar, Image as ImageIcon, MapPin, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BookNotes } from '@/components/books/BookNotes'
import { QuickActions } from '@/components/books/QuickActions'
import { ReadingProgress } from '@/components/books/ReadingProgress'
import { AddToCollectionModal } from '@/components/collections/AddToCollectionModal'
import { plainTextToHtml } from '@/lib/html-utils'
import { formatCurrency, formatDate } from '@/lib/utils'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface Book {
  id: number
  title: string
  originalTitle?: string | null
  authors?: Array<{ id: number; name: string }>
  publishers?: Array<{ id: number; name: string }>
  isbn?: string | null
  publishedYear?: number | null
  pageCount?: number | null
  translator?: string | null
  description?: string | null
  language?: string | null
  bindingType?: string | null
  coverPath?: string | null
  coverUrl?: string | null
  purchaseDate?: string | null
  purchasePrice?: string | null
  currency?: string | null
  store?: string | null
  copyNote?: string | null
  locationId?: number | null
  createdAt: string
  categories?: Array<{ id: number; name: string; slug: string }>
  collections?: Array<{ id: number; name: string; color: string | null }>
}

interface UserBook {
  id: number
  status: 'tbr' | 'reading' | 'completed' | 'dnf'
  currentPage: number
  startedAt?: string | null
  finishedAt?: string | null
}

export default function BookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const t = useTranslations('books')
  const tc = useTranslations('common')

  const bindingTypeLabels: Record<string, string> = {
    paperback: t('paperback'),
    hardcover: t('hardcover'),
    ebook: t('ebook'),
  }

  const [book, setBook] = useState<Book | null>(null)
  const [userBook, setUserBook] = useState<UserBook | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showCollectionModal, setShowCollectionModal] = useState(false)

  const fetchBook = async () => {
    try {
      const response = await fetch(`${API_URL}/api/books/${id}`, {
        credentials: 'include',
      })
      const data = await response.json()
      if (data.book) {
        setBook(data.book)
      }
    } catch (err) {
      console.error('Failed to fetch book:', err)
    }
  }

  const fetchUserBook = async () => {
    try {
      const response = await fetch(`${API_URL}/api/user-books?bookId=${id}`, {
        credentials: 'include',
      })
      const data = await response.json()
      if (data.userBooks && data.userBooks.length > 0) {
        setUserBook(data.userBooks[0])
      }
    } catch {
      // User might not have this book in their list yet
    }
  }

  useEffect(() => {
    Promise.all([fetchBook(), fetchUserBook()]).finally(() => setIsLoading(false))
  }, [id])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-md" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-5 w-40" />
          </div>
        </div>
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[280px_1fr]">
          <div className="space-y-6">
            <Skeleton className="aspect-[2/3] w-full rounded-lg" />
            <Skeleton className="h-48 w-full rounded-lg" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        </div>
      </div>
    )
  }

  if (!book) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/books">
            <ArrowLeft className="h-4 w-4" />
            {t('backToBooks')}
          </Link>
        </Button>
        <p className="py-8 text-center text-muted-foreground">{t('bookNotFound')}</p>
      </div>
    )
  }

  const coverSrc = book.coverPath ? `${API_URL}${book.coverPath}` : book.coverUrl || null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/books">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{book.title}</h1>
          <p className="text-lg text-muted-foreground">
            {book.authors?.map((a) => a.name).join(', ') || '\u2014'}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <QuickActions bookId={book.id} onCollectionClick={() => setShowCollectionModal(true)} />

      {/* Main Content */}
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[280px_1fr]">
        {/* Left Sidebar */}
        <div className="space-y-6">
          {/* Cover */}
          <div className="aspect-[2/3] w-full overflow-hidden rounded-lg border bg-muted">
            {coverSrc ? (
              <img src={coverSrc} alt={book.title} className="h-full w-full object-contain" />
            ) : (
              <div className="flex h-full items-center justify-center">
                <ImageIcon className="h-16 w-16 text-muted-foreground/30" />
              </div>
            )}
          </div>

          {/* Reading Progress */}
          <ReadingProgress
            bookId={book.id}
            totalPages={book.pageCount || undefined}
            userBook={userBook}
            onUpdate={() => {
              fetchUserBook()
              fetchBook()
            }}
          />

          {/* Categories */}
          {book.categories && book.categories.length > 0 && (
            <Card>
              <CardContent className="space-y-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <Tag className="h-4 w-4" />
                  {t('categories')}
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {book.categories.map((cat) => (
                    <Badge key={cat.id} variant="secondary">
                      {cat.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Collections */}
          {book.collections && book.collections.length > 0 && (
            <Card>
              <CardContent className="space-y-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <Book className="h-4 w-4" />
                  {t('collections')}
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {book.collections.map((col) => (
                    <Link key={col.id} href={`/dashboard/collections/${col.id}`}>
                      <Badge variant="outline" className="cursor-pointer hover:bg-accent">
                        {col.color && (
                          <span
                            className="mr-1.5 h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: col.color }}
                          />
                        )}
                        {col.name}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Content */}
        <div>
          <Tabs defaultValue="details">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">{t('details')}</TabsTrigger>
              <TabsTrigger value="notes">{t('notes')}</TabsTrigger>
              <TabsTrigger value="purchase">{t('purchase')}</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-6 pt-4">
              {/* Description */}
              {book.description && (
                <Card>
                  <CardContent>
                    <h2 className="mb-3 text-lg font-semibold">{t('description')}</h2>
                    <SafeHtml
                      html={plainTextToHtml(book.description)}
                      className="prose prose-sm max-w-none text-muted-foreground dark:prose-invert"
                    />
                  </CardContent>
                </Card>
              )}

              {/* Book Info Grid */}
              <Card>
                <CardContent>
                  <h2 className="mb-4 text-lg font-semibold">{t('bookInfo')}</h2>
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                    {book.authors && book.authors.length > 0 && (
                      <div>
                        <dt className="text-sm text-muted-foreground">{t('author')}</dt>
                        <dd className="mt-0.5 flex flex-wrap gap-1">
                          {book.authors.map((a, i) => (
                            <span key={a.id}>
                              <Link
                                href={`/dashboard/authors/${a.id}`}
                                className="font-medium hover:text-primary"
                              >
                                {a.name}
                              </Link>
                              {i < book.authors!.length - 1 && ', '}
                            </span>
                          ))}
                        </dd>
                      </div>
                    )}
                    <InfoItem label={t('isbn')} value={book.isbn} />
                    {book.publishers && book.publishers.length > 0 && (
                      <div>
                        <dt className="text-sm text-muted-foreground">{t('publisher')}</dt>
                        <dd className="mt-0.5 flex flex-wrap gap-1">
                          {book.publishers.map((p, i) => (
                            <span key={p.id}>
                              <Link
                                href={`/dashboard/publishers/${p.id}`}
                                className="font-medium hover:text-primary"
                              >
                                {p.name}
                              </Link>
                              {i < book.publishers!.length - 1 && ', '}
                            </span>
                          ))}
                        </dd>
                      </div>
                    )}
                    <InfoItem label={t('publishedYear')} value={book.publishedYear?.toString()} />
                    <InfoItem
                      label={t('pageCount')}
                      value={book.pageCount ? `${book.pageCount} ${tc('pages')}` : undefined}
                    />
                    <InfoItem label={t('translator')} value={book.translator} />
                    <InfoItem label={t('originalTitle')} value={book.originalTitle} />
                    <InfoItem label={t('language')} value={book.language} />
                    <InfoItem
                      label={t('bindingType')}
                      value={book.bindingType ? bindingTypeLabels[book.bindingType] : undefined}
                    />
                    {book.locationId && (
                      <div>
                        <dt className="text-sm text-muted-foreground">{t('location')}</dt>
                        <dd className="mt-0.5 flex items-center gap-1 font-medium">
                          <MapPin className="h-4 w-4" />
                          {t('shelfNumber', { id: book.locationId })}
                        </dd>
                      </div>
                    )}
                  </dl>
                </CardContent>
              </Card>

              {/* Copy Note */}
              {book.copyNote && (
                <Card>
                  <CardContent>
                    <h2 className="mb-3 text-lg font-semibold">{t('copyNote')}</h2>
                    <p className="text-sm text-muted-foreground">{book.copyNote}</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="notes" className="pt-4">
              <BookNotes bookId={book.id} />
            </TabsContent>

            <TabsContent value="purchase" className="space-y-6 pt-4">
              <Card>
                <CardContent>
                  <h2 className="mb-4 text-lg font-semibold">{t('purchaseInfo')}</h2>
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                    <InfoItem label={t('store')} value={book.store} />
                    <InfoItem
                      label={t('date')}
                      value={book.purchaseDate ? formatDate(book.purchaseDate) : undefined}
                    />
                    <InfoItem
                      label={t('price')}
                      value={
                        book.purchasePrice
                          ? formatCurrency(Number(book.purchasePrice), book.currency || 'TRY')
                          : undefined
                      }
                    />
                    <InfoItem label={t('currency')} value={book.currency} />
                  </dl>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{t('addedDate', { date: formatDate(book.createdAt) })}</span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Collection Modal */}
      <AddToCollectionModal
        bookId={book.id}
        isOpen={showCollectionModal}
        onClose={() => setShowCollectionModal(false)}
        onAdded={() => fetchBook()}
        currentCollections={book.collections?.map((c) => c.id) || []}
      />
    </div>
  )
}

/**
 * Renders sanitized HTML content safely using DOMPurify.
 * Only used for book descriptions that may contain formatting.
 */
function SafeHtml({ html, className }: { html: string; className?: string }) {
  const sanitized = typeof window !== 'undefined' ? DOMPurify.sanitize(html) : html
  return <div className={className} dangerouslySetInnerHTML={{ __html: sanitized }} />
}

function InfoItem({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null

  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  )
}
