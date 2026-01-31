import { bookNotes, books, db } from '@rafin/db'
import { and, desc, eq, isNull } from 'drizzle-orm'
import { Elysia, t } from 'elysia'
import { auth } from '../lib/auth'

export const bookNotesRoutes = new Elysia({ prefix: '/api/books' })
  // Get notes for a book
  .get(
    '/:id/notes',
    async ({ params, request, set }) => {
      const session = await auth.api.getSession({ headers: request.headers })

      if (!session?.user) {
        set.status = 401
        return { error: 'Unauthorized' }
      }

      // Check if book exists
      const book = await db
        .select()
        .from(books)
        .where(and(eq(books.id, Number(params.id)), isNull(books.deletedAt)))
        .limit(1)

      if (book.length === 0) {
        set.status = 404
        return { error: 'Book not found' }
      }

      const notes = await db
        .select()
        .from(bookNotes)
        .where(and(eq(bookNotes.bookId, Number(params.id)), eq(bookNotes.userId, session.user.id)))
        .orderBy(desc(bookNotes.createdAt))

      return { notes }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    },
  )

  // Add note to a book
  .post(
    '/:id/notes',
    async ({ params, body, request, set }) => {
      const session = await auth.api.getSession({ headers: request.headers })

      if (!session?.user) {
        set.status = 401
        return { error: 'Unauthorized' }
      }

      // Check if book exists
      const book = await db
        .select()
        .from(books)
        .where(and(eq(books.id, Number(params.id)), isNull(books.deletedAt)))
        .limit(1)

      if (book.length === 0) {
        set.status = 404
        return { error: 'Book not found' }
      }

      const result = await db
        .insert(bookNotes)
        .values({
          bookId: Number(params.id),
          userId: session.user.id,
          content: body.content,
          pageNumber: body.pageNumber || null,
        })
        .returning()

      return { note: result[0] }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        content: t.String({ minLength: 1 }),
        pageNumber: t.Optional(t.Number()),
      }),
    },
  )

  // Update a note
  .patch(
    '/:id/notes/:noteId',
    async ({ params, body, request, set }) => {
      const session = await auth.api.getSession({ headers: request.headers })

      if (!session?.user) {
        set.status = 401
        return { error: 'Unauthorized' }
      }

      const existing = await db
        .select()
        .from(bookNotes)
        .where(and(eq(bookNotes.id, Number(params.noteId)), eq(bookNotes.userId, session.user.id)))
        .limit(1)

      if (existing.length === 0) {
        set.status = 404
        return { error: 'Note not found' }
      }

      const result = await db
        .update(bookNotes)
        .set({
          content: body.content ?? existing[0].content,
          pageNumber: body.pageNumber ?? existing[0].pageNumber,
          updatedAt: new Date(),
        })
        .where(eq(bookNotes.id, Number(params.noteId)))
        .returning()

      return { note: result[0] }
    },
    {
      params: t.Object({
        id: t.String(),
        noteId: t.String(),
      }),
      body: t.Object({
        content: t.Optional(t.String()),
        pageNumber: t.Optional(t.Number()),
      }),
    },
  )

  // Delete a note
  .delete(
    '/:id/notes/:noteId',
    async ({ params, request, set }) => {
      const session = await auth.api.getSession({ headers: request.headers })

      if (!session?.user) {
        set.status = 401
        return { error: 'Unauthorized' }
      }

      const existing = await db
        .select()
        .from(bookNotes)
        .where(and(eq(bookNotes.id, Number(params.noteId)), eq(bookNotes.userId, session.user.id)))
        .limit(1)

      if (existing.length === 0) {
        set.status = 404
        return { error: 'Note not found' }
      }

      await db.delete(bookNotes).where(eq(bookNotes.id, Number(params.noteId)))

      return { success: true }
    },
    {
      params: t.Object({
        id: t.String(),
        noteId: t.String(),
      }),
    },
  )
