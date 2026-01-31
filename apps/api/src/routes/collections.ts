import {
  authors,
  bookAuthors,
  bookCategories,
  bookCollections,
  books,
  collections,
  db,
  reviews,
  userBooks,
} from '@rafin/db'
import { type SQL, and, desc, eq, gte, inArray, isNull, lte, or } from 'drizzle-orm'
import { Elysia, t } from 'elysia'
import { auth } from '../lib/auth'

interface SmartRule {
  field: string
  operator: string
  value: string | number | boolean
}

interface SmartFilters {
  logic: 'and' | 'or'
  rules: SmartRule[]
}

function buildSmartConditions(filters: SmartFilters): SQL[] {
  const conditions: SQL[] = [isNull(books.deletedAt)]

  const ruleConditions: SQL[] = filters.rules
    .map((rule) => {
      switch (rule.field) {
        case 'status': {
          const bookIdsWithStatus = db
            .select({ bookId: userBooks.bookId })
            .from(userBooks)
            .where(
              eq(userBooks.status, String(rule.value) as 'tbr' | 'reading' | 'completed' | 'dnf'),
            )
          return inArray(books.id, bookIdsWithStatus)
        }
        case 'language':
          return eq(books.language, String(rule.value)) as SQL
        case 'bindingType':
          return eq(
            books.bindingType,
            String(rule.value) as 'paperback' | 'hardcover' | 'ebook',
          ) as SQL
        case 'categoryId': {
          const bookIdsInCategory = db
            .select({ bookId: bookCategories.bookId })
            .from(bookCategories)
            .where(eq(bookCategories.categoryId, Number(rule.value)))
          return inArray(books.id, bookIdsInCategory)
        }
        case 'publishedYear': {
          const year = Number(rule.value)
          if (rule.operator === 'equals') return eq(books.publishedYear, year) as SQL
          if (rule.operator === 'greaterThan') return gte(books.publishedYear, year) as SQL
          if (rule.operator === 'lessThan') return lte(books.publishedYear, year) as SQL
          return null
        }
        case 'pageCount': {
          const count = Number(rule.value)
          if (rule.operator === 'greaterThan') return gte(books.pageCount, count) as SQL
          if (rule.operator === 'lessThan') return lte(books.pageCount, count) as SQL
          return null
        }
        case 'rating': {
          const rating = Number(rule.value)
          const bookIdsWithRating = db
            .select({ bookId: userBooks.bookId })
            .from(userBooks)
            .innerJoin(reviews, eq(reviews.userBookId, userBooks.id))
            .where(
              rule.operator === 'greaterThan'
                ? gte(reviews.rating, rating)
                : rule.operator === 'lessThan'
                  ? lte(reviews.rating, rating)
                  : eq(reviews.rating, rating),
            )
          return inArray(books.id, bookIdsWithRating)
        }
        case 'hasReview': {
          const bookIdsWithReview = db
            .select({ bookId: userBooks.bookId })
            .from(userBooks)
            .innerJoin(reviews, eq(reviews.userBookId, userBooks.id))
          const wantsReview = rule.value === 'true' || rule.value === true
          return wantsReview
            ? inArray(books.id, bookIdsWithReview)
            : (isNull(books.deletedAt) as SQL)
        }
        default:
          return null
      }
    })
    .filter((c): c is SQL => c !== null)

  if (ruleConditions.length > 0) {
    const combined = filters.logic === 'or' ? or(...ruleConditions) : and(...ruleConditions)
    if (combined) conditions.push(combined)
  }

  return conditions
}

async function evaluateSmartCollection(smartFilters: SmartFilters) {
  const conditions = buildSmartConditions(smartFilters)

  const result = await db
    .select()
    .from(books)
    .where(and(...conditions))
    .orderBy(desc(books.createdAt))
    .limit(200)

  const booksWithAuthors = await Promise.all(
    result.map(async (book) => {
      const bookAuths = await db
        .select({ name: authors.name })
        .from(bookAuthors)
        .innerJoin(authors, eq(bookAuthors.authorId, authors.id))
        .where(eq(bookAuthors.bookId, book.id))
        .orderBy(bookAuthors.order)

      return {
        book,
        authorNames: bookAuths.map((a) => a.name).join(', '),
      }
    }),
  )

  return booksWithAuthors
}

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
        if (collection.isSmart && collection.smartFilters) {
          const smartBooks = await evaluateSmartCollection(collection.smartFilters as SmartFilters)
          return { ...collection, bookCount: smartBooks.length }
        }

        const manualBooks = await db
          .select()
          .from(bookCollections)
          .where(eq(bookCollections.collectionId, collection.id))

        return { ...collection, bookCount: manualBooks.length }
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

      const col = collection[0]

      if (col.isSmart && col.smartFilters) {
        const smartBooks = await evaluateSmartCollection(col.smartFilters as SmartFilters)
        return {
          collection: col,
          books: smartBooks.map((b) => ({
            book: { ...b.book, authorNames: b.authorNames },
            addedAt: null,
            position: null,
          })),
        }
      }

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

      const manualBooksWithAuthors = await Promise.all(
        collectionBooks.map(async (cb) => {
          const bookAuths = await db
            .select({ name: authors.name })
            .from(bookAuthors)
            .innerJoin(authors, eq(bookAuthors.authorId, authors.id))
            .where(eq(bookAuthors.bookId, cb.book.id))
            .orderBy(bookAuthors.order)

          return {
            ...cb,
            book: { ...cb.book, authorNames: bookAuths.map((a) => a.name).join(', ') },
          }
        }),
      )

      return {
        collection: col,
        books: manualBooksWithAuthors,
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    },
  )

  .post(
    '/preview-smart',
    async ({ body, request, set }) => {
      const session = await auth.api.getSession({ headers: request.headers })

      if (!session?.user) {
        set.status = 401
        return { error: 'Unauthorized' }
      }

      const smartBooks = await evaluateSmartCollection(body.smartFilters as SmartFilters)
      return { books: smartBooks, count: smartBooks.length }
    },
    {
      body: t.Object({
        smartFilters: t.Any(),
      }),
    },
  )

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
