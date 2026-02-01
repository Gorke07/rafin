import { Elysia, t } from 'elysia'
import { logger } from '../lib/logger'
import {
  type BookSource,
  availableSources,
  lookupBook,
  lookupBookByUrl,
  lookupBookFromAllSources,
  searchBooksByTitle,
} from '../services/scrapers'

export const bookLookupRoutes = new Elysia({ prefix: '/api/book-lookup' })
  .get(
    '/',
    async ({ query, set }) => {
      const { isbn, source } = query

      if (!isbn) {
        set.status = 400
        return { error: 'ISBN is required' }
      }

      // Normalize ISBN
      const normalizedIsbn = isbn.replace(/[-\s]/g, '')

      // Validate ISBN format (10 or 13 digits)
      if (!/^(\d{10}|\d{13})$/.test(normalizedIsbn)) {
        set.status = 400
        return { error: 'Invalid ISBN format. Must be 10 or 13 digits.' }
      }

      try {
        if (source) {
          // Lookup from specific source
          if (!availableSources.includes(source as BookSource)) {
            set.status = 400
            return { error: `Invalid source. Available sources: ${availableSources.join(', ')}` }
          }

          const result = await lookupBook(normalizedIsbn, source as BookSource)

          if (!result) {
            set.status = 404
            return { error: 'Book not found', source }
          }

          return { book: result, source }
        }
        // Try all sources
        const result = await lookupBookFromAllSources(normalizedIsbn)

        if (!result) {
          set.status = 404
          return { error: 'Book not found in any source' }
        }

        return { book: result.result, source: result.source }
      } catch (error) {
        logger.error({ error }, 'Book lookup error')
        set.status = 500
        return { error: 'Failed to lookup book' }
      }
    },
    {
      query: t.Object({
        isbn: t.String(),
        source: t.Optional(t.String()),
      }),
    },
  )

  .get(
    '/search',
    async ({ query, set }) => {
      const { q, source } = query

      if (!q || q.trim().length < 2) {
        set.status = 400
        return { error: 'Search query must be at least 2 characters' }
      }

      try {
        const results = await searchBooksByTitle(
          q.trim(),
          source && availableSources.includes(source as BookSource)
            ? (source as BookSource)
            : undefined,
        )

        return { books: results }
      } catch (error) {
        logger.error({ error }, 'Book title search error')
        set.status = 500
        return { error: 'Failed to search books' }
      }
    },
    {
      query: t.Object({
        q: t.String(),
        source: t.Optional(t.String()),
      }),
    },
  )

  .get(
    '/detail',
    async ({ query, set }) => {
      const { url } = query

      if (!url) {
        set.status = 400
        return { error: 'URL is required' }
      }

      try {
        const result = await lookupBookByUrl(url)

        if (!result) {
          set.status = 404
          return { error: 'Book not found' }
        }

        return { book: result }
      } catch (error) {
        logger.error({ error }, 'Book detail lookup error')
        set.status = 500
        return { error: 'Failed to lookup book details' }
      }
    },
    {
      query: t.Object({
        url: t.String(),
      }),
    },
  )

  .get('/sources', () => {
    return {
      sources: availableSources.map((source) => ({
        id: source,
        name: {
          kitapyurdu: 'Kitapyurdu',
          bkmkitap: 'BKM Kitap',
          idefix: 'İdefix',
          google: 'Google Books',
          openlibrary: 'Open Library',
        }[source],
      })),
    }
  })
