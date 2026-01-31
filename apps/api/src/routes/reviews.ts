import { books, db, reviews, userBooks } from '@rafin/db'
import { and, eq, isNull } from 'drizzle-orm'
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

export const reviewsRoutes = new Elysia({ prefix: '/api/books' })
  .get(
    '/:id/review',
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
        return { review: null }
      }

      const result = await db
        .select()
        .from(reviews)
        .where(eq(reviews.userBookId, userBook[0].id))
        .limit(1)

      return { review: result[0] || null }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    },
  )

  .post(
    '/:id/review',
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

      const existingReview = await db
        .select()
        .from(reviews)
        .where(eq(reviews.userBookId, userBook.id))
        .limit(1)

      if (existingReview.length > 0) {
        const result = await db
          .update(reviews)
          .set({
            rating: body.rating,
            content: body.content ?? existingReview[0].content,
            isPrivate: body.isPrivate ?? existingReview[0].isPrivate,
            updatedAt: new Date(),
          })
          .where(eq(reviews.id, existingReview[0].id))
          .returning()

        return { review: result[0] }
      }

      const result = await db
        .insert(reviews)
        .values({
          userBookId: userBook.id,
          rating: body.rating,
          content: body.content || null,
          isPrivate: body.isPrivate ?? false,
        })
        .returning()

      return { review: result[0] }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        rating: t.Number({ minimum: 1, maximum: 5 }),
        content: t.Optional(t.String()),
        isPrivate: t.Optional(t.Boolean()),
      }),
    },
  )

  .delete(
    '/:id/review',
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
        return { error: 'Review not found' }
      }

      const existing = await db
        .select()
        .from(reviews)
        .where(eq(reviews.userBookId, userBook[0].id))
        .limit(1)

      if (existing.length === 0) {
        set.status = 404
        return { error: 'Review not found' }
      }

      await db.delete(reviews).where(eq(reviews.id, existing[0].id))

      return { success: true }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    },
  )
