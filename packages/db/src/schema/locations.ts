import { pgTable, serial, text, integer, timestamp } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const locationType = ['room', 'furniture', 'shelf'] as const

export const locations = pgTable('locations', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type', { enum: locationType }).notNull(),
  parentId: integer('parent_id').references((): any => locations.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const locationsRelations = relations(locations, ({ one, many }) => ({
  parent: one(locations, {
    fields: [locations.parentId],
    references: [locations.id],
    relationName: 'locationHierarchy',
  }),
  children: many(locations, { relationName: 'locationHierarchy' }),
}))
