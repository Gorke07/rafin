import { relations } from 'drizzle-orm'
import { pgTable, serial, text, timestamp, integer } from 'drizzle-orm/pg-core'
import { user } from './auth'
import { books } from './books'

export const bookNotes = pgTable('book_notes', {
  id: serial('id').primaryKey(),
  bookId: integer('book_id')
    .notNull()
    .references(() => books.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  pageNumber: integer('page_number'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const bookNotesRelations = relations(bookNotes, ({ one }) => ({
  book: one(books, {
    fields: [bookNotes.bookId],
    references: [books.id],
  }),
  user: one(user, {
    fields: [bookNotes.userId],
    references: [user.id],
  }),
}))
