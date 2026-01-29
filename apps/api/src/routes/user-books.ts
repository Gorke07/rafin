import { Elysia, t } from 'elysia'
import { db, userBooks, books } from '@rafin/db'
import { eq, and, desc } from 'drizzle-orm'

type ReadingStatus = 'tbr' | 'reading' | 'completed' | 'dnf'

export const userBookRoutes = new Elysia({ prefix: '/api/user-books' })
  .get('/', async ({ query }) => {
    const { userId, status, bookId } = query

    const conditions = []
    if (userId) {
      conditions.push(eq(userBooks.userId, userId))
    }
    if (status) {
      conditions.push(eq(userBooks.status, status as ReadingStatus))
    }
    if (bookId) {
      conditions.push(eq(userBooks.bookId, Number(bookId)))
    }

    const result = await db
      .select({
        userBook: userBooks,
        book: books,
      })
      .from(userBooks)
      .innerJoin(books, eq(userBooks.bookId, books.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(userBooks.updatedAt))

    return { userBooks: result }
  }, {
    query: t.Object({
      userId: t.Optional(t.String()),
      status: t.Optional(t.String()),
      bookId: t.Optional(t.String()),
    })
  })

  .post('/:bookId', async ({ params, body, set }) => {
    // Check if book exists
    const bookExists = await db
      .select()
      .from(books)
      .where(eq(books.id, Number(params.bookId)))
      .limit(1)

    if (bookExists.length === 0) {
      set.status = 404
      return { error: 'Book not found' }
    }

    // Check if already exists
    const existing = await db
      .select()
      .from(userBooks)
      .where(
        and(
          eq(userBooks.userId, body.userId),
          eq(userBooks.bookId, Number(params.bookId))
        )
      )
      .limit(1)

    if (existing.length > 0) {
      set.status = 400
      return { error: 'Book already in user library' }
    }

    const result = await db.insert(userBooks).values({
      userId: body.userId,
      bookId: Number(params.bookId),
      status: (body.status as ReadingStatus) || 'tbr',
      currentPage: body.currentPage || 0,
      startedAt: body.status === 'reading' ? new Date() : null,
    }).returning()

    return { userBook: result[0] }
  }, {
    params: t.Object({
      bookId: t.String()
    }),
    body: t.Object({
      userId: t.String(),
      status: t.Optional(t.String()),
      currentPage: t.Optional(t.Number()),
    })
  })

  .patch('/:bookId', async ({ params, body, set }) => {
    const existing = await db
      .select()
      .from(userBooks)
      .where(
        and(
          eq(userBooks.userId, body.userId),
          eq(userBooks.bookId, Number(params.bookId))
        )
      )
      .limit(1)

    if (existing.length === 0) {
      set.status = 404
      return { error: 'User book not found' }
    }

    const updateData: Partial<typeof userBooks.$inferInsert> & { updatedAt: Date } = {
      updatedAt: new Date(),
    }

    if (body.status) {
      updateData.status = body.status as ReadingStatus
      if (body.status === 'reading' && !existing[0].startedAt) {
        updateData.startedAt = new Date()
      }
      if (body.status === 'completed' || body.status === 'dnf') {
        updateData.finishedAt = new Date()
      }
    }

    if (body.currentPage !== undefined) {
      updateData.currentPage = body.currentPage
    }

    const result = await db
      .update(userBooks)
      .set(updateData)
      .where(
        and(
          eq(userBooks.userId, body.userId),
          eq(userBooks.bookId, Number(params.bookId))
        )
      )
      .returning()

    return { userBook: result[0] }
  }, {
    params: t.Object({
      bookId: t.String()
    }),
    body: t.Object({
      userId: t.String(),
      status: t.Optional(t.String()),
      currentPage: t.Optional(t.Number()),
    })
  })

  .delete('/:bookId', async ({ params, query, set }) => {
    const { userId } = query

    if (!userId) {
      set.status = 400
      return { error: 'userId is required' }
    }

    await db
      .delete(userBooks)
      .where(
        and(
          eq(userBooks.userId, userId),
          eq(userBooks.bookId, Number(params.bookId))
        )
      )

    return { success: true }
  }, {
    params: t.Object({
      bookId: t.String()
    }),
    query: t.Object({
      userId: t.String()
    })
  })
