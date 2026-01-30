import { relations } from 'drizzle-orm'
import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  primaryKey,
} from 'drizzle-orm/pg-core'
import { user } from './auth'
import { books } from './books'

export const collections = pgTable('collections', {
  id: serial('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  color: text('color'), // hex color like #ff0000
  icon: text('icon'), // icon name
  isSmart: boolean('is_smart').notNull().default(false),
  smartFilters: jsonb('smart_filters'), // { rules: [], logic: 'and' | 'or' }
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const bookCollections = pgTable(
  'book_collections',
  {
    bookId: integer('book_id')
      .notNull()
      .references(() => books.id, { onDelete: 'cascade' }),
    collectionId: integer('collection_id')
      .notNull()
      .references(() => collections.id, { onDelete: 'cascade' }),
    position: integer('position').default(0), // for manual sorting
    addedAt: timestamp('added_at').notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.bookId, table.collectionId] })],
)

export const collectionsRelations = relations(collections, ({ one, many }) => ({
  user: one(user, {
    fields: [collections.userId],
    references: [user.id],
  }),
  bookCollections: many(bookCollections),
}))

export const bookCollectionsRelations = relations(bookCollections, ({ one }) => ({
  book: one(books, {
    fields: [bookCollections.bookId],
    references: [books.id],
  }),
  collection: one(collections, {
    fields: [bookCollections.collectionId],
    references: [collections.id],
  }),
}))
