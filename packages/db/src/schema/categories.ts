import { relations } from 'drizzle-orm'
import { pgTable, serial, text, timestamp, integer, primaryKey } from 'drizzle-orm/pg-core'
import { books } from './books'

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const bookCategories = pgTable(
  'book_categories',
  {
    bookId: integer('book_id')
      .notNull()
      .references(() => books.id, { onDelete: 'cascade' }),
    categoryId: integer('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.bookId, table.categoryId] })],
)

export const categoriesRelations = relations(categories, ({ many }) => ({
  bookCategories: many(bookCategories),
}))

export const bookCategoriesRelations = relations(bookCategories, ({ one }) => ({
  book: one(books, {
    fields: [bookCategories.bookId],
    references: [books.id],
  }),
  category: one(categories, {
    fields: [bookCategories.categoryId],
    references: [categories.id],
  }),
}))
