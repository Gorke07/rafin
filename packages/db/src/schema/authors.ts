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
