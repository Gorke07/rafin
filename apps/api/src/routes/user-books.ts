import { books, db, userBooks } from '@rafin/db'
import { and, desc, eq } from 'drizzle-orm'
import { Elysia, t } from 'elysia'
import { auth } from '../lib/auth'

type ReadingStatus = 'tbr' | 'reading' | 'completed' | 'dnf'

export const userBookRoutes = new Elysia({ prefix: '/api/user-books' })
  .derive(async ({ request }) => {
    const session = await auth.api.getSession({ headers: request.headers })
    return {
      user: session?.user ?? null,
      session: session?.session ?? null,
    }
  })

  .get(
    '/',
    async ({ user, query, set }) => {
      if (!user) {
        set.status = 401
        return { error: 'Unauthorized' }
      }

      const { status, bookId } = query

      const conditions = [eq(userBooks.userId, user.id)]
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
        .where(and(...conditions))
        .orderBy(desc(userBooks.updatedAt))

      return { userBooks: result }
    },
    {
      query: t.Object({
        status: t.Optional(t.String()),
        bookId: t.Optional(t.String()),
      }),
    },
  )

  .post(
    '/:bookId',
    async ({ params, body, user, set }) => {
      if (!user) {
        set.status = 401
        return { error: 'Unauthorized' }
      }

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
        .where(and(eq(userBooks.userId, user.id), eq(userBooks.bookId, Number(params.bookId))))
        .limit(1)

      if (existing.length > 0) {
        set.status = 400
        return { error: 'Book already in user library' }
      }

      const result = await db
        .insert(userBooks)
        .values({
          userId: user.id,
          bookId: Number(params.bookId),
          status: (body.status as ReadingStatus) || 'tbr',
          currentPage: body.currentPage || 0,
          startedAt: body.status === 'reading' ? new Date() : null,
        })
        .returning()

      return { userBook: result[0] }
    },
    {
      params: t.Object({
        bookId: t.String(),
      }),
      body: t.Object({
        status: t.Optional(t.String()),
        currentPage: t.Optional(t.Number()),
      }),
    },
  )

  .patch(
    '/:bookId',
    async ({ params, body, user, set }) => {
      if (!user) {
        set.status = 401
        return { error: 'Unauthorized' }
      }

      const existing = await db
        .select()
        .from(userBooks)
        .where(and(eq(userBooks.userId, user.id), eq(userBooks.bookId, Number(params.bookId))))
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
        .where(and(eq(userBooks.userId, user.id), eq(userBooks.bookId, Number(params.bookId))))
        .returning()

      return { userBook: result[0] }
    },
    {
      params: t.Object({
        bookId: t.String(),
      }),
      body: t.Object({
        status: t.Optional(t.String()),
        currentPage: t.Optional(t.Number()),
      }),
    },
  )

  .delete(
    '/:bookId',
    async ({ params, user, set }) => {
      if (!user) {
        set.status = 401
        return { error: 'Unauthorized' }
      }

      await db
        .delete(userBooks)
        .where(and(eq(userBooks.userId, user.id), eq(userBooks.bookId, Number(params.bookId))))

      return { success: true }
    },
    {
      params: t.Object({
        bookId: t.String(),
      }),
    },
  )
