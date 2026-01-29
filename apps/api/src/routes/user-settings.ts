import { books, db, user, userBooks } from '@rafin/db'
import { eq, isNull } from 'drizzle-orm'
import { Elysia, t } from 'elysia'
import { auth } from '../lib/auth'

export const userSettingsRoutes = new Elysia({ prefix: '/api/user' })
  .derive(async ({ request }) => {
    const session = await auth.api.getSession({ headers: request.headers })
    return {
      user: session?.user ?? null,
      session: session?.session ?? null,
    }
  })

  .get('/profile', async ({ user: currentUser }) => {
    if (!currentUser) {
      return new Response('Unauthorized', { status: 401 })
    }

    const result = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      })
      .from(user)
      .where(eq(user.id, currentUser.id))
      .limit(1)

    if (!result[0]) {
      return new Response('User not found', { status: 404 })
    }

    return result[0]
  })

  .patch(
    '/profile',
    async ({ user: currentUser, body }) => {
      if (!currentUser) {
        return new Response('Unauthorized', { status: 401 })
      }

      const updated = await db
        .update(user)
        .set({ name: body.name })
        .where(eq(user.id, currentUser.id))
        .returning({
          id: user.id,
          name: user.name,
          email: user.email,
        })

      return updated[0]
    },
    {
      body: t.Object({
        name: t.String({ minLength: 2 }),
      }),
    },
  )

  .get('/export', async ({ user: currentUser }) => {
    if (!currentUser) {
      return new Response('Unauthorized', { status: 401 })
    }

    const allBooks = await db.select().from(books).where(isNull(books.deletedAt))

    const readingData = await db
      .select()
      .from(userBooks)
      .where(eq(userBooks.userId, currentUser.id))

    const exportData = {
      exportedAt: new Date().toISOString(),
      user: {
        name: currentUser.name,
        email: currentUser.email,
      },
      books: allBooks,
      readingData,
    }

    return new Response(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="rafin-export-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    })
  })
