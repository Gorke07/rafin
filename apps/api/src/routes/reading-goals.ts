import { db, readingGoals, userBooks } from '@rafin/db'
import { and, count, eq, gte, lt } from 'drizzle-orm'
import { Elysia, t } from 'elysia'

export const readingGoalRoutes = new Elysia({ prefix: '/api/reading-goals' })
  .get(
    '/:year',
    async ({ params, store }) => {
      const userId = (store as { user?: { id: string } }).user?.id
      if (!userId) return { goal: null, progress: 0 }

      const year = Number(params.year)
      const yearStart = new Date(year, 0, 1)
      const yearEnd = new Date(year + 1, 0, 1)

      const goals = await db
        .select()
        .from(readingGoals)
        .where(and(eq(readingGoals.userId, userId), eq(readingGoals.year, year)))
        .limit(1)

      const completedResult = await db
        .select({ count: count() })
        .from(userBooks)
        .where(
          and(
            eq(userBooks.userId, userId),
            eq(userBooks.status, 'completed'),
            gte(userBooks.finishedAt, yearStart),
            lt(userBooks.finishedAt, yearEnd),
          ),
        )

      const progress = completedResult[0]?.count ?? 0

      return {
        goal: goals[0] || null,
        progress,
      }
    },
    {
      params: t.Object({
        year: t.String(),
      }),
    },
  )

  .post(
    '/',
    async ({ body, store, set }) => {
      const userId = (store as { user?: { id: string } }).user?.id
      if (!userId) {
        set.status = 401
        return { error: 'Unauthorized' }
      }

      const existing = await db
        .select()
        .from(readingGoals)
        .where(and(eq(readingGoals.userId, userId), eq(readingGoals.year, body.year)))
        .limit(1)

      if (existing.length > 0) {
        const result = await db
          .update(readingGoals)
          .set({ targetBooks: body.targetBooks, updatedAt: new Date() })
          .where(eq(readingGoals.id, existing[0].id))
          .returning()
        return { goal: result[0] }
      }

      const result = await db
        .insert(readingGoals)
        .values({
          userId,
          year: body.year,
          targetBooks: body.targetBooks,
        })
        .returning()

      return { goal: result[0] }
    },
    {
      body: t.Object({
        year: t.Number(),
        targetBooks: t.Number({ minimum: 1 }),
      }),
    },
  )

  .delete(
    '/:year',
    async ({ params, store, set }) => {
      const userId = (store as { user?: { id: string } }).user?.id
      if (!userId) {
        set.status = 401
        return { error: 'Unauthorized' }
      }

      await db
        .delete(readingGoals)
        .where(and(eq(readingGoals.userId, userId), eq(readingGoals.year, Number(params.year))))

      return { success: true }
    },
    {
      params: t.Object({
        year: t.String(),
      }),
    },
  )
