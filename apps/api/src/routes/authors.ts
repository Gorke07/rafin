import { authors, bookAuthors, books, db } from '@rafin/db'
import { and, count, desc, eq, isNull, like } from 'drizzle-orm'
import { Elysia, t } from 'elysia'

export const authorRoutes = new Elysia({ prefix: '/api/authors' })
  // List authors (with search)
  .get(
    '/',
    async ({ query }) => {
      const { q } = query

      const result = q
        ? await db
            .select()
            .from(authors)
            .where(like(authors.name, `%${q}%`))
            .orderBy(authors.name)
        : await db.select().from(authors).orderBy(authors.name)

      // Get book counts
      const authorsWithCounts = await Promise.all(
        result.map(async (author) => {
          const bookCount = await db
            .select({ count: count() })
            .from(bookAuthors)
            .innerJoin(books, eq(bookAuthors.bookId, books.id))
            .where(and(eq(bookAuthors.authorId, author.id), isNull(books.deletedAt)))

          return { ...author, bookCount: bookCount[0]?.count ?? 0 }
        }),
      )

      return { authors: authorsWithCounts }
    },
    {
      query: t.Object({
        q: t.Optional(t.String()),
      }),
    },
  )

  // Get single author with books
  .get(
    '/:id',
    async ({ params, set }) => {
      const result = await db
        .select()
        .from(authors)
        .where(eq(authors.id, Number(params.id)))
        .limit(1)

      if (result.length === 0) {
        set.status = 404
        return { error: 'Author not found' }
      }

      const authorBooks = await db
        .select({ book: books })
        .from(bookAuthors)
        .innerJoin(books, eq(bookAuthors.bookId, books.id))
        .where(and(eq(bookAuthors.authorId, Number(params.id)), isNull(books.deletedAt)))
        .orderBy(desc(books.createdAt))

      return {
        author: result[0],
        books: authorBooks.map((b) => b.book),
      }
    },
    {
      params: t.Object({ id: t.String() }),
    },
  )

  // Create author
  .post(
    '/',
    async ({ body }) => {
      // Check uniqueness
      const existing = await db.select().from(authors).where(eq(authors.name, body.name)).limit(1)

      if (existing.length > 0) {
        // Return existing instead of error (for combobox create-on-type)
        return { author: existing[0], existed: true }
      }

      const result = await db
        .insert(authors)
        .values({
          name: body.name,
          bio: body.bio || null,
          photoUrl: body.photoUrl || null,
        })
        .returning()

      return { author: result[0], existed: false }
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        bio: t.Optional(t.String()),
        photoUrl: t.Optional(t.String()),
      }),
    },
  )

  // Update author
  .patch(
    '/:id',
    async ({ params, body, set }) => {
      const existing = await db
        .select()
        .from(authors)
        .where(eq(authors.id, Number(params.id)))
        .limit(1)

      if (existing.length === 0) {
        set.status = 404
        return { error: 'Author not found' }
      }

      const result = await db
        .update(authors)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(authors.id, Number(params.id)))
        .returning()

      return { author: result[0] }
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        name: t.Optional(t.String()),
        bio: t.Optional(t.String()),
        photoUrl: t.Optional(t.String()),
      }),
    },
  )

  // Delete author (only if no books)
  .delete(
    '/:id',
    async ({ params, set }) => {
      const existing = await db
        .select()
        .from(authors)
        .where(eq(authors.id, Number(params.id)))
        .limit(1)

      if (existing.length === 0) {
        set.status = 404
        return { error: 'Author not found' }
      }

      // Check if author has books
      const bookCount = await db
        .select({ count: count() })
        .from(bookAuthors)
        .where(eq(bookAuthors.authorId, Number(params.id)))

      if ((bookCount[0]?.count ?? 0) > 0) {
        set.status = 409
        return { error: 'Cannot delete author with associated books' }
      }

      await db.delete(authors).where(eq(authors.id, Number(params.id)))

      return { success: true }
    },
    {
      params: t.Object({ id: t.String() }),
    },
  )
