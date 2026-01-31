'use client'

import { BookCoverPlaceholder } from '@/components/books/BookCoverPlaceholder'
import { BookFilters, EMPTY_FILTERS } from '@/components/books/BookFilters'
import type { BookFilterValues } from '@/components/books/BookFilters'
import { BookCard, BookCardSkeleton } from '@/components/dashboard/book-card'
import { EmptyState } from '@/components/dashboard/empty-state'
import { PageHeader } from '@/components/dashboard/page-header'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { Input } from '@/components/ui/input'
import { PaginationControls } from '@/components/ui/pagination-controls'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import {
  ArrowUpDown,
  BookOpen,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  List,
  Loader2,
  Plus,
  Search,
  Square,
  Trash2,
  X,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

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
  const tc = useTranslations('common')
  const { addToast } = useToast()
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
  const [filters, setFilters] = useState<BookFilterValues>({ ...EMPTY_FILTERS })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(() => {
    if (typeof window !== 'undefined') {
      return Number(localStorage.getItem('books-pageSize')) || 24
    }
    return 24
  })
  const [total, setTotal] = useState(0)

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [isSelectMode, setIsSelectMode] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchBooks = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.set('search', searchQuery)
      if (filters.categoryId) params.set('categoryId', filters.categoryId)
      if (filters.status) params.set('status', filters.status)
      params.set('limit', String(pageSize))
      params.set('offset', String((page - 1) * pageSize))
      const url = `${API_URL}/api/books?${params.toString()}`
      const response = await fetch(url, { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        setBooks(data.books)
        setTotal(data.total ?? data.books.length)
      }
    } catch (error) {
      console.error('Failed to fetch books:', error)
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, filters.categoryId, filters.status, page, pageSize])

  useEffect(() => {
    fetchBooks()
  }, [fetchBooks])

  useEffect(() => {
    localStorage.setItem('books-view', view)
  }, [view])

  useEffect(() => {
    localStorage.setItem('books-pageSize', String(pageSize))
  }, [pageSize])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
  }

  const handleFiltersChange = useCallback((newFilters: BookFilterValues) => {
    setFilters(newFilters)
    setPage(1)
  }, [])

  const languages = useMemo(() => {
    const langs = new Set<string>()
    for (const book of books) {
      if (book.language) langs.add(book.language)
    }
    return Array.from(langs).sort()
  }, [books])

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const filtered = books.filter((book) => {
    if (filters.language && book.language !== filters.language) return false
    if (filters.bindingType && book.bindingType !== filters.bindingType) return false
    if (filters.yearFrom && (!book.publishedYear || book.publishedYear < Number(filters.yearFrom)))
      return false
    if (filters.yearTo && (!book.publishedYear || book.publishedYear > Number(filters.yearTo)))
      return false
    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1
    const av = a[sortField]
    const bv = b[sortField]
    if (av == null && bv == null) return 0
    if (av == null) return 1
    if (bv == null) return -1
    if (typeof av === 'string') return av.localeCompare(bv as string) * dir
    return ((av as number) - (bv as number)) * dir
  })

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === sorted.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(sorted.map((b) => b.id)))
    }
  }

  const exitSelectMode = () => {
    setIsSelectMode(false)
    setSelectedIds(new Set())
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    setIsDeleting(true)
    try {
      const response = await fetch(`${API_URL}/api/books/bulk`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      })
      if (response.ok) {
        addToast(t('booksDeleted', { count: selectedIds.size }), 'success')
        exitSelectMode()
        fetchBooks()
      } else {
        addToast(tc('error'), 'error')
      }
    } catch {
      addToast(tc('error'), 'error')
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        description={
          !isLoading && total > 0
            ? filtered.length !== books.length
              ? t('bookCount', { count: `${filtered.length}/${total}` })
              : t('bookCount', { count: total })
            : undefined
        }
      >
        <Button asChild>
          <Link href="/dashboard/books/new">
            <Plus className="h-4 w-4" />
            {t('addBook')}
          </Link>
        </Button>
      </PageHeader>

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

        <div className="flex items-center gap-2">
          {!isLoading && sorted.length > 0 && (
            <Button
              variant={isSelectMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => (isSelectMode ? exitSelectMode() : setIsSelectMode(true))}
            >
              {isSelectMode ? <X className="h-4 w-4" /> : <CheckSquare className="h-4 w-4" />}
            </Button>
          )}

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
      </div>

      <BookFilters filters={filters} onChange={handleFiltersChange} languages={languages} />

      {isLoading ? (
        view === 'card' ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <BookCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <Card>
            <div className="space-y-3 p-4">
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
      ) : filtered.length === 0 ? (
        total > 0 ||
        searchQuery ||
        filters.categoryId ||
        filters.status ||
        filters.language ||
        filters.bindingType ||
        filters.yearFrom ||
        filters.yearTo ? (
          <EmptyState
            icon={Search}
            title={t('noBooksFiltered')}
            description={t('noBooksFilteredHint')}
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('')
                  setFilters({ ...EMPTY_FILTERS })
                  setPage(1)
                }}
              >
                {t('clearFilters')}
              </Button>
            }
          />
        ) : (
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
        )
      ) : view === 'card' ? (
        <CardView
          books={sorted}
          selectable={isSelectMode}
          selectedIds={selectedIds}
          onSelect={toggleSelect}
        />
      ) : (
        <TableView
          books={sorted}
          sortField={sortField}
          sortDir={sortDir}
          onSort={toggleSort}
          selectable={isSelectMode}
          selectedIds={selectedIds}
          onSelect={toggleSelect}
          onSelectAll={toggleSelectAll}
        />
      )}

      {!isLoading && total > 0 && (
        <PaginationControls
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}

      {isSelectMode && selectedIds.size > 0 && (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center">
          <div className="flex items-center gap-3 rounded-xl border bg-card px-5 py-3 shadow-lg">
            <span className="text-sm font-medium">
              {t('selected', { count: selectedIds.size })}
            </span>
            <Button variant="outline" size="sm" onClick={toggleSelectAll}>
              {selectedIds.size === sorted.length ? (
                <>
                  <Square className="mr-1 h-4 w-4" />
                  {t('deselectAll')}
                </>
              ) : (
                <>
                  <CheckSquare className="mr-1 h-4 w-4" />
                  {t('selectAll')}
                </>
              )}
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
              <Trash2 className="mr-1 h-4 w-4" />
              {t('bulkDelete')}
            </Button>
            <Button variant="ghost" size="sm" onClick={exitSelectMode}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tc('confirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('bulkDeleteConfirm', { count: selectedIds.size })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              {tc('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function CardView({
  books,
  selectable,
  selectedIds,
  onSelect,
}: {
  books: Book[]
  selectable: boolean
  selectedIds: Set<number>
  onSelect: (id: number) => void
}) {
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
          selectable={selectable}
          selected={selectedIds.has(book.id)}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}

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
  selectable,
  selectedIds,
  onSelect,
  onSelectAll,
}: {
  books: Book[]
  sortField: SortField
  sortDir: SortDir
  onSort: (f: SortField) => void
  selectable: boolean
  selectedIds: Set<number>
  onSelect: (id: number) => void
  onSelectAll: () => void
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
              {selectable && (
                <th className="w-10 px-4 py-3">
                  <Checkbox
                    checked={selectedIds.size === books.length && books.length > 0}
                    onCheckedChange={onSelectAll}
                  />
                </th>
              )}
              <th className="w-12 px-4 py-3" />
              <th className={thClass}>
                <button
                  type="button"
                  className="inline-flex items-center gap-1"
                  onClick={() => onSort('title')}
                >
                  {t('titleColumn')}
                  <SortIcon field="title" activeField={sortField} dir={sortDir} />
                </button>
              </th>
              <th className={thClass}>
                <button
                  type="button"
                  className="inline-flex items-center gap-1"
                  onClick={() => onSort('authorNames')}
                >
                  {t('author')}
                  <SortIcon field="authorNames" activeField={sortField} dir={sortDir} />
                </button>
              </th>
              <th className={cn(thClass, 'hidden md:table-cell')}>
                <button
                  type="button"
                  className="inline-flex items-center gap-1"
                  onClick={() => onSort('publishedYear')}
                >
                  {t('year')}
                  <SortIcon field="publishedYear" activeField={sortField} dir={sortDir} />
                </button>
              </th>
              <th className={cn(thClass, 'hidden lg:table-cell')}>
                <button
                  type="button"
                  className="inline-flex items-center gap-1"
                  onClick={() => onSort('pageCount')}
                >
                  {t('pageCount')}
                  <SortIcon field="pageCount" activeField={sortField} dir={sortDir} />
                </button>
              </th>
              <th className={cn(thClass, 'hidden lg:table-cell')}>{t('isbn')}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {books.map((book) => {
              const cover = getCoverSrc(book)
              const isSelected = selectedIds.has(book.id)
              return (
                <tr
                  key={book.id}
                  className={cn(
                    'transition-colors hover:bg-muted/30',
                    isSelected && 'bg-primary/5',
                  )}
                >
                  {selectable && (
                    <td className="px-4 py-2">
                      <Checkbox checked={isSelected} onCheckedChange={() => onSelect(book.id)} />
                    </td>
                  )}
                  <td className="px-4 py-2">
                    {cover ? (
                      <HoverCard openDelay={200} closeDelay={0}>
                        <HoverCardTrigger asChild>
                          <Link href={`/dashboard/books/${book.id}`}>
                            <div className="h-10 w-7 overflow-hidden rounded bg-muted">
                              <img src={cover} alt="" className="h-full w-full object-contain" />
                            </div>
                          </Link>
                        </HoverCardTrigger>
                        <HoverCardContent side="right" align="start" className="w-auto p-1">
                          <img
                            src={cover}
                            alt={book.title}
                            className="h-72 w-auto rounded object-contain"
                          />
                        </HoverCardContent>
                      </HoverCard>
                    ) : (
                      <Link href={`/dashboard/books/${book.id}`}>
                        <div className="h-10 w-7 overflow-hidden rounded">
                          <BookCoverPlaceholder title={book.title} size="sm" />
                        </div>
                      </Link>
                    )}
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
