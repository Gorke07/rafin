# Authors & Publishers Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace plain-text `author` and `publisher` fields in the books table with separate `authors` and `publishers` tables linked via many-to-many junction tables, then build full CRUD API routes and frontend pages.

**Architecture:** New `authors` and `publishers` tables with `book_authors` / `book_publishers` junction tables (following the existing `categories` + `book_categories` pattern). A data migration script converts existing text values into proper records. API routes follow the existing ElysiaJS pattern. Frontend adds combobox-style author/publisher pickers in BookForm and new list/detail pages.

**Tech Stack:** Drizzle ORM (schema + migration), ElysiaJS (API), Next.js 15 + React 19 (frontend), next-intl (i18n), shadcn/ui (components)

---

## Task 1: Database Schema — Authors & Publishers Tables

**Files:**
- Create: `packages/db/src/schema/authors.ts`
- Create: `packages/db/src/schema/publishers.ts`
- Modify: `packages/db/src/schema/index.ts`

**Step 1: Create authors schema**

Create `packages/db/src/schema/authors.ts`:

```ts
import { relations } from 'drizzle-orm'
import { integer, pgTable, primaryKey, serial, text, timestamp } from 'drizzle-orm/pg-core'
import { books } from './books'

export const authors = pgTable('authors', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  bio: text('bio'),
  photoUrl: text('photo_url'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const bookAuthors = pgTable(
  'book_authors',
  {
    bookId: integer('book_id')
      .notNull()
      .references(() => books.id, { onDelete: 'cascade' }),
    authorId: integer('author_id')
      .notNull()
      .references(() => authors.id, { onDelete: 'cascade' }),
    order: integer('order').notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.bookId, table.authorId] })],
)

export const authorsRelations = relations(authors, ({ many }) => ({
  bookAuthors: many(bookAuthors),
}))

export const bookAuthorsRelations = relations(bookAuthors, ({ one }) => ({
  book: one(books, {
    fields: [bookAuthors.bookId],
    references: [books.id],
  }),
  author: one(authors, {
    fields: [bookAuthors.authorId],
    references: [authors.id],
  }),
}))
```

**Step 2: Create publishers schema**

Create `packages/db/src/schema/publishers.ts`:

```ts
import { relations } from 'drizzle-orm'
import { integer, pgTable, primaryKey, serial, text, timestamp } from 'drizzle-orm/pg-core'
import { books } from './books'

export const publishers = pgTable('publishers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  website: text('website'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const bookPublishers = pgTable(
  'book_publishers',
  {
    bookId: integer('book_id')
      .notNull()
      .references(() => books.id, { onDelete: 'cascade' }),
    publisherId: integer('publisher_id')
      .notNull()
      .references(() => publishers.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.bookId, table.publisherId] })],
)

export const publishersRelations = relations(publishers, ({ many }) => ({
  bookPublishers: many(bookPublishers),
}))

export const bookPublishersRelations = relations(bookPublishers, ({ one }) => ({
  book: one(books, {
    fields: [bookPublishers.bookId],
    references: [books.id],
  }),
  publisher: one(publishers, {
    fields: [bookPublishers.publisherId],
    references: [publishers.id],
  }),
}))
```

**Step 3: Export from barrel file**

Modify `packages/db/src/schema/index.ts` — add two new exports:

```ts
export * from './authors'
export * from './publishers'
```

**Step 4: Push schema to database**

Run: `cd /home/kmadmin/rafin && bun run db:push`

Expected: Tables `authors`, `publishers`, `book_authors`, `book_publishers` created successfully.

**Step 5: Commit**

```bash
git add packages/db/src/schema/authors.ts packages/db/src/schema/publishers.ts packages/db/src/schema/index.ts
git commit -m "feat(db): add authors and publishers tables with junction tables"
```

---

## Task 2: Data Migration Script

**Files:**
- Create: `packages/db/src/migrate-authors-publishers.ts`
- Modify: `packages/db/src/schema/books.ts` (remove `author` and `publisher` columns after migration)

**Step 1: Create migration script**

Create `packages/db/src/migrate-authors-publishers.ts`:

