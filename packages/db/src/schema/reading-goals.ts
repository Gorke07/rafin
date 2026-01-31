import { relations } from 'drizzle-orm'
import { integer, pgTable, serial, text, timestamp, unique } from 'drizzle-orm/pg-core'
import { user } from './auth'

export const readingGoals = pgTable(
  'reading_goals',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    year: integer('year').notNull(),
    targetBooks: integer('target_books').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [unique('reading_goal_user_year').on(table.userId, table.year)],
)

export const readingGoalsRelations = relations(readingGoals, ({ one }) => ({
  user: one(user, {
    fields: [readingGoals.userId],
    references: [user.id],
  }),
}))
