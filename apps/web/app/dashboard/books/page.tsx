'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import {
  Plus,
  Search,
  BookOpen,
  LayoutGrid,
  List,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/dashboard/page-header'
import { EmptyState } from '@/components/dashboard/empty-state'
import { BookCard, BookCardSkeleton } from '@/components/dashboard/book-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

type ViewMode = 'card' | 'table'
type SortField = 'title' | 'authorNames' | 'publishedYear' | 'createdAt' | 'pageCount'
type SortDir = 'asc' | 'desc'

interface Book {
  id: number
  title: string
  authorNames: string
  isbn: string | null
  publishedYear: number | null
  pageCount: number | null
  coverPath: string | null
  coverUrl: string | null
  language: string | null
  bindingType: string | null
  createdAt: string
}

function getCoverSrc(book: Book): string | null {
  if (book.coverPath) return `${API_URL}${book.coverPath}`
  if (book.coverUrl) return book.coverUrl
  return null
}

export default function BooksPage() {
  const t = useTranslations('books')
  const [searchQuery, setSearchQuery] = useState('')
  const [books, setBooks] = useState<Book[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [view, setView] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('books-view') as ViewMode) || 'card'
    }
    return 'card'
  })
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  useEffect(() => {
    fetchBooks()
  }, [])

  useEffect(() => {
    localStorage.setItem('books-view', view)
  }, [view])

  const fetchBooks = async (search?: string) => {
    try {
      const url = search
        ? `${API_URL}/api/books?search=${encodeURIComponent(search)}`
        : `${API_URL}/api/books`
      const response = await fetch(url, { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        setBooks(data.books)
      }
    } catch (error) {
      console.error('Failed to fetch books:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchBooks(searchQuery)
  }

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const sorted = [...books].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1
    const av = a[sortField]
    const bv = b[sortField]
    if (av == null && bv == null) return 0
    if (av == null) return 1
    if (bv == null) return -1
    if (typeof av === 'string') return av.localeCompare(bv as string) * dir
    return ((av as number) - (bv as number)) * dir
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        description={!isLoading && books.length > 0 ? t('bookCount', { count: books.length }) : undefined}
      >
        <Button asChild>
          <Link href="/dashboard/books/new">
            <Plus className="h-4 w-4" />
            {t('addBook')}
          </Link>
        </Button>
      </PageHeader>

      {/* Toolbar: search + view toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearch} className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t('search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </form>

        <div className="flex items-center gap-1 rounded-md border bg-muted/40 p-1">
          <Button
            variant={view === 'card' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('card')}
          >
            <LayoutGrid className="h-4 w-4" />
            {t('cardView')}
          </Button>
          <Button
            variant={view === 'table' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('table')}
          >
            <List className="h-4 w-4" />
            {t('tableView')}
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        view === 'card' ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <BookCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <Card>
            <div className="p-4 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-7 rounded" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="hidden h-4 w-16 md:block" />
                </div>
              ))}
            </div>
          </Card>
        )
      ) : books.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={t('noBooks')}
          description={t('startWithFirstBook')}
          action={
            <Button asChild>
              <Link href="/dashboard/books/new">
                <Plus className="h-4 w-4" />
                {t('addBook')}
              </Link>
            </Button>
          }
        />
      ) : view === 'card' ? (
        <CardView books={sorted} />
      ) : (
        <TableView books={sorted} sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
      )}
    </div>
  )
}

/* ────────────────────────────────────────────
   Card View
   ──────────────────────────────────────────── */

function CardView({ books }: { books: Book[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {books.map((book) => (
        <BookCard
          key={book.id}
          book={{
            id: book.id,
            title: book.title,
            authorNames: book.authorNames,
            coverPath: book.coverPath,
            coverUrl: book.coverUrl,
            publishedYear: book.publishedYear,
            pageCount: book.pageCount,
          }}
        />
      ))}
    </div>
  )
}

/* ────────────────────────────────────────────
   Table View
   ──────────────────────────────────────────── */

function SortIcon({
  field,
  activeField,
  dir,
}: {
  field: SortField
  activeField: SortField
  dir: SortDir
}) {
  if (field !== activeField) {
    return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />
  }
  return dir === 'asc' ? (
    <ChevronUp className="h-3.5 w-3.5" />
  ) : (
    <ChevronDown className="h-3.5 w-3.5" />
  )
}

function TableView({
  books,
  sortField,
  sortDir,
  onSort,
}: {
  books: Book[]
  sortField: SortField
  sortDir: SortDir
  onSort: (f: SortField) => void
}) {
  const t = useTranslations('books')
  const thClass =
    'px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors'

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="w-12 px-4 py-3" />
              <th className={thClass} onClick={() => onSort('title')}>
                <span className="inline-flex items-center gap-1">
                  {t('titleColumn')}
                  <SortIcon field="title" activeField={sortField} dir={sortDir} />
                </span>
              </th>
              <th className={thClass} onClick={() => onSort('authorNames')}>
                <span className="inline-flex items-center gap-1">
                  {t('author')}
                  <SortIcon field="authorNames" activeField={sortField} dir={sortDir} />
                </span>
              </th>
              <th
                className={cn(thClass, 'hidden md:table-cell')}
                onClick={() => onSort('publishedYear')}
              >
                <span className="inline-flex items-center gap-1">
                  {t('year')}
                  <SortIcon field="publishedYear" activeField={sortField} dir={sortDir} />
                </span>
              </th>
              <th
                className={cn(thClass, 'hidden lg:table-cell')}
                onClick={() => onSort('pageCount')}
              >
                <span className="inline-flex items-center gap-1">
                  {t('pageCount')}
                  <SortIcon field="pageCount" activeField={sortField} dir={sortDir} />
                </span>
              </th>
              <th className={cn(thClass, 'hidden lg:table-cell')}>{t('isbn')}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {books.map((book) => {
              const cover = getCoverSrc(book)
              return (
                <tr key={book.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-4 py-2">
                    <Link href={`/dashboard/books/${book.id}`}>
                      <div className="h-10 w-7 overflow-hidden rounded bg-muted">
                        {cover ? (
                          <img src={cover} alt="" className="h-full w-full object-contain" />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <BookOpen className="h-3.5 w-3.5 text-muted-foreground/40" />
                          </div>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-2">
                    <Link
                      href={`/dashboard/books/${book.id}`}
                      className="line-clamp-1 font-medium transition-colors hover:text-primary"
                    >
                      {book.title}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    <span className="line-clamp-1">{book.authorNames}</span>
                  </td>
                  <td className="hidden px-4 py-2 text-muted-foreground md:table-cell">
                    {book.publishedYear || '—'}
                  </td>
                  <td className="hidden px-4 py-2 text-muted-foreground lg:table-cell">
                    {book.pageCount || '—'}
                  </td>
                  <td className="hidden px-4 py-2 font-mono text-xs text-muted-foreground lg:table-cell">
                    {book.isbn || '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
