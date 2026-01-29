import { relations } from 'drizzle-orm'
import { integer, numeric, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'
import { locations } from './locations'

export const bindingTypes = ['paperback', 'hardcover', 'ebook'] as const

export const books = pgTable('books', {
  id: serial('id').primaryKey(),
  isbn: text('isbn'),
  title: text('title').notNull(),
  author: text('author').notNull(),
  publisher: text('publisher'),
  publishedYear: integer('published_year'),
  pageCount: integer('page_count'),
  coverPath: text('cover_path'),
  coverUrl: text('cover_url'), // external cover URL from ISBN lookup
  translator: text('translator'),
  description: text('description'),
  language: text('language'),
  bindingType: text('binding_type', { enum: bindingTypes }),
  purchaseDate: timestamp('purchase_date'),
  purchasePrice: numeric('purchase_price', { precision: 10, scale: 2 }),
  currency: text('currency').default('TRY'),
  store: text('store'),
  copyNote: text('copy_note'),
  locationId: integer('location_id').references(() => locations.id, { onDelete: 'set null' }),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const booksRelations = relations(books, ({ one }) => ({
  location: one(locations, {
    fields: [books.locationId],
    references: [locations.id],
  }),
}))
