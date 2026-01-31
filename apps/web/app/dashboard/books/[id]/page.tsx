'use client'

import { BookCoverPlaceholder } from '@/components/books/BookCoverPlaceholder'
import { BookNotes } from '@/components/books/BookNotes'
import { BookQuotes } from '@/components/books/BookQuotes'
import { BookReview } from '@/components/books/BookReview'
import { QuickActions } from '@/components/books/QuickActions'
import { ReadingProgress } from '@/components/books/ReadingProgress'
import { AddToCollectionModal } from '@/components/collections/AddToCollectionModal'
import { Badge } from '@/components/ui/badge'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { addRecentlyViewed } from '@/hooks/use-recently-viewed'
import { plainTextToHtml } from '@/lib/html-utils'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import DOMPurify from 'dompurify'
import {
  BookOpen,
  Building2,
  Calendar,
  ChevronDown,
  CreditCard,
  FileText,
  Globe,
  Hash,
  Languages,
  MapPin,
  ShoppingBag,
  Store,
  Tag,
  Type,
  User,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { use, useCallback, useEffect, useRef, useState } from 'react'

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

  const fetchBook = useCallback(async () => {
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
  }, [id])

  const fetchUserBook = useCallback(async () => {
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
  }, [id])

  useEffect(() => {
    Promise.all([fetchBook(), fetchUserBook()]).finally(() => setIsLoading(false))
  }, [fetchBook, fetchUserBook])

  useEffect(() => {
    if (book) {
      addRecentlyViewed({
        id: book.id,
        title: book.title,
        coverPath: book.coverPath,
        coverUrl: book.coverUrl,
      })
    }
  }, [book])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-5 w-48" />
        <div className="flex flex-col gap-8 lg:flex-row">
          <Skeleton className="aspect-[2/3] w-full shrink-0 rounded-xl lg:w-64" />
          <div className="flex-1 space-y-4">
            <Skeleton className="h-9 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <div className="flex gap-2">
              <Skeleton className="h-7 w-20 rounded-full" />
              <Skeleton className="h-7 w-24 rounded-full" />
              <Skeleton className="h-7 w-16 rounded-full" />
            </div>
            <Skeleton className="h-px w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  if (!book) {
    return (
      <div className="space-y-4">
        <Breadcrumbs items={[{ label: t('title'), href: '/dashboard/books' }, { label: '...' }]} />
        <p className="py-8 text-center text-muted-foreground">{t('bookNotFound')}</p>
      </div>
    )
  }

  const coverSrc = book.coverPath ? `${API_URL}${book.coverPath}` : book.coverUrl || null

  const metaBadges = [
    book.pageCount && { icon: FileText, label: `${book.pageCount} ${tc('pages')}` },
    book.publishedYear && { icon: Calendar, label: String(book.publishedYear) },
    book.language && { icon: Globe, label: book.language },
    book.bindingType && { icon: BookOpen, label: bindingTypeLabels[book.bindingType] },
  ].filter(Boolean) as Array<{ icon: typeof FileText; label: string }>

  return (
    <div className="space-y-8">
      <Breadcrumbs
        items={[{ label: t('title'), href: '/dashboard/books' }, { label: book.title }]}
      />

      <div className="flex flex-col gap-8 lg:flex-row">
        <div className="mx-auto w-48 shrink-0 sm:w-56 lg:mx-0 lg:w-64">
          <div className="aspect-[2/3] w-full overflow-hidden rounded-xl border bg-muted shadow-lg">
            {coverSrc ? (
              <img src={coverSrc} alt={book.title} className="h-full w-full object-contain" />
            ) : (
              <BookCoverPlaceholder
                title={book.title}
                author={book.authors?.map((a) => a.name).join(', ')}
                size="lg"
              />
            )}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">{book.title}</h1>
            {book.originalTitle && book.originalTitle !== book.title && (
              <p className="text-base italic text-muted-foreground">{book.originalTitle}</p>
            )}
            <p className="text-lg text-muted-foreground">
              {book.authors?.map((a, i) => (
                <span key={a.id}>
                  <Link
                    href={`/dashboard/authors/${a.id}`}
                    className="font-medium text-foreground/80 underline-offset-4 hover:text-primary hover:underline"
                  >
                    {a.name}
                  </Link>
                  {i < (book.authors?.length ?? 0) - 1 && ', '}
                </span>
              )) || '\u2014'}
            </p>
          </div>

          {metaBadges.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {metaBadges.map((badge) => {
                const Icon = badge.icon
                return (
                  <span
                    key={badge.label}
                    className="inline-flex items-center gap-1.5 rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {badge.label}
                  </span>
                )
              })}
            </div>
          )}

          {((book.categories && book.categories.length > 0) ||
            (book.collections && book.collections.length > 0)) && (
            <div className="mt-4 flex flex-wrap items-center gap-1.5">
              {book.categories?.map((cat) => (
                <Badge key={`cat-${cat.id}`} variant="secondary" className="gap-1">
                  <Tag className="h-3 w-3" />
                  {cat.name}
                </Badge>
              ))}
              {book.collections?.map((col) => (
                <Link key={`col-${col.id}`} href={`/dashboard/collections/${col.id}`}>
                  <Badge variant="outline" className="cursor-pointer gap-1 hover:bg-accent">
                    {col.color && (
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: col.color }}
                      />
                    )}
                    {col.name}
                  </Badge>
                </Link>
              ))}
            </div>
          )}

          <div className="my-5 border-t" />

          <QuickActions bookId={book.id} onCollectionClick={() => setShowCollectionModal(true)} />

          <div className="mt-5">
            <ReadingProgress
              bookId={book.id}
              totalPages={book.pageCount || undefined}
              userBook={userBook}
              onUpdate={() => {
                fetchUserBook()
                fetchBook()
              }}
            />
          </div>
        </div>
      </div>

      <Tabs defaultValue="details">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="details">{t('details')}</TabsTrigger>
          <TabsTrigger value="notes">{t('notes')}</TabsTrigger>
          <TabsTrigger value="quotes">{t('quotes')}</TabsTrigger>
          <TabsTrigger value="purchase">{t('purchase')}</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6 pt-4">
          {book.description && <ExpandableDescription description={book.description} />}

          <Card>
            <CardContent>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <BookOpen className="h-5 w-5 text-primary" />
                {t('aboutThisEdition')}
              </h2>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {book.authors && book.authors.length > 0 && (
                  <IconInfoItem icon={User} label={t('author')}>
                    <div className="flex flex-wrap gap-1">
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
                    </div>
                  </IconInfoItem>
                )}
                <IconInfoItem icon={Hash} label={t('isbn')} value={book.isbn} />
                {book.publishers && book.publishers.length > 0 && (
                  <IconInfoItem icon={Building2} label={t('publisher')}>
                    <div className="flex flex-wrap gap-1">
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
                    </div>
                  </IconInfoItem>
                )}
                <IconInfoItem
                  icon={Calendar}
                  label={t('publishedYear')}
                  value={book.publishedYear?.toString()}
                />
                <IconInfoItem
                  icon={FileText}
                  label={t('pageCount')}
                  value={book.pageCount ? `${book.pageCount} ${tc('pages')}` : undefined}
                />
                <IconInfoItem icon={Languages} label={t('translator')} value={book.translator} />
                <IconInfoItem icon={Type} label={t('originalTitle')} value={book.originalTitle} />
                <IconInfoItem icon={Globe} label={t('language')} value={book.language} />
                <IconInfoItem
                  icon={BookOpen}
                  label={t('bindingType')}
                  value={book.bindingType ? bindingTypeLabels[book.bindingType] : undefined}
                />
                {book.locationId && (
                  <IconInfoItem icon={MapPin} label={t('location')}>
                    <span className="font-medium">{t('shelfNumber', { id: book.locationId })}</span>
                  </IconInfoItem>
                )}
              </dl>
            </CardContent>
          </Card>

          {book.copyNote && (
            <Card className="border-dashed">
              <CardContent>
                <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                  <FileText className="h-5 w-5 text-primary" />
                  {t('copyNote')}
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">{book.copyNote}</p>
              </CardContent>
            </Card>
          )}

          <BookReview bookId={book.id} />
        </TabsContent>

        <TabsContent value="notes" className="pt-4">
          <BookNotes bookId={book.id} />
        </TabsContent>

        <TabsContent value="quotes" className="pt-4">
          <BookQuotes bookId={book.id} />
        </TabsContent>

        <TabsContent value="purchase" className="space-y-6 pt-4">
          <Card>
            <CardContent>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <ShoppingBag className="h-5 w-5 text-primary" />
                {t('purchaseInfo')}
              </h2>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <IconInfoItem icon={Store} label={t('store')} value={book.store} />
                <IconInfoItem
                  icon={Calendar}
                  label={t('date')}
                  value={book.purchaseDate ? formatDate(book.purchaseDate) : undefined}
                />
                <IconInfoItem
                  icon={CreditCard}
                  label={t('price')}
                  value={
                    book.purchasePrice
                      ? formatCurrency(Number(book.purchasePrice), book.currency || 'TRY')
                      : undefined
                  }
                />
                <IconInfoItem icon={Globe} label={t('currency')} value={book.currency} />
              </dl>
            </CardContent>
          </Card>

          <div className="flex items-center gap-2 px-1 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{t('addedDate', { date: formatDate(book.createdAt) })}</span>
          </div>
        </TabsContent>
      </Tabs>

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