```ts
import { db } from './client'
import { books } from './schema/books'
import { authors, bookAuthors } from './schema/authors'
import { publishers, bookPublishers } from './schema/publishers'
import { isNull, eq } from 'drizzle-orm'

async function migrate() {
  console.log('Starting authors/publishers migration...')

  // 1. Fetch all non-deleted books
  const allBooks = await db
    .select({ id: books.id, author: books.author, publisher: books.publisher })
    .from(books)
    .where(isNull(books.deletedAt))

  console.log(`Found ${allBooks.length} books to process`)

  // 2. Collect unique author names
  const authorNames = new Set<string>()
  for (const book of allBooks) {
    if (book.author) {
      // Split by comma or & for multi-author books
      const names = book.author.split(/[,&]/).map((n) => n.trim()).filter(Boolean)
      for (const name of names) {
        authorNames.add(name)
      }
    }
  }

  // 3. Insert unique authors
  console.log(`Inserting ${authorNames.size} unique authors...`)
  const authorMap = new Map<string, number>()
  for (const name of authorNames) {
    const existing = await db.select().from(authors).where(eq(authors.name, name)).limit(1)
    if (existing.length > 0) {
      authorMap.set(name, existing[0].id)
    } else {
      const result = await db.insert(authors).values({ name }).returning()
      authorMap.set(name, result[0].id)
    }
  }

  // 4. Collect unique publisher names
  const publisherNames = new Set<string>()
  for (const book of allBooks) {
    if (book.publisher) {
      publisherNames.add(book.publisher.trim())
    }
  }

  // 5. Insert unique publishers
  console.log(`Inserting ${publisherNames.size} unique publishers...`)
  const publisherMap = new Map<string, number>()
  for (const name of publisherNames) {
    const existing = await db.select().from(publishers).where(eq(publishers.name, name)).limit(1)
    if (existing.length > 0) {
      publisherMap.set(name, existing[0].id)
    } else {
      const result = await db.insert(publishers).values({ name }).returning()
      publisherMap.set(name, result[0].id)
    }
  }

  // 6. Create book-author relationships
  console.log('Creating book-author relationships...')
  for (const book of allBooks) {
    if (book.author) {
      const names = book.author.split(/[,&]/).map((n) => n.trim()).filter(Boolean)
      for (let i = 0; i < names.length; i++) {
        const authorId = authorMap.get(names[i])
        if (authorId) {
          try {
            await db.insert(bookAuthors).values({
              bookId: book.id,
              authorId,
              order: i,
            })
          } catch {
            // Skip duplicates
          }
        }
      }
    }
  }

  // 7. Create book-publisher relationships
  console.log('Creating book-publisher relationships...')
  for (const book of allBooks) {
    if (book.publisher) {
      const publisherId = publisherMap.get(book.publisher.trim())
      if (publisherId) {
        try {
          await db.insert(bookPublishers).values({
            bookId: book.id,
            publisherId,
          })
        } catch {
          // Skip duplicates
        }
      }
    }
  }

  console.log('Migration complete!')
  console.log(`  Authors: ${authorMap.size}`)
  console.log(`  Publishers: ${publisherMap.size}`)
  console.log(`  Books processed: ${allBooks.length}`)
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration failed:', err)
    process.exit(1)
  })
```

**Step 2: Run migration**

Run: `cd /home/kmadmin/rafin && bun run packages/db/src/migrate-authors-publishers.ts`

Expected: Authors and publishers created from existing text data, junction table records created.

**Step 3: Remove old columns from books schema**

Modify `packages/db/src/schema/books.ts`:
- Remove line `author: text('author').notNull(),`
- Remove line `publisher: text('publisher'),`

**Step 4: Push schema changes**

Run: `cd /home/kmadmin/rafin && bun run db:push`

Expected: `author` and `publisher` columns dropped from books table.

**Step 5: Commit**

```bash
git add packages/db/src/migrate-authors-publishers.ts packages/db/src/schema/books.ts
git commit -m "feat(db): migrate author/publisher text to relational tables"
```

---

## Task 3: Shared Validators

**Files:**
- Create: `packages/shared/src/validators/author.ts`
- Create: `packages/shared/src/validators/publisher.ts`
- Modify: `packages/shared/src/validators/book.ts`
- Modify: `packages/shared/src/validators/index.ts`

**Step 1: Create author validators**

Create `packages/shared/src/validators/author.ts`:

```ts
import { z } from 'zod'

export const createAuthorSchema = z.object({
  name: z.string().min(1, 'Author name is required'),
  bio: z.string().optional(),
  photoUrl: z.string().url().optional(),
})

export const updateAuthorSchema = createAuthorSchema.partial()

export type CreateAuthorInput = z.infer<typeof createAuthorSchema>
export type UpdateAuthorInput = z.infer<typeof updateAuthorSchema>
```

**Step 2: Create publisher validators**

Create `packages/shared/src/validators/publisher.ts`:

```ts
import { z } from 'zod'

export const createPublisherSchema = z.object({
  name: z.string().min(1, 'Publisher name is required'),
  website: z.string().url().optional(),
})

export const updatePublisherSchema = createPublisherSchema.partial()

export type CreatePublisherInput = z.infer<typeof createPublisherSchema>
export type UpdatePublisherInput = z.infer<typeof updatePublisherSchema>
```

