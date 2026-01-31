import { books, db, quotes, userBooks } from '@rafin/db'
import { and, desc, eq, isNull } from 'drizzle-orm'
import { Elysia, t } from 'elysia'
import { auth } from '../lib/auth'

async function getOrCreateUserBook(userId: string, bookId: number) {
  const existing = await db
    .select()
    .from(userBooks)
    .where(and(eq(userBooks.userId, userId), eq(userBooks.bookId, bookId)))
    .limit(1)

  if (existing.length > 0) {
    return existing[0]
  }

  const created = await db
    .insert(userBooks)
    .values({
      userId,
      bookId,
      status: 'tbr',
      currentPage: 0,
    })
    .returning()

  return created[0]
}

export const quotesRoutes = new Elysia({ prefix: '/api/books' })
  .get(
    '/:id/quotes',
    async ({ params, request, set }) => {
      const session = await auth.api.getSession({ headers: request.headers })

      if (!session?.user) {
        set.status = 401
        return { error: 'Unauthorized' }
      }

      const book = await db
        .select()
        .from(books)
        .where(and(eq(books.id, Number(params.id)), isNull(books.deletedAt)))
        .limit(1)

      if (book.length === 0) {
        set.status = 404
        return { error: 'Book not found' }
      }

      const userBook = await db
        .select()
        .from(userBooks)
        .where(and(eq(userBooks.userId, session.user.id), eq(userBooks.bookId, Number(params.id))))
        .limit(1)

      if (userBook.length === 0) {
        return { quotes: [] }
      }

      const result = await db
        .select()
        .from(quotes)
        .where(eq(quotes.userBookId, userBook[0].id))
        .orderBy(desc(quotes.createdAt))

      return { quotes: result }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    },
  )

  .post(
    '/:id/quotes',
    async ({ params, body, request, set }) => {
      const session = await auth.api.getSession({ headers: request.headers })

      if (!session?.user) {
        set.status = 401
        return { error: 'Unauthorized' }
      }

      const book = await db
        .select()
        .from(books)
        .where(and(eq(books.id, Number(params.id)), isNull(books.deletedAt)))
        .limit(1)

      if (book.length === 0) {
        set.status = 404
        return { error: 'Book not found' }
      }

      const userBook = await getOrCreateUserBook(session.user.id, Number(params.id))

      const result = await db
        .insert(quotes)
        .values({
          userBookId: userBook.id,
          content: body.content,
          pageNumber: body.pageNumber || null,
          isPrivate: body.isPrivate ?? true,
        })
        .returning()

      return { quote: result[0] }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        content: t.String({ minLength: 1 }),
        pageNumber: t.Optional(t.Number()),
        isPrivate: t.Optional(t.Boolean()),
      }),
    },
  )

  .patch(
    '/:id/quotes/:quoteId',
    async ({ params, body, request, set }) => {
      const session = await auth.api.getSession({ headers: request.headers })

      if (!session?.user) {
        set.status = 401
        return { error: 'Unauthorized' }
      }

      const userBook = await db
        .select()
        .from(userBooks)
        .where(and(eq(userBooks.userId, session.user.id), eq(userBooks.bookId, Number(params.id))))
        .limit(1)

      if (userBook.length === 0) {
        set.status = 404
        return { error: 'Quote not found' }
      }

      const existing = await db
        .select()
        .from(quotes)
        .where(and(eq(quotes.id, Number(params.quoteId)), eq(quotes.userBookId, userBook[0].id)))
        .limit(1)

      if (existing.length === 0) {
        set.status = 404
        return { error: 'Quote not found' }
      }

      const result = await db
        .update(quotes)
        .set({
          content: body.content ?? existing[0].content,
          pageNumber: body.pageNumber ?? existing[0].pageNumber,
          isPrivate: body.isPrivate ?? existing[0].isPrivate,
          updatedAt: new Date(),
        })
        .where(eq(quotes.id, Number(params.quoteId)))
        .returning()

      return { quote: result[0] }
    },
    {
      params: t.Object({
        id: t.String(),
        quoteId: t.String(),
      }),
      body: t.Object({
        content: t.Optional(t.String()),
        pageNumber: t.Optional(t.Number()),
        isPrivate: t.Optional(t.Boolean()),
      }),
    },
  )

  .delete(
    '/:id/quotes/:quoteId',
    async ({ params, request, set }) => {
      const session = await auth.api.getSession({ headers: request.headers })

      if (!session?.user) {
        set.status = 401
        return { error: 'Unauthorized' }
      }

      const userBook = await db
        .select()
        .from(userBooks)
        .where(and(eq(userBooks.userId, session.user.id), eq(userBooks.bookId, Number(params.id))))
        .limit(1)

      if (userBook.length === 0) {
        set.status = 404
        return { error: 'Quote not found' }
      }

      const existing = await db
        .select()
        .from(quotes)
        .where(and(eq(quotes.id, Number(params.quoteId)), eq(quotes.userBookId, userBook[0].id)))
        .limit(1)

      if (existing.length === 0) {
        set.status = 404
        return { error: 'Quote not found' }
      }

      await db.delete(quotes).where(eq(quotes.id, Number(params.quoteId)))

      return { success: true }
    },
    {
      params: t.Object({
        id: t.String(),
        quoteId: t.String(),
      }),
    },
  )
