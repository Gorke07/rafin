import { pgTable, serial, text, integer, boolean, timestamp, unique } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { books } from './books'

export const readingStatus = ['tbr', 'reading', 'completed', 'dnf'] as const

export const userBooks = pgTable(
  'user_books',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id').notNull(),
    bookId: integer('book_id')
      .notNull()
      .references(() => books.id, { onDelete: 'cascade' }),
    status: text('status', { enum: readingStatus }).notNull().default('tbr'),
    currentPage: integer('current_page').default(0),
    startedAt: timestamp('started_at'),
    finishedAt: timestamp('finished_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [unique('user_book_unique').on(table.userId, table.bookId)]
)

export const userBooksRelations = relations(userBooks, ({ one }) => ({
  book: one(books, {
    fields: [userBooks.bookId],
    references: [books.id],
  }),
}))

export const quotes = pgTable('quotes', {
  id: serial('id').primaryKey(),
  userBookId: integer('user_book_id')
    .notNull()
    .references(() => userBooks.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  pageNumber: integer('page_number'),
  isPrivate: boolean('is_private').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const quotesRelations = relations(quotes, ({ one }) => ({
  userBook: one(userBooks, {
    fields: [quotes.userBookId],
    references: [userBooks.id],
  }),
}))

export const reviews = pgTable('reviews', {
  id: serial('id').primaryKey(),
  userBookId: integer('user_book_id')
    .notNull()
    .references(() => userBooks.id, { onDelete: 'cascade' }),
  rating: integer('rating').notNull(),
  content: text('content'),
  isPrivate: boolean('is_private').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const reviewsRelations = relations(reviews, ({ one }) => ({
  userBook: one(userBooks, {
    fields: [reviews.userBookId],
    references: [userBooks.id],
  }),
}))
