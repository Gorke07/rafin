'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BookOpen, Image as ImageIcon, Loader2, ScanLine, Search } from 'lucide-react'
import { useTranslations } from 'next-intl'
import dynamic from 'next/dynamic'
import { useCallback, useState } from 'react'

const BarcodeScanner = dynamic(
  () => import('@/components/books/BarcodeScanner').then((mod) => mod.BarcodeScanner),
  { ssr: false },
)

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface BookLookupResult {
  isbn: string
  title: string
  author: string
  publisher?: string
  publishedYear?: number
  pageCount?: number
  description?: string
  language?: string
  coverUrl?: string
  originalTitle?: string
  translator?: string
  bindingType?: 'paperback' | 'hardcover' | 'ebook'
  sourceUrl?: string
}

interface ISBNLookupProps {
  onBookFound: (book: BookLookupResult) => void
  onError?: (error: string) => void
}

type SearchMode = 'isbn' | 'title'

export function ISBNLookup({ onBookFound, onError }: ISBNLookupProps) {
  const t = useTranslations('isbnLookup')
  const [searchMode, setSearchMode] = useState<SearchMode>('isbn')
  const [query, setQuery] = useState('')
  const [source, setSource] = useState('auto')
  const [isLoading, setIsLoading] = useState(false)
  const [searchResults, setSearchResults] = useState<BookLookupResult[]>([])
  const [showResults, setShowResults] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)

  const sources = [
    { id: 'auto', name: t('autoSelect') },
    { id: 'kitapyurdu', name: t('kitapyurdu') },
    { id: 'bkmkitap', name: t('bkmKitap') },
    { id: 'idefix', name: t('idefix') },
    { id: 'google', name: t('googleBooks') },
    { id: 'openlibrary', name: t('openLibrary') },
  ]

  const titleSources = [
    { id: 'all', name: t('allSources') },
    { id: 'kitapyurdu', name: t('kitapyurdu') },
    { id: 'bkmkitap', name: t('bkmKitap') },
    { id: 'idefix', name: t('idefix') },
    { id: 'google', name: t('googleBooks') },
    { id: 'openlibrary', name: t('openLibrary') },
  ]

  const handleLookupWithISBN = useCallback(
    async (isbn: string) => {
      setIsLoading(true)
      setSearchResults([])
      setShowResults(false)

      try {
        const params = new URLSearchParams({ isbn: isbn.replace(/[-\s]/g, '') })

        const response = await fetch(`${API_URL}/api/book-lookup?${params}`, {
          credentials: 'include',
        })

        const data = await response.json()

        if (!response.ok) {
          onError?.(data.error || t('bookNotFound'))
          return
        }

        onBookFound(data.book)
      } catch {
        onError?.(t('searchError'))
      } finally {
        setIsLoading(false)
      }
    },
    [onBookFound, onError, t],
  )

  const handleLookup = async () => {
    if (!query.trim()) {
      onError?.(searchMode === 'isbn' ? t('enterIsbn') : t('enterBookTitle'))
      return
    }

    if (searchMode === 'isbn') {
      await handleLookupWithISBN(query)
      return
    }

    setIsLoading(true)
    setSearchResults([])
    setShowResults(false)

    try {
      const effectiveSource = source === 'auto' || source === 'all' ? '' : source

      const params = new URLSearchParams({ q: query.trim() })
      if (effectiveSource) {
        params.append('source', effectiveSource)
      }

      const response = await fetch(`${API_URL}/api/book-lookup/search?${params}`, {
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        onError?.(data.error || t('searchFailed'))
        return
      }

      if (!data.books || data.books.length === 0) {
        onError?.(t('bookNotFound'))
        return
      }

      setSearchResults(data.books)
      setShowResults(true)
    } catch {
      onError?.(t('searchError'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectBook = async (book: BookLookupResult) => {
    if (book.sourceUrl) {
      try {
        setIsLoading(true)
        const params = new URLSearchParams({ url: book.sourceUrl })
        const response = await fetch(`${API_URL}/api/book-lookup/detail?${params}`, {
          credentials: 'include',
        })
        if (response.ok) {
          const data = await response.json()
          if (data.book) {
            onBookFound({ ...book, ...data.book })
            setShowResults(false)
            setSearchResults([])
            setQuery('')
            return
          }
        }
      } catch {
        // Fall through to use the search result data as-is
      } finally {
        setIsLoading(false)
      }
    }

    onBookFound(book)
    setShowResults(false)
    setSearchResults([])
    setQuery('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleLookup()
    }
  }

  const handleBarcodeScan = useCallback(
    (isbn: string) => {
      setScannerOpen(false)
      setQuery(isbn)
      handleLookupWithISBN(isbn)
    },
    [handleLookupWithISBN],
  )

  const handleScannerError = useCallback(
    (error: string) => {
      setScannerOpen(false)
      onError?.(error)
    },
    [onError],
  )

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2">
        <Search className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-medium">{t('searchBook')}</h3>
      </div>

      {/* Search mode toggle */}
      <div className="flex items-center gap-1 rounded-md border bg-muted/40 p-1 w-fit">
        <button
          type="button"
          onClick={() => {
            setSearchMode('isbn')
            setSource('auto')
            setShowResults(false)
            setSearchResults([])
          }}
          className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
            searchMode === 'isbn'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          ISBN
        </button>
        <button
          type="button"
          onClick={() => {
            setSearchMode('title')
            setSource('all')
            setShowResults(false)
            setSearchResults([])
          }}
          className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
            searchMode === 'title'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {t('bookTitle')}
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto]">
        <div>
          <Label htmlFor="book-search-input">
            {searchMode === 'isbn' ? 'ISBN' : t('bookTitle')}
          </Label>
          <Input
            id="book-search-input"
            type="text"
            placeholder={searchMode === 'isbn' ? '978-975-...' : t('enterBookTitle')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        <div>
          <Label>{t('source')}</Label>
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(searchMode === 'isbn' ? sources : titleSources).map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end gap-2">
          <Button type="button" onClick={handleLookup} disabled={isLoading || !query.trim()}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('searching')}
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                {t('searchButton')}
              </>
            )}
          </Button>
          {searchMode === 'isbn' && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setScannerOpen(true)}
              title={t('scanBarcode')}
            >
              <ScanLine className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {searchMode === 'isbn' ? t('isbnHint') : t('titleHint')}
      </p>

      {/* Barcode scanner dialog */}
      <Dialog open={scannerOpen} onOpenChange={setScannerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('scanBarcode')}</DialogTitle>
            <DialogDescription>{t('pointCamera')}</DialogDescription>
          </DialogHeader>
          {scannerOpen && (
            <BarcodeScanner onScan={handleBarcodeScan} onError={handleScannerError} />
          )}
        </DialogContent>
      </Dialog>

      {/* Search results for title search */}
      {showResults && searchResults.length > 0 && (
        <div className="space-y-2 border-t pt-4">
          <p className="text-sm font-medium text-muted-foreground">
            {t('resultsFound', { count: searchResults.length })}
          </p>
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {searchResults.map((book, i) => (
              <button
                key={`${book.isbn || ''}-${book.title}-${i}`}
                type="button"
                onClick={() => handleSelectBook(book)}
                className="flex w-full items-start gap-3 rounded-md border p-3 text-left transition-colors hover:bg-accent hover:border-primary/40"
              >
                {/* Thumbnail */}
                <div className="h-16 w-11 flex-shrink-0 overflow-hidden rounded bg-muted">
                  {book.coverUrl ? (
                    <img src={book.coverUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <ImageIcon className="h-4 w-4 text-muted-foreground/40" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="font-medium leading-tight line-clamp-1">{book.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground line-clamp-1">{book.author}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    {book.publisher && <span>{book.publisher}</span>}
                    {book.publisher && book.publishedYear && <span className="text-border">·</span>}
                    {book.publishedYear && <span>{book.publishedYear}</span>}
                    {book.isbn && (
                      <>
                        <span className="text-border">·</span>
                        <span className="font-mono">{book.isbn}</span>
                      </>
                    )}
                  </div>
                </div>

                <BookOpen className="mt-1 h-4 w-4 flex-shrink-0 text-muted-foreground/40" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
