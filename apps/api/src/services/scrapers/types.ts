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
  translator?: string
  bindingType?: 'paperback' | 'hardcover' | 'ebook'
}

export interface BookScraper {
  name: string
  lookup(isbn: string): Promise<BookLookupResult | null>
  searchByTitle?(query: string): Promise<BookLookupResult[]>
}

export type BookSource = 'kitapyurdu' | 'bkmkitap' | 'idefix' | 'google' | 'openlibrary'
