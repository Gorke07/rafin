import { sanitizeDescription } from '../sanitize-html'
import type { BookLookupResult, BookScraper } from './types'

interface OpenLibraryBook {
  title?: string
  authors?: Array<{ name: string; key?: string }>
  publishers?: Array<{ name: string }>
  publish_date?: string
  number_of_pages?: number
  cover?: {
    medium?: string
    large?: string
  }
  identifiers?: Record<string, string[]>
  subjects?: Array<{ name: string }>
}

interface OpenLibraryEdition {
  works?: Array<{ key: string }>
  description?: string | { value: string }
}

interface OpenLibraryWork {
  description?: string | { value: string }
}

function extractDescription(desc: string | { value: string } | undefined): string | undefined {
  if (!desc) return undefined
  const text = typeof desc === 'string' ? desc : desc.value
  if (!text) return undefined
  // If it contains HTML tags, sanitize directly; otherwise wrap in <p>
  if (/<[a-z][\s\S]*>/i.test(text)) {
    return sanitizeDescription(text)
  }
  // Convert plain text paragraphs to HTML
  const html = text
    .split(/\n\n+/)
    .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
    .join('')
  return sanitizeDescription(html)
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
        `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`,
      )

      if (!response.ok) {
        return null
      }

      const data = (await response.json()) as Record<string, OpenLibraryBook>
      const bookData = data[`ISBN:${isbn}`]

      if (!bookData) {
        return null
      }

      // Fetch description from edition and/or work
      let description: string | undefined
      try {
        const editionRes = await fetch(`https://openlibrary.org/isbn/${isbn}.json`)
        if (editionRes.ok) {
          const edition = (await editionRes.json()) as OpenLibraryEdition
          description = extractDescription(edition.description)

          // If no description on edition, try the work
          if (!description && edition.works?.[0]?.key) {
            const workRes = await fetch(`https://openlibrary.org${edition.works[0].key}.json`)
            if (workRes.ok) {
              const work = (await workRes.json()) as OpenLibraryWork
              description = extractDescription(work.description)
            }
          }
        }
      } catch {
        // Description fetch failed, continue without it
      }

      return {
        isbn,
        title: bookData.title || '',
        author: bookData.authors?.map((a) => a.name).join(', ') || '',
        publisher: bookData.publishers?.[0]?.name,
        publishedYear: bookData.publish_date
          ? Number.parseInt(bookData.publish_date.match(/\d{4}/)?.[0] || '')
          : undefined,
        pageCount: bookData.number_of_pages,
        description,
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
        `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=10`,
      )

      if (!response.ok) {
        return []
      }

      const data = (await response.json()) as OpenLibrarySearchResponse

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
