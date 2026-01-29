import type { BookLookupResult, BookScraper } from './types'

interface OpenLibraryBook {
  title?: string
  authors?: Array<{ name: string }>
  publishers?: Array<{ name: string }>
  publish_date?: string
  number_of_pages?: number
  cover?: {
    medium?: string
    large?: string
  }
}

interface OpenLibrarySearchResponse {
  docs: Array<{
    title?: string
    author_name?: string[]
    publisher?: string[]
    first_publish_year?: number
    number_of_pages_median?: number
    isbn?: string[]
    cover_i?: number
  }>
}

export const openLibraryScraper: BookScraper = {
  name: 'openlibrary',

  async lookup(isbn: string): Promise<BookLookupResult | null> {
    try {
      const response = await fetch(
        `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`
      )

      if (!response.ok) {
        return null
      }

      const data = await response.json() as Record<string, OpenLibraryBook>
      const bookData = data[`ISBN:${isbn}`]

      if (!bookData) {
        return null
      }

      return {
        isbn,
        title: bookData.title || '',
        author: bookData.authors?.map((a) => a.name).join(', ') || '',
        publisher: bookData.publishers?.[0]?.name,
        publishedYear: bookData.publish_date
          ? parseInt(bookData.publish_date.match(/\d{4}/)?.[0] || '')
          : undefined,
        pageCount: bookData.number_of_pages,
        coverUrl: bookData.cover?.medium || bookData.cover?.large,
      }
    } catch (error) {
      console.error('OpenLibrary lookup error:', error)
      return null
    }
  },

  async searchByTitle(query: string): Promise<BookLookupResult[]> {
    try {
      const response = await fetch(
        `https://openlibrary.org/search.json?title=${encodeURIComponent(query)}&limit=10`
      )

      if (!response.ok) {
        return []
      }

      const data = await response.json() as OpenLibrarySearchResponse

      if (!data.docs || data.docs.length === 0) {
        return []
      }

      return data.docs
        .filter((doc) => doc.title)
        .map((doc) => ({
          isbn: doc.isbn?.[0] || '',
          title: doc.title || '',
          author: doc.author_name?.join(', ') || '',
          publisher: doc.publisher?.[0],
          publishedYear: doc.first_publish_year,
          pageCount: doc.number_of_pages_median,
          coverUrl: doc.cover_i
            ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
            : undefined,
        }))
    } catch (error) {
      console.error('OpenLibrary title search error:', error)
      return []
    }
  },
}
