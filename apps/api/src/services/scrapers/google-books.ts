import { sanitizeDescription } from '../sanitize-html'
import type { BookLookupResult, BookScraper } from './types'

interface GoogleBooksResponse {
  items: Array<{
    volumeInfo: {
      title?: string
      authors?: string[]
      publisher?: string
      publishedDate?: string
      pageCount?: number
      description?: string
      language?: string
      imageLinks?: {
        thumbnail?: string
      }
      industryIdentifiers?: Array<{
        type: string
        identifier: string
      }>
    }
  }>
}

function parseGoogleBook(item: GoogleBooksResponse['items'][0]): BookLookupResult {
  const book = item.volumeInfo
  const isbn13 = book.industryIdentifiers?.find((id) => id.type === 'ISBN_13')?.identifier
  const isbn10 = book.industryIdentifiers?.find((id) => id.type === 'ISBN_10')?.identifier

  return {
    isbn: isbn13 || isbn10 || '',
    title: book.title || '',
    author: book.authors?.join(', ') || '',
    publisher: book.publisher,
    publishedYear: book.publishedDate
      ? Number.parseInt(book.publishedDate.split('-')[0])
      : undefined,
    pageCount: book.pageCount,
    description: sanitizeDescription(book.description),
    language: book.language,
    coverUrl: book.imageLinks?.thumbnail?.replace('http:', 'https:'),
  }
}

export const googleBooksScraper: BookScraper = {
  name: 'google',

  async lookup(isbn: string): Promise<BookLookupResult | null> {
    try {
      const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`)

      if (!response.ok) {
        return null
      }

      const data = (await response.json()) as GoogleBooksResponse

      if (!data.items || data.items.length === 0) {
        return null
      }

      const result = parseGoogleBook(data.items[0])
      result.isbn = result.isbn || isbn
      return result
    } catch (error) {
      console.error('Google Books lookup error:', error)
      return null
    }
  },

  async searchByTitle(query: string): Promise<BookLookupResult[]> {
    try {
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(query)}&maxResults=10`,
      )

      if (!response.ok) {
        return []
      }

      const data = (await response.json()) as GoogleBooksResponse

      if (!data.items || data.items.length === 0) {
        return []
      }

      return data.items.map(parseGoogleBook)
    } catch (error) {
      console.error('Google Books title search error:', error)
      return []
    }
  },
}
