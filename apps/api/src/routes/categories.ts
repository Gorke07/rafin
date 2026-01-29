import { Elysia, t } from 'elysia'
import { db, categories, bookCategories, books } from '@rafin/db'
import { eq, desc, and, isNull } from 'drizzle-orm'

export const categoryRoutes = new Elysia({ prefix: '/api/categories' })
  // Get all categories
  .get('/', async () => {
    const result = await db
      .select()
      .from(categories)
      .orderBy(categories.name)

    // Get book counts for each category
    const categoriesWithCounts = await Promise.all(
      result.map(async (category) => {
        const bookCount = await db
          .select()
          .from(bookCategories)
          .innerJoin(books, eq(bookCategories.bookId, books.id))
          .where(
            and(
              eq(bookCategories.categoryId, category.id),
              isNull(books.deletedAt)
            )
          )

        return {
          ...category,
          bookCount: bookCount.length,
        }
      })
    )

    return { categories: categoriesWithCounts }
  })

  // Get single category with books
  .get('/:id', async ({ params, set }) => {
    const category = await db
      .select()
      .from(categories)
      .where(eq(categories.id, Number(params.id)))
      .limit(1)

    if (category.length === 0) {
      set.status = 404
      return { error: 'Category not found' }
    }

    // Get books in category
    const categoryBooks = await db
      .select({ book: books })
      .from(bookCategories)
      .innerJoin(books, eq(bookCategories.bookId, books.id))
      .where(
        and(
          eq(bookCategories.categoryId, Number(params.id)),
          isNull(books.deletedAt)
        )
      )
      .orderBy(desc(books.createdAt))

    return {
      category: category[0],
      books: categoryBooks.map(b => b.book),
    }
  }, {
    params: t.Object({
      id: t.String()
    })
  })

  // Create category
  .post('/', async ({ body, set }) => {
    // Create slug from name
    const slug = body.slug || body.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    // Check if slug already exists
    const existing = await db
      .select()
      .from(categories)
      .where(eq(categories.slug, slug))
      .limit(1)

    if (existing.length > 0) {
      set.status = 409
      return { error: 'Category with this slug already exists' }
    }

    const result = await db.insert(categories).values({
      name: body.name,
      slug,
    }).returning()

    return { category: result[0] }
  }, {
    body: t.Object({
      name: t.String({ minLength: 1 }),
      slug: t.Optional(t.String()),
    })
  })

  // Update category
  .patch('/:id', async ({ params, body, set }) => {
    const existing = await db
      .select()
      .from(categories)
      .where(eq(categories.id, Number(params.id)))
      .limit(1)

    if (existing.length === 0) {
      set.status = 404
      return { error: 'Category not found' }
    }

    const updateData: { name?: string; slug?: string } = {}

    if (body.name) {
      updateData.name = body.name
    }

    if (body.slug) {
      // Check if new slug already exists
      const slugExists = await db
        .select()
        .from(categories)
        .where(eq(categories.slug, body.slug))
        .limit(1)

      if (slugExists.length > 0 && slugExists[0].id !== Number(params.id)) {
        set.status = 409
        return { error: 'Category with this slug already exists' }
      }

      updateData.slug = body.slug
    }

    const result = await db
      .update(categories)
      .set(updateData)
      .where(eq(categories.id, Number(params.id)))
      .returning()

    return { category: result[0] }
  }, {
    params: t.Object({
      id: t.String()
    }),
    body: t.Object({
      name: t.Optional(t.String()),
      slug: t.Optional(t.String()),
    })
  })

  // Delete category
  .delete('/:id', async ({ params, set }) => {
    const existing = await db
      .select()
      .from(categories)
      .where(eq(categories.id, Number(params.id)))
      .limit(1)

    if (existing.length === 0) {
      set.status = 404
      return { error: 'Category not found' }
    }

    await db
      .delete(categories)
      .where(eq(categories.id, Number(params.id)))

    return { success: true }
  }, {
    params: t.Object({
      id: t.String()
    })
  })

  // Add category to book
  .post('/books/:bookId', async ({ params, body, set }) => {
    // Check if book exists
    const book = await db
      .select()
      .from(books)
      .where(and(eq(books.id, Number(params.bookId)), isNull(books.deletedAt)))
      .limit(1)

    if (book.length === 0) {
      set.status = 404
      return { error: 'Book not found' }
    }

    // Check if category exists
    const category = await db
      .select()
      .from(categories)
      .where(eq(categories.id, body.categoryId))
      .limit(1)

    if (category.length === 0) {
      set.status = 404
      return { error: 'Category not found' }
    }

    try {
      await db.insert(bookCategories).values({
        bookId: Number(params.bookId),
        categoryId: body.categoryId,
      })
    } catch (error: unknown) {
      if ((error as { code?: string }).code === '23505') {
        set.status = 409
        return { error: 'Book already has this category' }
      }
      throw error
    }

    return { success: true }
  }, {
    params: t.Object({
      bookId: t.String()
    }),
    body: t.Object({
      categoryId: t.Number()
    })
  })

  // Remove category from book
  .delete('/books/:bookId/:categoryId', async ({ params, set }) => {
    await db
      .delete(bookCategories)
      .where(
        and(
          eq(bookCategories.bookId, Number(params.bookId)),
          eq(bookCategories.categoryId, Number(params.categoryId))
        )
      )

    return { success: true }
  }, {
    params: t.Object({
      bookId: t.String(),
      categoryId: t.String()
    })
  })
