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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { Input } from '@/components/ui/input'
import { PaginationControls } from '@/components/ui/pagination-controls'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import {
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  ArrowUpDown,
  BookOpen,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Eye,
  LayoutGrid,
  List,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Settings2,
  Square,
  Trash2,
  X,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

type ViewMode = 'card' | 'table'

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

  const filtered = books.filter((book) => {
    if (filters.language && book.language !== filters.language) return false
    if (filters.bindingType && book.bindingType !== filters.bindingType) return false
    if (filters.yearFrom && (!book.publishedYear || book.publishedYear < Number(filters.yearFrom)))
      return false
    if (filters.yearTo && (!book.publishedYear || book.publishedYear > Number(filters.yearTo)))
      return false
    return true
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
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map((b) => b.id)))
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
          {!isLoading && filtered.length > 0 && (
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
            <div className="space-y-1 p-1">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 rounded-md px-3 py-3">
                  <Skeleton className="h-12 w-8 shrink-0 rounded" />
                  <div className="flex flex-1 flex-col gap-1.5">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="hidden h-3 w-16 md:block" />
                  <Skeleton className="hidden h-3 w-12 lg:block" />
                  <Skeleton className="hidden h-3 w-20 lg:block" />
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
          books={filtered}
          selectable={isSelectMode}
          selectedIds={selectedIds}
          onSelect={toggleSelect}
        />
      ) : (
        <BooksTableView
          books={filtered}
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
              {selectedIds.size === filtered.length ? (
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

/* ─── Card View ─────────────────────────────────────────────────── */

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

/* ─── Table View (TanStack Table) ───────────────────────────────── */

function CoverCell({ book }: { book: Book }) {
  const cover = getCoverSrc(book)

  if (cover) {
    return (
      <HoverCard openDelay={200} closeDelay={0}>
        <HoverCardTrigger asChild>
          <Link href={`/dashboard/books/${book.id}`} className="block">
            <div className="relative h-12 w-8 overflow-hidden rounded-sm bg-muted shadow-sm ring-1 ring-black/5 transition-shadow hover:shadow-md dark:ring-white/10">
              <Image src={cover} alt={book.title} fill className="object-cover" sizes="32px" />
            </div>
          </Link>
        </HoverCardTrigger>
        <HoverCardContent side="right" align="start" className="w-auto p-1.5">
          <Image
            src={cover}
            alt={book.title}
            width={200}
            height={288}
            className="h-72 w-auto rounded object-contain"
          />
        </HoverCardContent>
      </HoverCard>
    )
  }

  return (
    <Link href={`/dashboard/books/${book.id}`} className="block">
      <div className="h-12 w-8 overflow-hidden rounded-sm shadow-sm ring-1 ring-black/5 dark:ring-white/10">
        <BookCoverPlaceholder title={book.title} size="sm" />
      </div>
    </Link>
  )
}

function SortHeader({
  column,
  children,
}: {
  column: {
    getIsSorted: () => false | 'asc' | 'desc'
    getToggleSortingHandler: () => ((event: unknown) => void) | undefined
  }
  children: React.ReactNode
}) {
  const sorted = column.getIsSorted()
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
      onClick={column.getToggleSortingHandler()}
    >
      {children}
      {sorted === 'asc' ? (
        <ChevronUp className="h-3.5 w-3.5" />
      ) : sorted === 'desc' ? (
        <ChevronDown className="h-3.5 w-3.5" />
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-40" />
      )}
    </button>
  )
}

function RowActions({ book }: { book: Book }) {
  const t = useTranslations('books')

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuLabel className="text-xs">{t('actions')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`/dashboard/books/${book.id}`}>
            <Eye className="mr-2 h-3.5 w-3.5" />
            {t('viewBook')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/dashboard/books/${book.id}/edit`}>
            <Pencil className="mr-2 h-3.5 w-3.5" />
            {t('editBook')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive focus:text-destructive">
          <Trash2 className="mr-2 h-3.5 w-3.5" />
          {t('deleteBook')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function BooksTableView({
  books,
  selectable,
  selectedIds,
  onSelect,
  onSelectAll,
}: {
  books: Book[]
  selectable: boolean
  selectedIds: Set<number>
  onSelect: (id: number) => void
  onSelectAll: () => void
}) {
  const t = useTranslations('books')
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('books-table-columns')
        if (saved) return JSON.parse(saved)
      } catch {}
    }
    return {}
  })

  useEffect(() => {
    localStorage.setItem('books-table-columns', JSON.stringify(columnVisibility))
  }, [columnVisibility])

  const columns = useMemo<ColumnDef<Book>[]>(() => {
    const cols: ColumnDef<Book>[] = []

    if (selectable) {
      cols.push({
        id: 'select',
        header: () => (
          <Checkbox
            checked={selectedIds.size === books.length && books.length > 0}
            onCheckedChange={onSelectAll}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={selectedIds.has(row.original.id)}
            onCheckedChange={() => onSelect(row.original.id)}
          />
        ),
        enableSorting: false,
        enableHiding: false,
        size: 40,
      })
    }

    cols.push(
      {
        id: 'cover',
        header: () => null,
        cell: ({ row }) => <CoverCell book={row.original} />,
        enableSorting: false,
        enableHiding: false,
        size: 50,
      },
      {
        accessorKey: 'title',
        header: ({ column }) => <SortHeader column={column}>{t('titleColumn')}</SortHeader>,
        cell: ({ row }) => (
          <div className="min-w-0">
            <Link
              href={`/dashboard/books/${row.original.id}`}
              className="line-clamp-1 font-medium transition-colors hover:text-primary"
            >
              {row.original.title}
            </Link>
            <span className="line-clamp-1 text-xs text-muted-foreground md:hidden">
              {row.original.authorNames}
            </span>
          </div>
        ),
        size: 300,
      },
      {
        accessorKey: 'authorNames',
        header: ({ column }) => <SortHeader column={column}>{t('author')}</SortHeader>,
        cell: ({ row }) => (
          <span className="line-clamp-1 text-muted-foreground">{row.original.authorNames}</span>
        ),
        meta: { hideOnMobile: true },
        size: 200,
      },
      {
        accessorKey: 'publishedYear',
        header: ({ column }) => <SortHeader column={column}>{t('year')}</SortHeader>,
        cell: ({ row }) => (
          <span className="tabular-nums text-muted-foreground">
            {row.original.publishedYear || '—'}
          </span>
        ),
        meta: { hideOnTablet: true },
        size: 80,
      },
      {
        accessorKey: 'pageCount',
        header: ({ column }) => <SortHeader column={column}>{t('pageCount')}</SortHeader>,
        cell: ({ row }) => (
          <span className="tabular-nums text-muted-foreground">
            {row.original.pageCount || '—'}
          </span>
        ),
        meta: { hideOnTablet: true },
        size: 90,
      },
      {
        accessorKey: 'isbn',
        header: () => (
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t('isbn')}
          </span>
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.original.isbn || '—'}
          </span>
        ),
        enableSorting: false,
        meta: { hideOnDesktop: true },
        size: 140,
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => <SortHeader column={column}>{t('addedOn')}</SortHeader>,
        cell: ({ row }) => {
          const date = new Date(row.original.createdAt)
          return (
            <span className="text-xs tabular-nums text-muted-foreground">
              {date.toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          )
        },
        meta: { hideOnDesktop: true },
        size: 120,
      },
      {
        id: 'actions',
        header: () => null,
        cell: ({ row }) => <RowActions book={row.original} />,
        enableSorting: false,
        enableHiding: false,
        size: 50,
      },
    )

    return cols
  }, [selectable, selectedIds, books.length, onSelect, onSelectAll, t])

  const table = useReactTable({
    data: books,
    columns,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const toggleableColumns = table
    .getAllColumns()
    .filter((col) => col.getCanHide() && col.id !== 'cover' && col.id !== 'actions')

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings2 className="mr-1.5 h-3.5 w-3.5" />
              {t('columns')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {toggleableColumns.map((column) => (
              <DropdownMenuCheckboxItem
                key={column.id}
                checked={column.getIsVisible()}
                onCheckedChange={(value) => column.toggleVisibility(!!value)}
                className="capitalize"
              >
                {column.id === 'authorNames'
                  ? t('author')
                  : column.id === 'publishedYear'
                    ? t('year')
                    : column.id === 'pageCount'
                      ? t('pageCount')
                      : column.id === 'isbn'
                        ? t('isbn')
                        : column.id === 'createdAt'
                          ? t('addedOn')
                          : column.id === 'title'
                            ? t('titleColumn')
                            : column.id}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Card className="overflow-hidden rounded-lg py-0">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-b bg-muted/40 hover:bg-muted/40">
                {headerGroup.headers.map((header) => {
                  const meta = header.column.columnDef.meta as
                    | { hideOnMobile?: boolean; hideOnTablet?: boolean; hideOnDesktop?: boolean }
                    | undefined
                  return (
                    <TableHead
                      key={header.id}
                      style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                      className={cn(
                        meta?.hideOnMobile && 'hidden md:table-cell',
                        meta?.hideOnTablet && 'hidden lg:table-cell',
                        meta?.hideOnDesktop && 'hidden xl:table-cell',
                      )}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => {
                const isSelected = selectedIds.has(row.original.id)
                return (
                  <TableRow
                    key={row.id}
                    data-state={isSelected ? 'selected' : undefined}
                    className={cn('group transition-colors', isSelected && 'bg-primary/5')}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const meta = cell.column.columnDef.meta as
                        | {
                            hideOnMobile?: boolean
                            hideOnTablet?: boolean
                            hideOnDesktop?: boolean
                          }
                        | undefined
                      return (
                        <TableCell
                          key={cell.id}
                          className={cn(
                            meta?.hideOnMobile && 'hidden md:table-cell',
                            meta?.hideOnTablet && 'hidden lg:table-cell',
                            meta?.hideOnDesktop && 'hidden xl:table-cell',
                          )}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  <EmptyState
                    icon={BookOpen}
                    title={t('noBooks')}
                    description={t('startWithFirstBook')}
                    compact
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
