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
