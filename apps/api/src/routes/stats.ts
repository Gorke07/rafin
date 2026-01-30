import { Elysia, t } from 'elysia'
import { db, authors, books, locations, publishers, userBooks } from '@rafin/db'
import { count, eq, isNull, sum } from 'drizzle-orm'

export const statsRoutes = new Elysia({ prefix: '/api/stats' })
  .get('/overview', async () => {
    // Total books
    const booksResult = await db
      .select({ count: count() })
      .from(books)
      .where(isNull(books.deletedAt))
    const totalBooks = booksResult[0]?.count ?? 0

    // Total locations
    const locationsResult = await db.select({ count: count() }).from(locations)
    const totalLocations = locationsResult[0]?.count ?? 0

    // Currently reading
    const readingResult = await db
      .select({ count: count() })
      .from(userBooks)
      .where(eq(userBooks.status, 'reading'))
    const currentlyReading = readingResult[0]?.count ?? 0

    // Completed
    const completedResult = await db
      .select({ count: count() })
      .from(userBooks)
      .where(eq(userBooks.status, 'completed'))
    const booksRead = completedResult[0]?.count ?? 0

    // Total authors
    const authorsResult = await db.select({ count: count() }).from(authors)
    const totalAuthors = authorsResult[0]?.count ?? 0

    // Total publishers
    const publishersResult = await db.select({ count: count() }).from(publishers)
    const totalPublishers = publishersResult[0]?.count ?? 0

    return {
      totalBooks,
      totalLocations,
      totalAuthors,
      totalPublishers,
      currentlyReading,
      booksRead,
    }
  })

  .get('/recent', async () => {
    // Recently added books
    const recentBooks = await db
      .select()
      .from(books)
      .where(isNull(books.deletedAt))
      .orderBy(books.createdAt)
      .limit(5)

    // Currently reading with book details
    const reading = await db
      .select({
        userBook: userBooks,
        book: books,
      })
      .from(userBooks)
      .innerJoin(books, eq(userBooks.bookId, books.id))
      .where(eq(userBooks.status, 'reading'))
      .limit(5)

    return {
      recentBooks,
      currentlyReading: reading,
    }
  })
