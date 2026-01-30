'use client'

import { BookNotes } from '@/components/books/BookNotes'
import { QuickActions } from '@/components/books/QuickActions'
import { ReadingProgress } from '@/components/books/ReadingProgress'
import { AddToCollectionModal } from '@/components/collections/AddToCollectionModal'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { plainTextToHtml } from '@/lib/html-utils'
import { formatCurrency, formatDate } from '@/lib/utils'
import DOMPurify from 'dompurify'
import { ArrowLeft, Book, Calendar, Image as ImageIcon, Loader2, MapPin, Tag } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { use, useEffect, useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface Book {
  id: number
  title: string
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
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!book) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard/books"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
          {t('backToBooks')}
        </Link>
        <p className="text-center text-muted-foreground py-8">{t('bookNotFound')}</p>
      </div>
    )
  }

  const coverSrc = book.coverPath ? `${API_URL}${book.coverPath}` : book.coverUrl || null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/books" className="rounded-md p-2 hover:bg-accent">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{book.title}</h1>
          <p className="text-lg text-muted-foreground">
            {book.authors?.map((a) => a.name).join(', ') || '\u2014'}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <QuickActions bookId={book.id} onCollectionClick={() => setShowCollectionModal(true)} />

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
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

          {/* Tags */}
          {book.categories && book.categories.length > 0 && (
            <div className="rounded-lg border bg-card p-4 space-y-2">
              <h3 className="flex items-center gap-2 font-semibold text-sm">
                <Tag className="h-4 w-4" />
                {t('categories')}
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {book.categories.map((cat) => (
                  <span
                    key={cat.id}
                    className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium"
                  >
                    {cat.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Collections */}
          {book.collections && book.collections.length > 0 && (
            <div className="rounded-lg border bg-card p-4 space-y-2">
              <h3 className="flex items-center gap-2 font-semibold text-sm">
                <Book className="h-4 w-4" />
                {t('collections')}
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {book.collections.map((col) => (
                  <Link
                    key={col.id}
                    href={`/dashboard/collections/${col.id}`}
                    className="flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium hover:bg-accent"
                  >
                    {col.color && (
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: col.color }}
                      />
                    )}
                    {col.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Content */}
        <div>
          <Tabs defaultValue="details">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="details">{t('details')}</TabsTrigger>
              <TabsTrigger value="notes">{t('notes')}</TabsTrigger>
              <TabsTrigger value="purchase">{t('purchase')}</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-6 pt-4">
              {/* Description */}
              {book.description && (
                <div className="rounded-lg border bg-card p-6">
                  <h2 className="mb-3 text-lg font-semibold">{t('description')}</h2>
                  <SafeHtml
                    html={plainTextToHtml(book.description)}
                    className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground"
                  />
                </div>
              )}

              {/* Book Info Grid */}
              <div className="rounded-lg border bg-card p-6">
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
              </div>

              {/* Copy Note */}
              {book.copyNote && (
                <div className="rounded-lg border bg-card p-6">
                  <h2 className="mb-3 text-lg font-semibold">{t('copyNote')}</h2>
                  <p className="text-sm text-muted-foreground">{book.copyNote}</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="notes" className="pt-4">
              <BookNotes bookId={book.id} />
            </TabsContent>

            <TabsContent value="purchase" className="space-y-6 pt-4">
              <div className="rounded-lg border bg-card p-6">
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
              </div>

              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{t('addedDate', { date: formatDate(book.createdAt) })}</span>
                </div>
              </div>
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
