import { bookCollections, books, collections, db } from '@rafin/db'
import { and, desc, eq, isNull } from 'drizzle-orm'
import { Elysia, t } from 'elysia'
import { auth } from '../lib/auth'

export const collectionRoutes = new Elysia({ prefix: '/api/collections' })
  // Get user's collections
  .get('/', async ({ request, set }) => {
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session?.user) {
      set.status = 401
      return { error: 'Unauthorized' }
    }

    const result = await db
      .select()
      .from(collections)
      .where(eq(collections.userId, session.user.id))
      .orderBy(desc(collections.createdAt))

    // Get book counts for each collection
    const collectionsWithCounts = await Promise.all(
      result.map(async (collection) => {
        const bookCount = await db
          .select()
          .from(bookCollections)
          .where(eq(bookCollections.collectionId, collection.id))

        return {
          ...collection,
          bookCount: bookCount.length,
        }
      }),
    )

    return { collections: collectionsWithCounts }
  })

  // Get single collection with books
  .get(
    '/:id',
    async ({ params, request, set }) => {
      const session = await auth.api.getSession({ headers: request.headers })

      if (!session?.user) {
        set.status = 401
        return { error: 'Unauthorized' }
      }

      const collection = await db
        .select()
        .from(collections)
        .where(and(eq(collections.id, Number(params.id)), eq(collections.userId, session.user.id)))
        .limit(1)

      if (collection.length === 0) {
        set.status = 404
        return { error: 'Collection not found' }
      }

      // Get books in collection
      const collectionBooks = await db
        .select({
          book: books,
          addedAt: bookCollections.addedAt,
          position: bookCollections.position,
        })
        .from(bookCollections)
        .innerJoin(books, eq(bookCollections.bookId, books.id))
        .where(and(eq(bookCollections.collectionId, Number(params.id)), isNull(books.deletedAt)))
        .orderBy(bookCollections.position)

      return {
        collection: collection[0],
        books: collectionBooks,
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    },
  )

  // Create collection
  .post(
    '/',
    async ({ body, request, set }) => {
      const session = await auth.api.getSession({ headers: request.headers })

      if (!session?.user) {
        set.status = 401
        return { error: 'Unauthorized' }
      }

      const result = await db
        .insert(collections)
        .values({
          userId: session.user.id,
          name: body.name,
          description: body.description || null,
          color: body.color || null,
          icon: body.icon || null,
          isSmart: body.isSmart || false,
          smartFilters: body.smartFilters || null,
        })
        .returning()

      return { collection: result[0] }
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        description: t.Optional(t.String()),
        color: t.Optional(t.String()),
        icon: t.Optional(t.String()),
        isSmart: t.Optional(t.Boolean()),
        smartFilters: t.Optional(t.Any()),
      }),
    },
  )

  // Update collection
  .patch(
    '/:id',
    async ({ params, body, request, set }) => {
      const session = await auth.api.getSession({ headers: request.headers })

      if (!session?.user) {
        set.status = 401
        return { error: 'Unauthorized' }
      }

      const existing = await db
        .select()
        .from(collections)
        .where(and(eq(collections.id, Number(params.id)), eq(collections.userId, session.user.id)))
        .limit(1)

      if (existing.length === 0) {
        set.status = 404
        return { error: 'Collection not found' }
      }

      const result = await db
        .update(collections)
        .set({
          ...body,
          updatedAt: new Date(),
        })
        .where(eq(collections.id, Number(params.id)))
        .returning()

      return { collection: result[0] }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        name: t.Optional(t.String()),
        description: t.Optional(t.String()),
        color: t.Optional(t.String()),
        icon: t.Optional(t.String()),
        isSmart: t.Optional(t.Boolean()),
        smartFilters: t.Optional(t.Any()),
      }),
    },
  )

  // Delete collection
  .delete(
    '/:id',
    async ({ params, request, set }) => {
      const session = await auth.api.getSession({ headers: request.headers })

      if (!session?.user) {
        set.status = 401
        return { error: 'Unauthorized' }
      }

      const existing = await db
        .select()
        .from(collections)
        .where(and(eq(collections.id, Number(params.id)), eq(collections.userId, session.user.id)))
        .limit(1)

      if (existing.length === 0) {
        set.status = 404
        return { error: 'Collection not found' }
      }

      await db.delete(collections).where(eq(collections.id, Number(params.id)))

      return { success: true }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    },
  )

  // Add book to collection
  .post(
    '/:id/books',
    async ({ params, body, request, set }) => {
      const session = await auth.api.getSession({ headers: request.headers })

      if (!session?.user) {
        set.status = 401
        return { error: 'Unauthorized' }
      }

      // Verify collection belongs to user
      const collection = await db
        .select()
        .from(collections)
        .where(and(eq(collections.id, Number(params.id)), eq(collections.userId, session.user.id)))
        .limit(1)

      if (collection.length === 0) {
        set.status = 404
        return { error: 'Collection not found' }
      }

      // Check if book exists
      const book = await db
        .select()
        .from(books)
        .where(and(eq(books.id, body.bookId), isNull(books.deletedAt)))
        .limit(1)

      if (book.length === 0) {
        set.status = 404
        return { error: 'Book not found' }
      }

      // Get max position
      const maxPosition = await db
        .select({ position: bookCollections.position })
        .from(bookCollections)
        .where(eq(bookCollections.collectionId, Number(params.id)))
        .orderBy(desc(bookCollections.position))
        .limit(1)

      const newPosition = (maxPosition[0]?.position ?? -1) + 1

      try {
        await db.insert(bookCollections).values({
          bookId: body.bookId,
          collectionId: Number(params.id),
          position: newPosition,
        })
      } catch (error: unknown) {
        // Handle duplicate entry
        if ((error as { code?: string }).code === '23505') {
          set.status = 409
          return { error: 'Book already in collection' }
        }
        throw error
      }

      return { success: true }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        bookId: t.Number(),
      }),
    },
  )

  // Remove book from collection
  .delete(
    '/:id/books/:bookId',
    async ({ params, request, set }) => {
      const session = await auth.api.getSession({ headers: request.headers })

      if (!session?.user) {
        set.status = 401
        return { error: 'Unauthorized' }
      }

      // Verify collection belongs to user
      const collection = await db
        .select()
        .from(collections)
        .where(and(eq(collections.id, Number(params.id)), eq(collections.userId, session.user.id)))
        .limit(1)

      if (collection.length === 0) {
        set.status = 404
        return { error: 'Collection not found' }
      }

      await db
        .delete(bookCollections)
        .where(
          and(
            eq(bookCollections.collectionId, Number(params.id)),
            eq(bookCollections.bookId, Number(params.bookId)),
          ),
        )

      return { success: true }
    },
    {
      params: t.Object({
        id: t.String(),
        bookId: t.String(),
      }),
    },
  )
