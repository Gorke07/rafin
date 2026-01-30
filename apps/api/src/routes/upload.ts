import { Elysia, t } from 'elysia'
import { db, books } from '@rafin/db'
import { eq, isNull, and } from 'drizzle-orm'
import { auth } from '../lib/auth'
import { processAndSaveCover } from '../services/image'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export const uploadRoutes = new Elysia({ prefix: '/api/upload' })
  // Upload cover image
  .post(
    '/cover',
    async ({ body, request, set }) => {
      const session = await auth.api.getSession({ headers: request.headers })

      if (!session?.user) {
        set.status = 401
        return { error: 'Unauthorized' }
      }

      const file = body.file as File

      if (!file) {
        set.status = 400
        return { error: 'No file provided' }
      }

      // Validate file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        set.status = 400
        return { error: 'Invalid file type. Allowed: JPEG, PNG, WebP' }
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        set.status = 400
        return { error: 'File too large. Maximum size: 5MB' }
      }

      const buffer = Buffer.from(await file.arrayBuffer())
      const { coverPath, filename } = await processAndSaveCover(buffer)

      return { coverPath, filename }
    },
    {
      body: t.Object({
        file: t.File(),
      }),
    },
  )

  // Set cover for a book (either from upload or external URL)
  .post(
    '/books/:id/cover',
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

      const updateData: { coverPath?: string; coverUrl?: string } = {}

      if (body.coverPath) {
        updateData.coverPath = body.coverPath
      }

      if (body.coverUrl) {
        updateData.coverUrl = body.coverUrl
      }

      if (!updateData.coverPath && !updateData.coverUrl) {
        set.status = 400
        return { error: 'Either coverPath or coverUrl must be provided' }
      }

      const result = await db
        .update(books)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(books.id, Number(params.id)))
        .returning()

      return { book: result[0] }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        coverPath: t.Optional(t.String()),
        coverUrl: t.Optional(t.String()),
      }),
    },
  )
