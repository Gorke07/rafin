export interface BookLookupResult {
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

export interface BookScraper {
  name: string
  lookup(isbn: string): Promise<BookLookupResult | null>
  searchByTitle?(query: string): Promise<BookLookupResult[]>
  lookupByUrl?(url: string): Promise<BookLookupResult | null>
}

export type BookSource = 'kitapyurdu' | 'bkmkitap' | 'idefix' | 'google' | 'openlibrary'