function ExpandableDescription({ description }: { description: string }) {
  const t = useTranslations('books')
  const [isExpanded, setIsExpanded] = useState(false)
  const [needsTruncation, setNeedsTruncation] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (contentRef.current) {
      setNeedsTruncation(contentRef.current.scrollHeight > 128)
    }
  }, [])

  return (
    <Card>
      <CardContent>
        <h2 className="mb-3 text-lg font-semibold">{t('description')}</h2>
        <div className="relative">
          <div
            ref={contentRef}
            className={cn(
              'overflow-hidden transition-all duration-300',
              !isExpanded && needsTruncation && 'max-h-32',
            )}
          >
            <SafeHtml
              html={plainTextToHtml(description)}
              className="prose prose-sm max-w-none text-muted-foreground dark:prose-invert"
            />
          </div>
          {needsTruncation && !isExpanded && (
            <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-card to-transparent" />
          )}
        </div>
        {needsTruncation && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-2 h-auto px-0 text-xs font-medium text-primary hover:bg-transparent"
          >
            {isExpanded ? t('readLess') : t('readMore')}
            <ChevronDown
              className={cn(
                'ml-1 h-3.5 w-3.5 transition-transform duration-200',
                isExpanded && 'rotate-180',
              )}
            />
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

function IconInfoItem({
  icon: Icon,
  label,
  value,
  children,
}: {
  icon: typeof FileText
  label: string
  value?: string | null
  children?: React.ReactNode
}) {
  if (!value && !children) return null

  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="mt-0.5 text-sm font-medium">{children || value}</dd>
      </div>
    </div>
  )
}

/**
 * Renders sanitized HTML content safely using DOMPurify.
 * Only used for book descriptions that may contain formatting.
 */
function SafeHtml({ html, className }: { html: string; className?: string }) {
  const sanitized = typeof window !== 'undefined' ? DOMPurify.sanitize(html) : html
  // biome-ignore lint/security/noDangerouslySetInnerHtml: content is sanitized via DOMPurify
  return <div className={className} dangerouslySetInnerHTML={{ __html: sanitized }} />
}