**Step 3: Update book validators**

Modify `packages/shared/src/validators/book.ts`:
- Remove `author: z.string().min(1, 'Author is required'),` (line 13)
- Remove `publisher: z.string().optional(),` (line 14)
- Add `authorIds: z.array(z.number().int().positive()).min(1, 'At least one author is required'),`
- Add `publisherIds: z.array(z.number().int().positive()).optional(),`

**Step 4: Update barrel export**

Modify `packages/shared/src/validators/index.ts` — add:

```ts
export * from './author'
export * from './publisher'
```

**Step 5: Commit**

```bash
git add packages/shared/src/validators/author.ts packages/shared/src/validators/publisher.ts packages/shared/src/validators/book.ts packages/shared/src/validators/index.ts
git commit -m "feat(shared): add author/publisher validators, update book validator"
```

---

## Task 4: Authors API Routes

**Files:**
- Create: `apps/api/src/routes/authors.ts`
- Modify: `apps/api/src/index.ts`

**Step 1: Create authors route**

Create `apps/api/src/routes/authors.ts`:

```ts
import { Elysia, t } from 'elysia'
import { db, authors, bookAuthors, books } from '@rafin/db'
import { eq, desc, like, isNull, and, count } from 'drizzle-orm'

export const authorRoutes = new Elysia({ prefix: '/api/authors' })
  // List authors (with search)
  .get(
    '/',
    async ({ query }) => {
      const { q } = query

      let result
      if (q) {
        result = await db
          .select()
          .from(authors)
          .where(like(authors.name, `%${q}%`))
          .orderBy(authors.name)
      } else {
        result = await db.select().from(authors).orderBy(authors.name)
      }

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
    async ({ body, set }) => {
      // Check uniqueness
      const existing = await db
        .select()
        .from(authors)
        .where(eq(authors.name, body.name))
        .limit(1)

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
```

**Step 2: Register in main app**

Modify `apps/api/src/index.ts`:
- Add import: `import { authorRoutes } from './routes/authors'`
- Add `.use(authorRoutes)` after `.use(categoryRoutes)` (line 41)

**Step 3: Verify**

Run: `cd /home/kmadmin/rafin && bun run typecheck`

Expected: No TypeScript errors.

**Step 4: Commit**

```bash
git add apps/api/src/routes/authors.ts apps/api/src/index.ts
git commit -m "feat(api): add authors CRUD routes"
```

---

## Task 5: Publishers API Routes

**Files:**
- Create: `apps/api/src/routes/publishers.ts`
- Modify: `apps/api/src/index.ts`

**Step 1: Create publishers route**

Create `apps/api/src/routes/publishers.ts` — same pattern as authors route but for publishers:

```ts
import { Elysia, t } from 'elysia'
import { db, publishers, bookPublishers, books } from '@rafin/db'
import { eq, desc, like, isNull, and, count } from 'drizzle-orm'

export const publisherRoutes = new Elysia({ prefix: '/api/publishers' })
  // List publishers (with search)
  .get(
    '/',
    async ({ query }) => {
      const { q } = query

      let result
      if (q) {
        result = await db
          .select()
          .from(publishers)
          .where(like(publishers.name, `%${q}%`))
          .orderBy(publishers.name)
      } else {
        result = await db.select().from(publishers).orderBy(publishers.name)
      }

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
    async ({ body, set }) => {
      const existing = await db
        .select()
        .from(publishers)
        .where(eq(publishers.name, body.name))
        .limit(1)

      if (existing.length > 0) {
        return { publisher: existing[0], existed: true }
      }

      const result = await db
        .insert(publishers)
        .values({
          name: body.name,
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
```

**Step 2: Register in main app**

Modify `apps/api/src/index.ts`:
- Add import: `import { publisherRoutes } from './routes/publishers'`
- Add `.use(publisherRoutes)` after `.use(authorRoutes)`

**Step 3: Verify**

Run: `cd /home/kmadmin/rafin && bun run typecheck`

**Step 4: Commit**

```bash
git add apps/api/src/routes/publishers.ts apps/api/src/index.ts
git commit -m "feat(api): add publishers CRUD routes"
```

---

## Task 6: Update Books API Routes

**Files:**
- Modify: `apps/api/src/routes/books.ts`

**Step 1: Update imports**

Add to imports at top of `apps/api/src/routes/books.ts`:

```ts
import { authors, bookAuthors, publishers, bookPublishers } from '@rafin/db'
```

**Step 2: Update GET /api/books/:id**

After fetching book categories and collections (lines 70-81), add:

