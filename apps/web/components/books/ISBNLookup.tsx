'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BookOpen, Image as ImageIcon, Loader2, Search } from 'lucide-react'
import { useState } from 'react'

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
  translator?: string
  bindingType?: 'paperback' | 'hardcover' | 'ebook'
  sourceUrl?: string
}

interface ISBNLookupProps {
  onBookFound: (book: BookLookupResult) => void
  onError?: (error: string) => void
}

type SearchMode = 'isbn' | 'title'

const sources = [
  { id: 'auto', name: 'Otomatik Seç' },
  { id: 'kitapyurdu', name: 'Kitapyurdu' },
  { id: 'bkmkitap', name: 'BKM Kitap' },
  { id: 'idefix', name: 'İdefix' },
  { id: 'google', name: 'Google Books' },
  { id: 'openlibrary', name: 'Open Library' },
]

const titleSources = [
  { id: 'all', name: 'Tümü' },
  { id: 'kitapyurdu', name: 'Kitapyurdu' },
  { id: 'bkmkitap', name: 'BKM Kitap' },
  { id: 'idefix', name: 'İdefix' },
  { id: 'google', name: 'Google Books' },
  { id: 'openlibrary', name: 'Open Library' },
]

export function ISBNLookup({ onBookFound, onError }: ISBNLookupProps) {
  const [searchMode, setSearchMode] = useState<SearchMode>('isbn')
  const [query, setQuery] = useState('')
  const [source, setSource] = useState('auto')
  const [isLoading, setIsLoading] = useState(false)
  const [searchResults, setSearchResults] = useState<BookLookupResult[]>([])
  const [showResults, setShowResults] = useState(false)

  const handleLookup = async () => {
    if (!query.trim()) {
      onError?.(searchMode === 'isbn' ? 'ISBN giriniz' : 'Kitap adı giriniz')
      return
    }

    setIsLoading(true)
    setSearchResults([])
    setShowResults(false)

    try {
      const effectiveSource = source === 'auto' || source === 'all' ? '' : source

      if (searchMode === 'isbn') {
        // ISBN lookup
        const params = new URLSearchParams({ isbn: query.replace(/[-\s]/g, '') })
        if (effectiveSource) {
          params.append('source', effectiveSource)
        }

        const response = await fetch(`${API_URL}/api/book-lookup?${params}`, {
          credentials: 'include',
        })

        const data = await response.json()

        if (!response.ok) {
          onError?.(data.error || 'Kitap bulunamadı')
          return
        }

        onBookFound(data.book)
      } else {
        // Title search
        const params = new URLSearchParams({ q: query.trim() })
        if (effectiveSource) {
          params.append('source', effectiveSource)
        }

        const response = await fetch(`${API_URL}/api/book-lookup/search?${params}`, {
          credentials: 'include',
        })

        const data = await response.json()

        if (!response.ok) {
          onError?.(data.error || 'Arama başarısız')
          return
        }

        if (!data.books || data.books.length === 0) {
          onError?.('Kitap bulunamadı')
          return
        }

        setSearchResults(data.books)
        setShowResults(true)
      }
    } catch {
      onError?.('Arama sırasında bir hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectBook = async (book: BookLookupResult) => {
    if (book.sourceUrl) {
      // Fetch full details (including description) from the product page
      try {
        setIsLoading(true)
        const params = new URLSearchParams({ url: book.sourceUrl })
        const response = await fetch(`${API_URL}/api/book-lookup/detail?${params}`, {
          credentials: 'include',
        })
        if (response.ok) {
          const data = await response.json()
          if (data.book) {
            // Merge: full details take priority, but keep search result data as fallback
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

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2">
        <Search className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-medium">Kitap Ara</h3>
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
          Kitap Adı
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto]">
        <div>
          <Label htmlFor="book-search-input">{searchMode === 'isbn' ? 'ISBN' : 'Kitap Adı'}</Label>
          <Input
            id="book-search-input"
            type="text"
            placeholder={searchMode === 'isbn' ? '978-975-...' : 'Kitap adı yazın...'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        <div>
          <Label>Kaynak</Label>
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

        <div className="flex items-end">
          <Button type="button" onClick={handleLookup} disabled={isLoading || !query.trim()}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Aranıyor...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Ara
              </>
            )}
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {searchMode === 'isbn'
          ? 'ISBN numarasını girin ve otomatik olarak kitap bilgilerini çekin.'
          : 'Kitap adını girin ve sonuçlardan seçin.'}
      </p>

      {/* Search results for title search */}
      {showResults && searchResults.length > 0 && (
        <div className="space-y-2 border-t pt-4">
          <p className="text-sm font-medium text-muted-foreground">
            {searchResults.length} sonuç bulundu — birini seçin:
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
