import 'dotenv/config'
import { db } from './client'
import { books } from './schema/books'
import { authors, bookAuthors } from './schema/authors'
import { publishers, bookPublishers } from './schema/publishers'
import { isNull, eq, sql } from 'drizzle-orm'

async function migrate() {
  console.log('Starting authors/publishers migration...')

  // 1. Fetch all non-deleted books (use raw SQL for removed columns)
  const allBooks = await db
    .select({
      id: books.id,
      author: sql<string>`"author"`,
      publisher: sql<string>`"publisher"`,
    })
    .from(books)
    .where(isNull(books.deletedAt))

  console.log(`Found ${allBooks.length} books to process`)

  // 2. Collect unique author names
  const authorNames = new Set<string>()
  for (const book of allBooks) {
    if (book.author) {
      // Split by comma or & for multi-author books
      const names = book.author
        .split(/[,&]/)
        .map((n: string) => n.trim())
        .filter(Boolean)
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
      const names = book.author
        .split(/[,&]/)
        .map((n: string) => n.trim())
        .filter(Boolean)
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