```ts
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
```

Update the return to include:

```ts
return {
  book: {
    ...result[0],
    authors: bookAuths.map((ba) => ba.author),
    publishers: bookPubs.map((bp) => bp.publisher),
    categories: bookCats.map((bc) => bc.category),
    collections: bookColls.map((bc) => bc.collection),
  },
}
```

**Step 3: Update GET /api/books (list)**

For the list endpoint, join authors to include author names in the response. Add a subquery or post-fetch to attach author names:

After fetching `result` (line 36-42), add:

```ts
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
```

Also update the search to search by author name: change `like(books.author, ...)` to a subquery or separate author search.

**Step 4: Update POST /api/books**

Replace `author: body.author,` and `publisher: body.publisher || null,` from the insert values.

After inserting the book and getting `bookId`, add:

```ts
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
```

Update the body schema:
- Remove `author: t.String({ minLength: 1 }),`
- Remove `publisher: t.Optional(t.String()),`
- Add `authorIds: t.Array(t.Number()),`
- Add `publisherIds: t.Optional(t.Array(t.Number())),`

**Step 5: Update PATCH /api/books/:id**

Add `authorIds` and `publisherIds` to the destructured body:

```ts
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
```

After the categories/collections update blocks, add:

```ts
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
```

Update PATCH body schema:
- Remove `author: t.Optional(t.String()),`
- Remove `publisher: t.Optional(t.String()),`
- Add `authorIds: t.Optional(t.Array(t.Number())),`
- Add `publisherIds: t.Optional(t.Array(t.Number())),`

**Step 6: Verify**

Run: `cd /home/kmadmin/rafin && bun run typecheck`

**Step 7: Commit**

```bash
git add apps/api/src/routes/books.ts
git commit -m "feat(api): update books routes to use author/publisher relations"
```

---

## Task 7: i18n Messages

**Files:**
- Modify: `apps/web/messages/en.json`
- Modify: `apps/web/messages/tr.json`

**Step 1: Add English messages**

Add to `en.json`:

Under `"nav"`:
```json
"authors": "Authors",
"publishers": "Publishers"
```

Add new top-level sections:

```json
"authors": {
  "title": "Authors",
  "authorCount": "{count} authors",
  "addAuthor": "Add Author",
  "editAuthor": "Edit Author",
  "name": "Name",
  "bio": "Biography",
  "photoUrl": "Photo URL",
  "noAuthors": "No authors found.",
  "searchAuthors": "Search authors...",
  "books": "Books",
  "bookCount": "{count} books",
  "deleteAuthor": "Delete Author",
  "deleteConfirm": "Are you sure you want to delete this author?",
  "cannotDelete": "Cannot delete an author with associated books.",
  "authorCreated": "Author created successfully",
  "authorUpdated": "Author updated successfully",
  "authorDeleted": "Author deleted successfully",
  "selectAuthors": "Select authors...",
  "createNew": "Create \"{name}\"",
  "noResults": "No authors found. Type to create a new one."
},
"publishers": {
  "title": "Publishers",
  "publisherCount": "{count} publishers",
  "addPublisher": "Add Publisher",
  "editPublisher": "Edit Publisher",
  "name": "Name",
  "website": "Website",
  "noPublishers": "No publishers found.",
  "searchPublishers": "Search publishers...",
  "books": "Books",
  "bookCount": "{count} books",
  "deletePublisher": "Delete Publisher",
  "deleteConfirm": "Are you sure you want to delete this publisher?",
  "cannotDelete": "Cannot delete a publisher with associated books.",
  "publisherCreated": "Publisher created successfully",
  "publisherUpdated": "Publisher updated successfully",
  "publisherDeleted": "Publisher deleted successfully",
  "selectPublishers": "Select publishers...",
  "createNew": "Create \"{name}\"",
  "noResults": "No publishers found. Type to create a new one."
}
```

**Step 2: Add Turkish messages**

Add to `tr.json`:

Under `"nav"`:
```json
"authors": "Yazarlar",
"publishers": "Yayinevleri"
```

Add new top-level sections:

