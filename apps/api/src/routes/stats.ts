import {
  authors,
  bookCategories,
  books,
  categories,
  db,
  locations,
  publishers,
  readingGoals,
  reviews,
  userBooks,
} from '@rafin/db'
import { and, avg, count, desc, eq, gte, isNotNull, isNull, sql, sum } from 'drizzle-orm'
import { Elysia } from 'elysia'
import { auth } from '../lib/auth'
import { logger } from '../lib/logger'

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

  .get('/charts', async () => {
    const twelveMonthsAgo = new Date()
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11)
    twelveMonthsAgo.setDate(1)
    twelveMonthsAgo.setHours(0, 0, 0, 0)

    const monthlyCompleted = await db
      .select({
        month: sql<string>`to_char(${userBooks.finishedAt}, 'YYYY-MM')`,
        count: count(),
      })
      .from(userBooks)
      .where(
        and(
          eq(userBooks.status, 'completed'),
          isNotNull(userBooks.finishedAt),
          gte(userBooks.finishedAt, twelveMonthsAgo),
        ),
      )
      .groupBy(sql`to_char(${userBooks.finishedAt}, 'YYYY-MM')`)
      .orderBy(sql`to_char(${userBooks.finishedAt}, 'YYYY-MM')`)

    const statusCounts = await db
      .select({
        status: userBooks.status,
        count: count(),
      })
      .from(userBooks)
      .groupBy(userBooks.status)

    const readingStatus: Record<string, number> = { tbr: 0, reading: 0, completed: 0, dnf: 0 }
    for (const row of statusCounts) {
      if (row.status in readingStatus) {
        readingStatus[row.status] = row.count
      }
    }

    const monthlyAdded = await db
      .select({
        month: sql<string>`to_char(${books.createdAt}, 'YYYY-MM')`,
        count: count(),
      })
      .from(books)
      .where(and(isNull(books.deletedAt), gte(books.createdAt, twelveMonthsAgo)))
      .groupBy(sql`to_char(${books.createdAt}, 'YYYY-MM')`)
      .orderBy(sql`to_char(${books.createdAt}, 'YYYY-MM')`)

    const avgRatingResult = await db.select({ avg: avg(reviews.rating) }).from(reviews)
    const averageRating = avgRatingResult[0]?.avg
      ? Number.parseFloat(String(avgRatingResult[0].avg))
      : null

    const now = new Date()
    const months: string[] = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    }

    const completedMap = new Map(monthlyCompleted.map((r) => [r.month, r.count]))
    const addedMap = new Map(monthlyAdded.map((r) => [r.month, r.count]))

    const monthlyReading = months.map((m) => ({ month: m, completed: completedMap.get(m) ?? 0 }))
    const monthlyBooksAdded = months.map((m) => ({ month: m, count: addedMap.get(m) ?? 0 }))

    return {
      monthlyReading,
      readingStatus,
      monthlyBooksAdded,
      averageRating,
    }
  })

  .get('/reading', async ({ request }) => {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) {
      return { error: 'Unauthorized' }
    }
    const user = session.user

    const now = new Date()
    const currentYear = now.getFullYear()
    const startOfYear = new Date(currentYear, 0, 1)

    const twelveMonthsAgo = new Date()
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11)
    twelveMonthsAgo.setDate(1)
    twelveMonthsAgo.setHours(0, 0, 0, 0)

    try {
      const [
        totalPagesResult,
        booksThisYearResult,
        avgDaysResult,
        currentlyReadingResult,
        monthlyPagesResult,
        categoryBreakdownResult,
        timelineResult,
        goalResult,
      ] = await Promise.all([
        // 1. Total pages read (completed books)
        db
          .select({ total: sum(books.pageCount) })
          .from(userBooks)
          .innerJoin(books, eq(userBooks.bookId, books.id))
          .where(
            and(
              eq(userBooks.userId, user.id),
              eq(userBooks.status, 'completed'),
              isNotNull(books.pageCount),
            ),
          ),

        // 2. Books completed this year
        db
          .select({ count: count() })
          .from(userBooks)
          .where(
            and(
              eq(userBooks.userId, user.id),
              eq(userBooks.status, 'completed'),
              gte(userBooks.finishedAt, startOfYear),
            ),
          ),

        // 3. Average days to finish
        db
          .select({
            avg: sql<string>`AVG(EXTRACT(EPOCH FROM (${userBooks.finishedAt} - ${userBooks.startedAt})) / 86400)`,
          })
          .from(userBooks)
          .where(
            and(
              eq(userBooks.userId, user.id),
              eq(userBooks.status, 'completed'),
              isNotNull(userBooks.startedAt),
              isNotNull(userBooks.finishedAt),
            ),
          ),

        // 4. Currently reading count
        db
          .select({ count: count() })
          .from(userBooks)
          .where(and(eq(userBooks.userId, user.id), eq(userBooks.status, 'reading'))),

        // 5. Monthly pages (last 12 months)
        db
          .select({
            month: sql<string>`to_char(${userBooks.finishedAt}, 'YYYY-MM')`,
            pages: sum(books.pageCount),
          })
          .from(userBooks)
          .innerJoin(books, eq(userBooks.bookId, books.id))
          .where(
            and(
              eq(userBooks.userId, user.id),
              eq(userBooks.status, 'completed'),
              isNotNull(userBooks.finishedAt),
              gte(userBooks.finishedAt, twelveMonthsAgo),
              isNotNull(books.pageCount),
            ),
          )
          .groupBy(sql`to_char(${userBooks.finishedAt}, 'YYYY-MM')`)
          .orderBy(sql`to_char(${userBooks.finishedAt}, 'YYYY-MM')`),

        // 6. Category breakdown (completed books)
        db
          .select({
            name: categories.name,
            count: count(),
          })
          .from(userBooks)
          .innerJoin(books, eq(userBooks.bookId, books.id))
          .innerJoin(bookCategories, eq(books.id, bookCategories.bookId))
          .innerJoin(categories, eq(bookCategories.categoryId, categories.id))
          .where(and(eq(userBooks.userId, user.id), eq(userBooks.status, 'completed')))
          .groupBy(categories.name)
          .orderBy(desc(count())),

        // 7. Timeline (completed + reading books)
        db
          .select({
            bookId: books.id,
            title: books.title,
            coverPath: books.coverPath,
            coverUrl: books.coverUrl,
            pageCount: books.pageCount,
            status: userBooks.status,
            startedAt: userBooks.startedAt,
            finishedAt: userBooks.finishedAt,
          })
          .from(userBooks)
          .innerJoin(books, eq(userBooks.bookId, books.id))
          .where(
            and(
              eq(userBooks.userId, user.id),
              sql`${userBooks.status} IN ('completed', 'reading')`,
            ),
          )
          .orderBy(desc(sql`COALESCE(${userBooks.finishedAt}, ${userBooks.startedAt})`))
          .limit(20),

        // 8. Reading goal for current year
        db
          .select()
          .from(readingGoals)
          .where(and(eq(readingGoals.userId, user.id), eq(readingGoals.year, currentYear)))
          .limit(1),
      ])

      const totalPagesRead = Number(totalPagesResult[0]?.total) || 0
      const booksThisYear = booksThisYearResult[0]?.count ?? 0
      const avgDaysToFinish = avgDaysResult[0]?.avg
        ? Math.round(Number(avgDaysResult[0].avg))
        : null
      const currentlyReading = currentlyReadingResult[0]?.count ?? 0

      // Fill in 12-month grid for monthly pages
      const months: string[] = []
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
      }
      const pagesMap = new Map(monthlyPagesResult.map((r) => [r.month, Number(r.pages) || 0]))
      const monthlyPages = months.map((m) => ({ month: m, pages: pagesMap.get(m) ?? 0 }))

      const readingGoal = goalResult[0]
        ? { targetBooks: goalResult[0].targetBooks, completedBooks: booksThisYear }
        : null

      return {
        totalPagesRead,
        booksThisYear,
        avgDaysToFinish,
        currentlyReading,
        monthlyPages,
        categoryBreakdown: categoryBreakdownResult,
        timeline: timelineResult,
        readingGoal,
      }
    } catch (err) {
      logger.error({ error: err }, 'Reading stats error')
      throw err
    }
  })
