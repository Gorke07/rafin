import { bookPublishers, books, db, publishers } from '@rafin/db'
import { and, count, desc, eq, ilike, isNull, like } from 'drizzle-orm'
import { Elysia, t } from 'elysia'
import { normalizePublisher } from '../services/normalize-publisher'

export const publisherRoutes = new Elysia({ prefix: '/api/publishers' })
  // List publishers (with search)
  .get(
    '/',
    async ({ query }) => {
      const { q } = query

      const result = q
        ? await db
            .select()
            .from(publishers)
            .where(like(publishers.name, `%${q}%`))
            .orderBy(publishers.name)
        : await db.select().from(publishers).orderBy(publishers.name)

      const publishersWithCounts = await Promise.all(
        result.map(async (publisher) => {
          const bookCount = await db
            .select({ count: count() })
            .from(bookPublishers)
            .innerJoin(books, eq(bookPublishers.bookId, books.id))
            .where(and(eq(bookPublishers.publisherId, publisher.id), isNull(books.deletedAt)))

          return { ...publisher, bookCount: bookCount[0]?.count ?? 0 }
        }),
      )

      return { publishers: publishersWithCounts }
    },
    {
      query: t.Object({
        q: t.Optional(t.String()),
      }),
    },
  )

  // Get single publisher with books
  .get(
    '/:id',
    async ({ params, set }) => {
      const result = await db
        .select()
        .from(publishers)
        .where(eq(publishers.id, Number(params.id)))
        .limit(1)

      if (result.length === 0) {
        set.status = 404
        return { error: 'Publisher not found' }
      }

      const pubBooks = await db
        .select({ book: books })
        .from(bookPublishers)
        .innerJoin(books, eq(bookPublishers.bookId, books.id))
        .where(and(eq(bookPublishers.publisherId, Number(params.id)), isNull(books.deletedAt)))
        .orderBy(desc(books.createdAt))

      return {
        publisher: result[0],
        books: pubBooks.map((b) => b.book),
      }
    },
    {
      params: t.Object({ id: t.String() }),
    },
  )

  // Create publisher
  .post(
    '/',
    async ({ body }) => {
      const name = normalizePublisher(body.name)

      const existing = await db
        .select()
        .from(publishers)
        .where(ilike(publishers.name, name))
        .limit(1)

      if (existing.length > 0) {
        return { publisher: existing[0], existed: true }
      }

      const result = await db
        .insert(publishers)
        .values({
          name,
          website: body.website || null,
        })
        .returning()

      return { publisher: result[0], existed: false }
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        website: t.Optional(t.String()),
      }),
    },
  )

  // Update publisher
  .patch(
    '/:id',
    async ({ params, body, set }) => {
      const existing = await db
        .select()
        .from(publishers)
        .where(eq(publishers.id, Number(params.id)))
        .limit(1)

      if (existing.length === 0) {
        set.status = 404
        return { error: 'Publisher not found' }
      }

      const result = await db
        .update(publishers)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(publishers.id, Number(params.id)))
        .returning()

      return { publisher: result[0] }
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        name: t.Optional(t.String()),
        website: t.Optional(t.String()),
      }),
    },
  )

  // Delete publisher (only if no books)
  .delete(
    '/:id',
    async ({ params, set }) => {
      const existing = await db
        .select()
        .from(publishers)
        .where(eq(publishers.id, Number(params.id)))
        .limit(1)

      if (existing.length === 0) {
        set.status = 404
        return { error: 'Publisher not found' }
      }

      const bookCount = await db
        .select({ count: count() })
        .from(bookPublishers)
        .where(eq(bookPublishers.publisherId, Number(params.id)))

      if ((bookCount[0]?.count ?? 0) > 0) {
        set.status = 409
        return { error: 'Cannot delete publisher with associated books' }
      }

      await db.delete(publishers).where(eq(publishers.id, Number(params.id)))

      return { success: true }
    },
    {
      params: t.Object({ id: t.String() }),
    },
  )
