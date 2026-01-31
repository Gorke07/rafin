import {
  authors,
  bookAuthors,
  bookPublishers,
  books,
  db,
  publishers,
  reviews,
  userBooks,
} from '@rafin/db'
import { and, eq, isNull } from 'drizzle-orm'
import { Elysia, t } from 'elysia'
import { auth } from '../lib/auth'
import { type ImportResult, type ParsedImportBook, parseGoodreadsCSV } from '../services/csv-parser'
import { downloadAndProcessCover } from '../services/image'
import { lookupBookFromAllSources } from '../services/scrapers'

async function getOrCreateAuthor(name: string): Promise<number> {
  const existing = await db
    .select({ id: authors.id })
    .from(authors)
    .where(eq(authors.name, name))
    .limit(1)

  if (existing.length > 0) return existing[0].id

  const result = await db.insert(authors).values({ name }).returning({ id: authors.id })
  return result[0].id
}

async function getOrCreatePublisher(name: string): Promise<number> {
  const existing = await db
    .select({ id: publishers.id })
    .from(publishers)
    .where(eq(publishers.name, name))
    .limit(1)

  if (existing.length > 0) return existing[0].id

  const result = await db.insert(publishers).values({ name }).returning({ id: publishers.id })
  return result[0].id
}

async function importSingleBook(
  parsed: ParsedImportBook,
  userId: string,
  enrichWithISBN: boolean,
): Promise<{ success: boolean; error?: string }> {
  try {
    const existingByIsbn = parsed.isbn
      ? await db
          .select({ id: books.id })
          .from(books)
          .where(and(eq(books.isbn, parsed.isbn), isNull(books.deletedAt)))
          .limit(1)
      : []

    if (existingByIsbn.length > 0) {
      return { success: false, error: `Duplicate ISBN: ${parsed.isbn} (${parsed.title})` }
    }

    let coverUrl: string | null = null
    let coverPath: string | null = null
    let description: string | null = null
    let language: string | null = null
    let enrichedPageCount = parsed.pageCount
    let enrichedYear = parsed.publishedYear

    if (enrichWithISBN && parsed.isbn) {
      try {
        const lookup = await lookupBookFromAllSources(parsed.isbn)
        if (lookup?.result) {
          if (lookup.result.coverUrl) {
            const processed = await downloadAndProcessCover(lookup.result.coverUrl)
            if (processed) {
              coverPath = processed.coverPath
            } else {
              coverUrl = lookup.result.coverUrl
            }
          }
          description = lookup.result.description || null
          language = lookup.result.language || null
          if (!enrichedPageCount && lookup.result.pageCount) {
            enrichedPageCount = lookup.result.pageCount
          }
          if (!enrichedYear && lookup.result.publishedYear) {
            enrichedYear = lookup.result.publishedYear
          }
        }
      } catch {}
    }

    const [newBook] = await db
      .insert(books)
      .values({
        title: parsed.title,
        isbn: parsed.isbn,
        pageCount: enrichedPageCount,
        publishedYear: enrichedYear,
        bindingType: parsed.bindingType,
        coverUrl,
        coverPath,
        description,
        language,
      })
      .returning()

    const authorIds = await Promise.all(parsed.authors.map(getOrCreateAuthor))
    if (authorIds.length > 0) {
      await db.insert(bookAuthors).values(
        authorIds.map((authorId, index) => ({
          bookId: newBook.id,
          authorId,
          order: index,
        })),
      )
    }

    if (parsed.publisher) {
      const publisherId = await getOrCreatePublisher(parsed.publisher)
      await db.insert(bookPublishers).values({
        bookId: newBook.id,
        publisherId,
      })
    }

    const [userBook] = await db
      .insert(userBooks)
      .values({
        userId,
        bookId: newBook.id,
        status: parsed.status,
        startedAt: parsed.status === 'reading' ? parsed.dateAdded || new Date() : null,
        finishedAt: parsed.dateRead,
        createdAt: parsed.dateAdded || new Date(),
      })
      .returning()

    if (parsed.rating && parsed.rating > 0) {
      await db.insert(reviews).values({
        userBookId: userBook.id,
        rating: parsed.rating,
        content: parsed.review,
      })
    }

    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: `${parsed.title}: ${message}` }
  }
}

export const importRoutes = new Elysia({ prefix: '/api/import' }).post(
  '/goodreads',
  async ({ body, request, set }) => {
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session?.user) {
      set.status = 401
      return { error: 'Unauthorized' }
    }

    const file = body.file as File

    if (!file) {
      set.status = 400
      return { error: 'No file provided' }
    }

    if (!file.name.endsWith('.csv')) {
      set.status = 400
      return { error: 'File must be a CSV' }
    }

    const csvContent = await file.text()
    const parsed = parseGoodreadsCSV(csvContent)

    if (parsed.length === 0) {
      set.status = 400
      return { error: 'No valid books found in CSV' }
    }

    const enrichWithISBN = body.enrichWithISBN === 'true' || body.enrichWithISBN === true

    const result: ImportResult = {
      total: parsed.length,
      imported: 0,
      skipped: 0,
      errors: [],
    }

    for (const book of parsed) {
      const importResult = await importSingleBook(book, session.user.id, enrichWithISBN)
      if (importResult.success) {
        result.imported++
      } else {
        result.skipped++
        if (importResult.error) {
          result.errors.push(importResult.error)
        }
      }
    }

    return { result }
  },
  {
    body: t.Object({
      file: t.File(),
      enrichWithISBN: t.Optional(t.Any()),
    }),
  },
)
