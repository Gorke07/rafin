import { bkmkitapScraper } from './bkmkitap'
import { googleBooksScraper } from './google-books'
import { idefixScraper } from './idefix'
import { kitapyurduScraper } from './kitapyurdu'
import { openLibraryScraper } from './openlibrary'
import type { BookLookupResult, BookScraper, BookSource } from './types'

export type { BookLookupResult, BookSource }

const scrapers: Record<BookSource, BookScraper> = {
  kitapyurdu: kitapyurduScraper,
  bkmkitap: bkmkitapScraper,
  idefix: idefixScraper,
  google: googleBooksScraper,
  openlibrary: openLibraryScraper,
}

// Simple in-memory cache with 24h TTL
const cache = new Map<string, { result: BookLookupResult | null; timestamp: number }>()
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

function getCacheKey(isbn: string, source: BookSource): string {
  return `${source}:${isbn}`
}

function getFromCache(isbn: string, source: BookSource): BookLookupResult | null | undefined {
  const key = getCacheKey(isbn, source)
  const cached = cache.get(key)

  if (!cached) return undefined

  if (Date.now() - cached.timestamp > CACHE_TTL) {
    cache.delete(key)
    return undefined
  }

  return cached.result
}

function setCache(isbn: string, source: BookSource, result: BookLookupResult | null): void {
  const key = getCacheKey(isbn, source)
  cache.set(key, { result, timestamp: Date.now() })
}

export async function lookupBook(
  isbn: string,
  source: BookSource,
): Promise<BookLookupResult | null> {
  // Normalize ISBN (remove hyphens and spaces)
  const normalizedIsbn = isbn.replace(/[-\s]/g, '')

  // Check cache first
  const cached = getFromCache(normalizedIsbn, source)
  if (cached !== undefined) {
    return cached
  }

  const scraper = scrapers[source]
  if (!scraper) {
    throw new Error(`Unknown source: ${source}`)
  }

  const result = await scraper.lookup(normalizedIsbn)

  // Cache the result (including null results to avoid repeated failed lookups)
  setCache(normalizedIsbn, source, result)

  return result
}

export async function lookupBookFromAllSources(
  isbn: string,
): Promise<{ source: BookSource; result: BookLookupResult } | null> {
  const normalizedIsbn = isbn.replace(/[-\s]/g, '')

  // Try sources in order of preference (Turkish first for Turkish ISBNs)
  const sourceOrder: BookSource[] =
    normalizedIsbn.startsWith('975') || normalizedIsbn.startsWith('978975')
      ? ['kitapyurdu', 'bkmkitap', 'idefix', 'google', 'openlibrary']
      : ['google', 'openlibrary', 'kitapyurdu', 'bkmkitap', 'idefix']

  for (const source of sourceOrder) {
    const result = await lookupBook(normalizedIsbn, source)
    if (result) {
      return { source, result }
    }
  }

  return null
}

export async function searchBooksByTitle(
  query: string,
  source?: BookSource,
): Promise<BookLookupResult[]> {
  const sourcesToSearch: BookSource[] = source
    ? [source]
    : ['kitapyurdu', 'bkmkitap', 'idefix', 'google', 'openlibrary']

  const results: BookLookupResult[] = []

  for (const src of sourcesToSearch) {
    const scraper = scrapers[src]
    if (scraper.searchByTitle) {
      const found = await scraper.searchByTitle(query)
      results.push(...found)
    }
  }

  // Deduplicate by title+author
  const seen = new Set<string>()
  return results.filter((book) => {
    const key = `${book.title.toLowerCase()}|${book.author.toLowerCase()}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export async function lookupBookByUrl(url: string): Promise<BookLookupResult | null> {
  // Determine which scraper to use based on the URL
  let source: BookSource | undefined
  if (url.includes('kitapyurdu.com')) source = 'kitapyurdu'
  else if (url.includes('bkmkitap.com')) source = 'bkmkitap'
  else if (url.includes('idefix.com')) source = 'idefix'

  if (!source) return null

  const scraper = scrapers[source]
  if (!scraper.lookupByUrl) return null

  return scraper.lookupByUrl(url)
}

export const availableSources: BookSource[] = [
  'kitapyurdu',
  'bkmkitap',
  'idefix',
  'google',
  'openlibrary',
]
