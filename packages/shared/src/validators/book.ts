import { z } from 'zod'

export const createBookSchema = z.object({
  isbn: z.string().optional(),
  title: z.string().min(1, 'Title is required'),
  author: z.string().min(1, 'Author is required'),
  publisher: z.string().optional(),
  publishedYear: z.number().int().min(1000).max(2100).optional(),
  pageCount: z.number().int().positive().optional(),
  translator: z.string().optional(),
  purchaseDate: z.coerce.date().optional(),
  purchasePrice: z.number().positive().optional(),
  currency: z.string().default('TRY'),
  store: z.string().optional(),
  copyNote: z.string().optional(),
  locationId: z.number().int().positive().optional(),
})

export const updateBookSchema = createBookSchema.partial()

export const updateReadingStatusSchema = z.object({
  status: z.enum(['tbr', 'reading', 'completed', 'dnf']),
  currentPage: z.number().int().min(0).optional(),
})

export type CreateBookInput = z.infer<typeof createBookSchema>
export type UpdateBookInput = z.infer<typeof updateBookSchema>
export type UpdateReadingStatusInput = z.infer<typeof updateReadingStatusSchema>