```json
"authors": {
  "title": "Yazarlar",
  "authorCount": "{count} yazar",
  "addAuthor": "Yazar Ekle",
  "editAuthor": "Yazar Duzenle",
  "name": "Ad",
  "bio": "Biyografi",
  "photoUrl": "Fotograf URL",
  "noAuthors": "Yazar bulunamadi.",
  "searchAuthors": "Yazar ara...",
  "books": "Kitaplar",
  "bookCount": "{count} kitap",
  "deleteAuthor": "Yazar Sil",
  "deleteConfirm": "Bu yazari silmek istediginizden emin misiniz?",
  "cannotDelete": "Kitaplari olan bir yazar silinemez.",
  "authorCreated": "Yazar basariyla olusturuldu",
  "authorUpdated": "Yazar basariyla guncellendi",
  "authorDeleted": "Yazar basariyla silindi",
  "selectAuthors": "Yazar secin...",
  "createNew": "\"{name}\" olustur",
  "noResults": "Yazar bulunamadi. Yeni bir tane olusturmak icin yazin."
},
"publishers": {
  "title": "Yayinevleri",
  "publisherCount": "{count} yayinevi",
  "addPublisher": "Yayinevi Ekle",
  "editPublisher": "Yayinevi Duzenle",
  "name": "Ad",
  "website": "Web Sitesi",
  "noPublishers": "Yayinevi bulunamadi.",
  "searchPublishers": "Yayinevi ara...",
  "books": "Kitaplar",
  "bookCount": "{count} kitap",
  "deletePublisher": "Yayinevi Sil",
  "deleteConfirm": "Bu yayinevini silmek istediginizden emin misiniz?",
  "cannotDelete": "Kitaplari olan bir yayinevi silinemez.",
  "publisherCreated": "Yayinevi basariyla olusturuldu",
  "publisherUpdated": "Yayinevi basariyla guncellendi",
  "publisherDeleted": "Yayinevi basariyla silindi",
  "selectPublishers": "Yayinevi secin...",
  "createNew": "\"{name}\" olustur",
  "noResults": "Yayinevi bulunamadi. Yeni bir tane olusturmak icin yazin."
}
```

**Step 3: Commit**

```bash
git add apps/web/messages/en.json apps/web/messages/tr.json
git commit -m "feat(i18n): add author and publisher translations"
```

---

## Task 8: EntityCombobox Reusable Component

**Files:**
- Create: `apps/web/components/ui/entity-combobox.tsx`

A reusable combobox that supports: searching existing entities, multi-select with ordering, and creating new entities inline. Used by both author and publisher pickers.

**Step 1: Create component**

Create `apps/web/components/ui/entity-combobox.tsx`:

