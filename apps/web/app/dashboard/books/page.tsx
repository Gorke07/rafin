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
  Image as ImageIcon,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

type ViewMode = 'card' | 'table'
type SortField = 'title' | 'author' | 'publishedYear' | 'createdAt' | 'pageCount'
type SortDir = 'asc' | 'desc'

interface Book {
  id: number
  title: string
  author: string
  isbn: string | null
  publisher: string | null
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
  const tc = useTranslations('common')
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          {!isLoading && books.length > 0 && (
            <p className="mt-1 text-sm text-muted-foreground">
              {t('bookCount', { count: books.length })}
            </p>
          )}
        </div>
        <Link
          href="/dashboard/books/new"
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          {t('addBook')}
        </Link>
      </div>

      {/* Toolbar: search + view toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder={t('search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-4 text-sm"
          />
        </form>

        <div className="flex items-center gap-1 rounded-md border bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => setView('card')}
            className={cn(
              'flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-colors',
              view === 'card'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <LayoutGrid className="h-4 w-4" />
            {t('cardView')}
          </button>
          <button
            type="button"
            onClick={() => setView('table')}
            className={cn(
              'flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-colors',
              view === 'table'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <List className="h-4 w-4" />
            {t('tableView')}
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
          <p className="mt-4 text-sm text-muted-foreground">{tc('loading')}</p>
        </div>
      ) : books.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <h3 className="mt-4 text-lg font-medium">{t('noBooks')}</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('startWithFirstBook')}
          </p>
          <Link
            href="/dashboard/books/new"
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            {t('addBook')}
          </Link>
        </div>
      ) : view === 'card' ? (
        <CardView books={sorted} />
      ) : (
        <TableView
          books={sorted}
          sortField={sortField}
          sortDir={sortDir}
          onSort={toggleSort}
        />
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
      {books.map((book) => {
        const cover = getCoverSrc(book)
        return (
          <Link
            key={book.id}
            href={`/dashboard/books/${book.id}`}
            className="group overflow-hidden rounded-lg border bg-card transition-all hover:shadow-md hover:border-primary/40"
          >
            {/* Cover */}
            <div className="aspect-[3/4] w-full overflow-hidden bg-muted">
              {cover ? (
                <img
                  src={cover}
                  alt={book.title}
                  className="h-full w-full object-contain transition-transform group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground/40">
                  <ImageIcon className="h-12 w-12" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="p-3">
              <h3 className="font-semibold leading-tight line-clamp-2">
                {book.title}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground truncate">
                {book.author}
              </p>
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                {book.publishedYear && <span>{book.publishedYear}</span>}
                {book.publishedYear && book.pageCount && (
                  <span className="text-border">·</span>
                )}
                {book.pageCount && <span>{book.pageCount} s.</span>}
              </div>
            </div>
          </Link>
        )
      })}
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
    <div className="overflow-hidden rounded-lg border bg-card">
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
              <th className={thClass} onClick={() => onSort('author')}>
                <span className="inline-flex items-center gap-1">
                  {t('author')}
                  <SortIcon field="author" activeField={sortField} dir={sortDir} />
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
              <th className={cn(thClass, 'hidden md:table-cell')}>{t('publisher')}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {books.map((book) => {
              const cover = getCoverSrc(book)
              return (
                <tr
                  key={book.id}
                  className="transition-colors hover:bg-muted/30"
                >
                  {/* Thumbnail */}
                  <td className="px-4 py-2">
                    <Link href={`/dashboard/books/${book.id}`}>
                      <div className="h-10 w-7 overflow-hidden rounded bg-muted">
                        {cover ? (
                          <img
                            src={cover}
                            alt=""
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <BookOpen className="h-3.5 w-3.5 text-muted-foreground/40" />
                          </div>
                        )}
                      </div>
                    </Link>
                  </td>

                  {/* Title */}
                  <td className="px-4 py-2">
                    <Link
                      href={`/dashboard/books/${book.id}`}
                      className="font-medium hover:text-primary transition-colors line-clamp-1"
                    >
                      {book.title}
                    </Link>
                  </td>

                  {/* Author */}
                  <td className="px-4 py-2 text-muted-foreground">
                    <span className="line-clamp-1">{book.author}</span>
                  </td>

                  {/* Year */}
                  <td className="hidden px-4 py-2 text-muted-foreground md:table-cell">
                    {book.publishedYear || '—'}
                  </td>

                  {/* Pages */}
                  <td className="hidden px-4 py-2 text-muted-foreground lg:table-cell">
                    {book.pageCount || '—'}
                  </td>

                  {/* ISBN */}
                  <td className="hidden px-4 py-2 font-mono text-xs text-muted-foreground lg:table-cell">
                    {book.isbn || '—'}
                  </td>

                  {/* Publisher */}
                  <td className="hidden px-4 py-2 text-muted-foreground md:table-cell">
                    <span className="line-clamp-1">
                      {book.publisher || '—'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
