import {
  authors,
  bindingTypes,
  bookAuthors,
  bookCategories,
  bookCollections,
  bookPublishers,
  books,
  categories,
  collections,
  db,
  publishers,
} from '@rafin/db'
import { and, desc, eq, isNull, like, or } from 'drizzle-orm'
import { Elysia, t } from 'elysia'
import { downloadAndProcessCover } from '../services/image'
import { sanitizeDescription } from '../services/sanitize-html'

type BindingType = (typeof bindingTypes)[number]

export const bookRoutes = new Elysia({ prefix: '/api/books' })
  .get(
    '/',
    async ({ query }) => {
      const { search, limit = 50, offset = 0 } = query

      let whereClause = isNull(books.deletedAt)

      if (search) {
        whereClause = and(
          isNull(books.deletedAt),
          or(like(books.title, `%${search}%`), like(books.isbn, `%${search}%`)),
        )!
      }

      const result = await db
        .select()
        .from(books)
        .where(whereClause)
        .orderBy(desc(books.createdAt))
        .limit(Number(limit))
        .offset(Number(offset))

      // Attach authors to each book
      const booksWithAuthors = await Promise.all(
        result.map(async (book) => {
          const bookAuths = await db
            .select({ name: authors.name })
            .from(bookAuthors)
            .innerJoin(authors, eq(bookAuthors.authorId, authors.id))
            .where(eq(bookAuthors.bookId, book.id))
            .orderBy(bookAuthors.order)

          return {
            ...book,
            authorNames: bookAuths.map((a) => a.name).join(', '),
          }
        }),
      )

      return { books: booksWithAuthors }
    },
    {
      query: t.Object({
        search: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        offset: t.Optional(t.String()),
      }),
    },
  )

  .get(
    '/:id',
    async ({ params, set }) => {
      const result = await db
        .select()
        .from(books)
        .where(and(eq(books.id, Number(params.id)), isNull(books.deletedAt)))
        .limit(1)

      if (result.length === 0) {
        set.status = 404
        return { error: 'Book not found' }
      }

      // Get book categories
      const bookCats = await db
        .select({ category: categories })
        .from(bookCategories)
        .innerJoin(categories, eq(bookCategories.categoryId, categories.id))
        .where(eq(bookCategories.bookId, Number(params.id)))

      // Get book collections
      const bookColls = await db
        .select({ collection: collections })
        .from(bookCollections)
        .innerJoin(collections, eq(bookCollections.collectionId, collections.id))
        .where(eq(bookCollections.bookId, Number(params.id)))

      // Get book authors
      const bookAuths = await db
        .select({ author: authors, order: bookAuthors.order })
        .from(bookAuthors)
        .innerJoin(authors, eq(bookAuthors.authorId, authors.id))
        .where(eq(bookAuthors.bookId, Number(params.id)))
        .orderBy(bookAuthors.order)

      // Get book publishers
      const bookPubs = await db
        .select({ publisher: publishers })
        .from(bookPublishers)
        .innerJoin(publishers, eq(bookPublishers.publisherId, publishers.id))
        .where(eq(bookPublishers.bookId, Number(params.id)))

      return {
        book: {
          ...result[0],
          authors: bookAuths.map((ba) => ba.author),
          publishers: bookPubs.map((bp) => bp.publisher),
          categories: bookCats.map((bc) => bc.category),
          collections: bookColls.map((bc) => bc.collection),
        },
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    },
  )

  .post(
    '/',
    async ({ body }) => {
      const bindingType =
        body.bindingType && bindingTypes.includes(body.bindingType as BindingType)
          ? (body.bindingType as BindingType)
          : null

      // If coverUrl is provided, download and save locally
      let coverPath: string | null = null
      let coverUrl: string | null = body.coverUrl || null
      if (coverUrl) {
        const processed = await downloadAndProcessCover(coverUrl)
        if (processed) {
          coverPath = processed.coverPath
          coverUrl = null // No longer need the external URL
        }
      }

      const result = await db
        .insert(books)
        .values({
          title: body.title,
          originalTitle: body.originalTitle || null,
          isbn: body.isbn || null,
          publishedYear: body.publishedYear || null,
          pageCount: body.pageCount || null,
          translator: body.translator || null,
          locationId: body.locationId || null,
          purchasePrice: body.purchasePrice || null,
          currency: body.currency || 'TRY',
          store: body.store || null,
          copyNote: body.copyNote || null,
          description: sanitizeDescription(body.description) ?? null,
          language: body.language || null,
          bindingType,
          coverPath,
          coverUrl,
        })
        .returning()

      const bookId = result[0].id

      // Add categories if provided
      if (body.categoryIds && body.categoryIds.length > 0) {
        await db.insert(bookCategories).values(
          body.categoryIds.map((categoryId) => ({
            bookId,
            categoryId,
          })),
        )
      }

      // Add to collections if provided
      if (body.collectionIds && body.collectionIds.length > 0) {
        await db.insert(bookCollections).values(
          body.collectionIds.map((collectionId, index) => ({
            bookId,
            collectionId,
            position: index,
          })),
        )
      }

      // Add authors
      if (body.authorIds && body.authorIds.length > 0) {
        await db.insert(bookAuthors).values(
          body.authorIds.map((authorId, index) => ({
            bookId,
            authorId,
            order: index,
          })),
        )
      }

      // Add publishers
      if (body.publisherIds && body.publisherIds.length > 0) {
        await db.insert(bookPublishers).values(
          body.publisherIds.map((publisherId) => ({
            bookId,
            publisherId,
          })),
        )
      }

      return { book: result[0] }
    },
    {
      body: t.Object({
        title: t.String({ minLength: 1 }),
        originalTitle: t.Optional(t.String()),
        authorIds: t.Array(t.Number()),
        publisherIds: t.Optional(t.Array(t.Number())),
        isbn: t.Optional(t.String()),
        publishedYear: t.Optional(t.Number()),
        pageCount: t.Optional(t.Number()),
        translator: t.Optional(t.String()),
        locationId: t.Optional(t.Number()),
        purchasePrice: t.Optional(t.String()),
        currency: t.Optional(t.String()),
        store: t.Optional(t.String()),
        copyNote: t.Optional(t.String()),
        description: t.Optional(t.String()),
        language: t.Optional(t.String()),
        bindingType: t.Optional(t.String()),
        coverUrl: t.Optional(t.String()),
        categoryIds: t.Optional(t.Array(t.Number())),
        collectionIds: t.Optional(t.Array(t.Number())),
      }),
    },
  )

  .patch(
    '/:id',
    async ({ params, body, set }) => {
      const existing = await db
        .select()
        .from(books)
        .where(eq(books.id, Number(params.id)))
        .limit(1)

      if (existing.length === 0) {
        set.status = 404
        return { error: 'Book not found' }
      }

      // Extract special fields from body
      const {
        categoryIds,
        collectionIds,
        authorIds,
        publisherIds,
        bindingType: bindingTypeInput,
        coverUrl: coverUrlInput,
        removeCover,
        ...bookData
      } = body

      const bindingType =
        bindingTypeInput && bindingTypes.includes(bindingTypeInput as BindingType)
          ? (bindingTypeInput as BindingType)
          : undefined

      // Handle cover changes
      const coverUpdate: { coverPath?: string | null; coverUrl?: string | null } = {}
      if (removeCover) {
        // Explicitly clear both cover fields
        coverUpdate.coverPath = null
        coverUpdate.coverUrl = null
      } else if (coverUrlInput) {
        // New cover URL — download and save locally
        const processed = await downloadAndProcessCover(coverUrlInput)
        if (processed) {
          coverUpdate.coverPath = processed.coverPath
          coverUpdate.coverUrl = null
        } else {
          coverUpdate.coverUrl = coverUrlInput
        }
      }

      // Sanitize description if provided
      if ('description' in bookData && bookData.description) {
        bookData.description = sanitizeDescription(bookData.description) ?? undefined
      }

      const result = await db
        .update(books)
        .set({
          ...bookData,
          ...(bindingType !== undefined && { bindingType }),
          ...coverUpdate,
          updatedAt: new Date(),
        })
        .where(eq(books.id, Number(params.id)))
        .returning()

      // Update categories if provided
      if (categoryIds !== undefined) {
        // Remove existing categories
        await db.delete(bookCategories).where(eq(bookCategories.bookId, Number(params.id)))

        // Add new categories
        if (categoryIds.length > 0) {
          await db.insert(bookCategories).values(
            categoryIds.map((categoryId) => ({
              bookId: Number(params.id),
              categoryId,
            })),
          )
        }
      }

      // Update collections if provided
      if (collectionIds !== undefined) {
        // Remove existing collections
        await db.delete(bookCollections).where(eq(bookCollections.bookId, Number(params.id)))

        // Add new collections
        if (collectionIds.length > 0) {
          await db.insert(bookCollections).values(
            collectionIds.map((collectionId, index) => ({
              bookId: Number(params.id),
              collectionId,
              position: index,
            })),
          )
        }
      }

      // Update authors if provided
      if (authorIds !== undefined) {
        await db.delete(bookAuthors).where(eq(bookAuthors.bookId, Number(params.id)))
        if (authorIds.length > 0) {
          await db.insert(bookAuthors).values(
            authorIds.map((authorId, index) => ({
              bookId: Number(params.id),
              authorId,
              order: index,
            })),
          )
        }
      }

      // Update publishers if provided
      if (publisherIds !== undefined) {
        await db.delete(bookPublishers).where(eq(bookPublishers.bookId, Number(params.id)))
        if (publisherIds.length > 0) {
          await db.insert(bookPublishers).values(
            publisherIds.map((publisherId) => ({
              bookId: Number(params.id),
              publisherId,
            })),
          )
        }
      }

      return { book: result[0] }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        title: t.Optional(t.String()),
        originalTitle: t.Optional(t.String()),
        authorIds: t.Optional(t.Array(t.Number())),
        publisherIds: t.Optional(t.Array(t.Number())),
        isbn: t.Optional(t.String()),
        publishedYear: t.Optional(t.Number()),
        pageCount: t.Optional(t.Number()),
        translator: t.Optional(t.String()),
        locationId: t.Optional(t.Number()),
        purchasePrice: t.Optional(t.String()),
        currency: t.Optional(t.String()),
        store: t.Optional(t.String()),
        copyNote: t.Optional(t.String()),
        description: t.Optional(t.String()),
        language: t.Optional(t.String()),
        bindingType: t.Optional(t.String()),
        coverUrl: t.Optional(t.String()),
        removeCover: t.Optional(t.Boolean()),
        categoryIds: t.Optional(t.Array(t.Number())),
        collectionIds: t.Optional(t.Array(t.Number())),
      }),
    },
  )

  .delete(
    '/:id',
    async ({ params, set }) => {
      const existing = await db
        .select()
        .from(books)
        .where(eq(books.id, Number(params.id)))
        .limit(1)

      if (existing.length === 0) {
        set.status = 404
        return { error: 'Book not found' }
      }

      // Soft delete
      await db
        .update(books)
        .set({ deletedAt: new Date() })
        .where(eq(books.id, Number(params.id)))

      return { success: true }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    },
  )