```tsx
'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, Plus, GripVertical } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface Entity {
  id: number
  name: string
}

interface EntityComboboxProps {
  selected: Entity[]
  onSelectionChange: (entities: Entity[]) => void
  searchEndpoint: string // e.g. '/api/authors'
  createEndpoint: string // e.g. '/api/authors'
  entityKey: string // 'author' or 'publisher' — used to extract from API response
  placeholder: string
  createNewLabel: (name: string) => string
  noResultsLabel: string
  orderable?: boolean // only for authors
}

export function EntityCombobox({
  selected,
  onSelectionChange,
  searchEndpoint,
  createEndpoint,
  entityKey,
  placeholder,
  createNewLabel,
  noResultsLabel,
  orderable = false,
}: EntityComboboxProps) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Entity[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Search debounce
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      setIsLoading(true)
      try {
        const response = await fetch(
          `${API_URL}${searchEndpoint}?q=${encodeURIComponent(query)}`,
          { credentials: 'include' },
        )
        if (response.ok) {
          const data = await response.json()
          const entities: Entity[] = data[`${entityKey}s`] || []
          // Filter out already selected
          setResults(entities.filter((e) => !selected.some((s) => s.id === e.id)))
        }
      } catch {
        // Silently fail
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query, selected])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (entity: Entity) => {
    onSelectionChange([...selected, entity])
    setQuery('')
    setResults([])
    setIsOpen(false)
  }

  const handleCreate = async () => {
    if (!query.trim()) return
    try {
      const response = await fetch(`${API_URL}${createEndpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: query.trim() }),
      })
      if (response.ok) {
        const data = await response.json()
        const newEntity = data[entityKey]
        if (newEntity) {
          handleSelect(newEntity)
        }
      }
    } catch {
      // Silently fail
    }
  }

  const handleRemove = (id: number) => {
    onSelectionChange(selected.filter((e) => e.id !== id))
  }

  const handleMoveUp = (index: number) => {
    if (index === 0) return
    const newList = [...selected]
    ;[newList[index - 1], newList[index]] = [newList[index], newList[index - 1]]
    onSelectionChange(newList)
  }

  const handleMoveDown = (index: number) => {
    if (index === selected.length - 1) return
    const newList = [...selected]
    ;[newList[index], newList[index + 1]] = [newList[index + 1], newList[index]]
    onSelectionChange(newList)
  }

  const showCreateOption =
    query.trim() &&
    !results.some((r) => r.name.toLowerCase() === query.trim().toLowerCase()) &&
    !selected.some((s) => s.name.toLowerCase() === query.trim().toLowerCase())

  return (
    <div className="space-y-2">
      {/* Selected entities */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((entity, index) => (
            <div
              key={entity.id}
              className="flex items-center gap-1 rounded-md border bg-secondary/50 px-2 py-1 text-sm"
            >
              {orderable && selected.length > 1 && (
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => handleMoveUp(index)}
                    className="text-muted-foreground hover:text-foreground"
                    disabled={index === 0}
                  >
                    <GripVertical className="h-3 w-3" />
                  </button>
                </div>
              )}
              <span>{entity.name}</span>
              <button
                type="button"
                onClick={() => handleRemove(entity.id)}
                className="ml-1 text-muted-foreground hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => query.trim() && setIsOpen(true)}
          placeholder={placeholder}
        />

        {/* Dropdown */}
        {isOpen && (query.trim() || results.length > 0) && (
          <div
            ref={dropdownRef}
            className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-1 shadow-md"
          >
            {isLoading && (
              <div className="px-3 py-2 text-sm text-muted-foreground">...</div>
            )}

            {!isLoading && results.length === 0 && !showCreateOption && query.trim() && (
              <div className="px-3 py-2 text-sm text-muted-foreground">{noResultsLabel}</div>
            )}

            {results.map((entity) => (
              <button
                key={entity.id}
                type="button"
                onClick={() => handleSelect(entity)}
                className="flex w-full items-center rounded-sm px-3 py-2 text-sm hover:bg-accent"
              >
                {entity.name}
              </button>
            ))}

            {showCreateOption && (
              <button
                type="button"
                onClick={handleCreate}
                className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm text-primary hover:bg-accent"
              >
                <Plus className="h-3.5 w-3.5" />
                {createNewLabel(query.trim())}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add apps/web/components/ui/entity-combobox.tsx
git commit -m "feat(web): add EntityCombobox reusable component"
```

---

## Task 9: Update BookForm Component

**Files:**
- Modify: `apps/web/components/books/BookForm.tsx`

**Step 1: Update interfaces and imports**

Add import:
```ts
import { EntityCombobox } from '@/components/ui/entity-combobox'
```

Add new interface:
```ts
interface Entity {
  id: number
  name: string
}
```

Update `BookFormData`:
- Remove `author: string`
- Remove `publisher?: string`
- Add `authorIds?: number[]`
- Add `publisherIds?: number[]`

Add state:
```ts
const [selectedAuthors, setSelectedAuthors] = useState<Entity[]>([])
const [selectedPublishers, setSelectedPublishers] = useState<Entity[]>([])
```

Add i18n:
```ts
const tAuth = useTranslations('authors')
const tPub = useTranslations('publishers')
```

**Step 2: Update initial data loading**

In the `useEffect` or initial data setup, fetch existing authors/publishers if editing:

```ts
// If editing, fetch book's current authors and publishers
useEffect(() => {
  if (mode === 'edit' && initialData?.id) {
    fetch(`${API_URL}/api/books/${initialData.id}`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.book?.authors) {
          setSelectedAuthors(data.book.authors.map((a: Entity) => ({ id: a.id, name: a.name })))
        }
        if (data.book?.publishers) {
          setSelectedPublishers(data.book.publishers.map((p: Entity) => ({ id: p.id, name: p.name })))
        }
      })
      .catch(console.error)
  }
}, [])
```

**Step 3: Update form fields**

Replace the author `<Input>` block (lines 296-308) with:

```tsx
<div>
  <Label required>{t('author')}</Label>
  <EntityCombobox
    selected={selectedAuthors}
    onSelectionChange={(entities) => {
      setSelectedAuthors(entities)
      setFormData((prev) => ({ ...prev, authorIds: entities.map((e) => e.id) }))
    }}
    searchEndpoint="/api/authors"
    createEndpoint="/api/authors"
    entityKey="author"
    placeholder={tAuth('selectAuthors')}
    createNewLabel={(name) => tAuth('createNew', { name })}
    noResultsLabel={tAuth('noResults')}
    orderable
  />
  {errors.author && <p className="mt-1 text-sm text-destructive">{errors.author}</p>}
</div>
```

Replace the publisher `<Input>` block (lines 322-330) with:

```tsx
<div>
  <Label>{t('publisher')}</Label>
  <EntityCombobox
    selected={selectedPublishers}
    onSelectionChange={(entities) => {
      setSelectedPublishers(entities)
      setFormData((prev) => ({ ...prev, publisherIds: entities.map((e) => e.id) }))
    }}
    searchEndpoint="/api/publishers"
    createEndpoint="/api/publishers"
    entityKey="publisher"
    placeholder={tPub('selectPublishers')}
    createNewLabel={(name) => tPub('createNew', { name })}
    noResultsLabel={tPub('noResults')}
  />
</div>
```

**Step 4: Update validation**

Change validation from `formData.author?.trim()` to `selectedAuthors.length > 0`.

**Step 5: Update handleISBNFound**

The ISBN lookup returns text `author` and `publisher`. Auto-create entities:

```ts
const handleISBNFound = async (book: Record<string, unknown>) => {
  // Auto-create/find author
  if (book.author && typeof book.author === 'string') {
    const names = (book.author as string).split(/[,&]/).map((n) => n.trim()).filter(Boolean)
    const newAuthors: Entity[] = []
    for (const name of names) {
      try {
        const res = await fetch(`${API_URL}/api/authors`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ name }),
        })
        if (res.ok) {
          const data = await res.json()
          newAuthors.push(data.author)
        }
      } catch { /* skip */ }
    }
    if (newAuthors.length > 0) {
      setSelectedAuthors(newAuthors)
      setFormData((prev) => ({ ...prev, authorIds: newAuthors.map((a) => a.id) }))
    }
  }

  // Auto-create/find publisher
  if (book.publisher && typeof book.publisher === 'string') {
    try {
      const res = await fetch(`${API_URL}/api/publishers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: book.publisher }),
      })
      if (res.ok) {
        const data = await res.json()
        setSelectedPublishers([data.publisher])
        setFormData((prev) => ({ ...prev, publisherIds: [data.publisher.id] }))
      }
    } catch { /* skip */ }
  }

  // Set remaining fields
  const { author, publisher, ...rest } = book as Record<string, unknown>
  setFormData((prev) => ({
    ...prev,
    ...rest,
    title: prev.title || (rest.title as string) || '',
  }))
  addToast(t('bookInfoFilled'), 'success')
}
```

**Step 6: Verify**

Run: `cd /home/kmadmin/rafin && bun run typecheck`

**Step 7: Commit**

```bash
git add apps/web/components/books/BookForm.tsx
git commit -m "feat(web): update BookForm to use EntityCombobox for authors/publishers"
```

---

## Task 10: Update Book Detail and List Pages

**Files:**
- Modify: `apps/web/app/dashboard/books/[id]/page.tsx`
- Modify: `apps/web/app/dashboard/books/page.tsx`

**Step 1: Update Book Detail page**

In `apps/web/app/dashboard/books/[id]/page.tsx`:

Update `Book` interface:
- Remove `author: string`
- Remove `publisher?: string | null`
- Add `authors?: Array<{ id: number; name: string }>`
- Add `publishers?: Array<{ id: number; name: string }>`

Update header (line 133):
```tsx
<p className="text-lg text-muted-foreground">
  {book.authors?.map((a) => a.name).join(', ') || '—'}
</p>
```

Update InfoItem for author (line 239):
```tsx
<InfoItem label={t('author')} value={book.authors?.map((a) => a.name).join(', ')} />
```

Update InfoItem for publisher (line 241):
```tsx
<InfoItem label={t('publisher')} value={book.publishers?.map((p) => p.name).join(', ')} />
```

Make author names link to author detail page:
```tsx
{book.authors && book.authors.length > 0 && (
  <div>
    <dt className="text-sm text-muted-foreground">{t('author')}</dt>
    <dd className="mt-0.5 flex flex-wrap gap-1">
      {book.authors.map((a, i) => (
        <span key={a.id}>
          <Link href={`/dashboard/authors/${a.id}`} className="font-medium hover:text-primary">
            {a.name}
          </Link>
          {i < book.authors!.length - 1 && ', '}
        </span>
      ))}
    </dd>
  </div>
)}
```

**Step 2: Update Books list page**

In `apps/web/app/dashboard/books/page.tsx`:

Update `Book` interface:
- Change `author: string` to `authorNames: string`

Update CardView author display (line 236):
```tsx
<p className="mt-1 text-sm text-muted-foreground truncate">{book.authorNames}</p>
```

Update TableView author display (line 361):
```tsx
<span className="line-clamp-1">{book.authorNames}</span>
```

Update `SortField` type: change `'author'` to `'authorNames'`.

**Step 3: Verify**

Run: `cd /home/kmadmin/rafin && bun run typecheck`

**Step 4: Commit**

```bash
git add apps/web/app/dashboard/books/[id]/page.tsx apps/web/app/dashboard/books/page.tsx
git commit -m "feat(web): update book detail and list pages for relational authors/publishers"
```

---

## Task 11: Authors List and Detail Pages

**Files:**
- Create: `apps/web/app/dashboard/authors/page.tsx`
- Create: `apps/web/app/dashboard/authors/[id]/page.tsx`

**Step 1: Create authors list page**

Create `apps/web/app/dashboard/authors/page.tsx`:

Follow the pattern from `apps/web/app/dashboard/books/page.tsx`:
- Fetch from `/api/authors`
- Display as card grid (name + book count)
- Search bar with `?q=` parameter
- Link to `/dashboard/authors/[id]`
- Add author button linking to a dialog or inline form

**Step 2: Create author detail page**

Create `apps/web/app/dashboard/authors/[id]/page.tsx`:

Follow the pattern from book detail page:
- Fetch from `/api/authors/:id`
- Display author info (name, bio, photo)
- List author's books (with cover thumbnails, linking to book detail)
- Edit/Delete buttons

**Step 3: Verify**

Run: `cd /home/kmadmin/rafin && bun run typecheck`

**Step 4: Commit**

```bash
git add apps/web/app/dashboard/authors/page.tsx apps/web/app/dashboard/authors/\[id\]/page.tsx
git commit -m "feat(web): add authors list and detail pages"
```

---

## Task 12: Publishers List and Detail Pages

**Files:**
- Create: `apps/web/app/dashboard/publishers/page.tsx`
- Create: `apps/web/app/dashboard/publishers/[id]/page.tsx`

**Step 1: Create publishers list page**

Same pattern as authors list but for publishers. Fetch from `/api/publishers`.

**Step 2: Create publisher detail page**

Same pattern as author detail but for publishers.

**Step 3: Verify**

Run: `cd /home/kmadmin/rafin && bun run typecheck`

**Step 4: Commit**

```bash
git add apps/web/app/dashboard/publishers/page.tsx apps/web/app/dashboard/publishers/\[id\]/page.tsx
git commit -m "feat(web): add publishers list and detail pages"
```

---

## Task 13: Update Dashboard Sidebar

**Files:**
- Modify: `apps/web/app/dashboard/layout.tsx`

**Step 1: Add navigation items**

Add to imports:
```ts
import { User, Building2 } from 'lucide-react'
```

Add to `navItems` array (after `books` entry):
```ts
{ href: '/dashboard/authors', label: t('authors'), icon: User },
{ href: '/dashboard/publishers', label: t('publishers'), icon: Building2 },
```

**Step 2: Verify**

Run: `cd /home/kmadmin/rafin && bun run typecheck`

**Step 3: Commit**

```bash
git add apps/web/app/dashboard/layout.tsx
git commit -m "feat(web): add authors and publishers to sidebar navigation"
```

---

## Task 14: Update Stats Route

**Files:**
- Modify: `apps/api/src/routes/stats.ts`

**Step 1: Add author/publisher counts**

Add imports:
```ts
import { authors, publishers } from '@rafin/db'
```

In `GET /overview`, add:

```ts
// Total authors
const authorsResult = await db.select({ count: count() }).from(authors)
const totalAuthors = authorsResult[0]?.count ?? 0

// Total publishers
const publishersResult = await db.select({ count: count() }).from(publishers)
const totalPublishers = publishersResult[0]?.count ?? 0
```

Add to return:
```ts
return {
  totalBooks,
  totalLocations,
  totalAuthors,
  totalPublishers,
  currentlyReading,
  booksRead,
}
```

**Step 2: Commit**

```bash
git add apps/api/src/routes/stats.ts
git commit -m "feat(api): add author/publisher counts to stats"
```

---

## Task 15: Final Verification

**Step 1: TypeScript check**

Run: `cd /home/kmadmin/rafin && bun run typecheck`

Expected: No errors.

**Step 2: Lint**

Run: `cd /home/kmadmin/rafin && bun run lint`

Expected: No new errors from our changes.

**Step 3: Build**

Run: `cd /home/kmadmin/rafin && bun run build`

Expected: Successful build.

**Step 4: Manual testing checklist**

- [ ] Create a new author via `/api/authors` POST
- [ ] Create a new publisher via `/api/publishers` POST
- [ ] Create a new book with `authorIds` and `publisherIds`
- [ ] View book detail — authors and publishers displayed
- [ ] View book list — author names displayed
- [ ] Edit book — change authors/publishers
- [ ] ISBN lookup — auto-creates author/publisher entities
- [ ] Authors list page — shows all authors with book counts
- [ ] Author detail page — shows author info and their books
- [ ] Publishers list page — shows all publishers with book counts
- [ ] Publisher detail page — shows publisher info and their books
- [ ] Delete author without books — succeeds
- [ ] Delete author with books — returns 409 error
- [ ] Sidebar navigation — Authors and Publishers links visible
