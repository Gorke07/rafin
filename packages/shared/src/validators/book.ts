import { z } from 'zod'

export const bindingTypes = ['paperback', 'hardcover', 'ebook'] as const
export const currencies = ['TRY', 'USD', 'EUR'] as const

export const createBookSchema = z.object({
  isbn: z
    .string()
    .regex(/^(97[89])?\d{9}[\dXx]$/)
    .optional()
    .or(z.literal('')),
  title: z.string().min(1, 'Title is required'),
  author: z.string().min(1, 'Author is required'),
  publisher: z.string().optional(),
  publishedYear: z.number().int().min(1000).max(2100).optional(),
  pageCount: z.number().int().positive().optional(),
  translator: z.string().optional(),
  purchaseDate: z.coerce.date().optional(),
  purchasePrice: z.number().positive().optional(),
  currency: z.enum(currencies).default('TRY'),
  store: z.string().optional(),
  copyNote: z.string().optional(),
  locationId: z.number().int().positive().optional(),
  description: z.string().max(20000).optional(),
  language: z.string().optional(),
  bindingType: z.enum(bindingTypes).optional(),
  coverUrl: z.string().url().optional(),
  categoryIds: z.array(z.number().int().positive()).optional(),
  collectionIds: z.array(z.number().int().positive()).optional(),
})

export const updateBookSchema = createBookSchema.partial()

export const updateReadingStatusSchema = z.object({
  status: z.enum(['tbr', 'reading', 'completed', 'dnf']),
  currentPage: z.number().int().min(0).optional(),
  startedAt: z.coerce.date().optional(),
  completedAt: z.coerce.date().optional(),
})

export const collectionSchema = z.object({
  name: z.string().min(1, 'Collection name is required'),
  description: z.string().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  icon: z.string().optional(),
  isSmart: z.boolean().default(false),
  smartFilters: z
    .object({
      rules: z.array(
        z.object({
          field: z.string(),
          operator: z.string(),
          value: z.any(),
        }),
      ),
      logic: z.enum(['and', 'or']).default('and'),
    })
    .optional(),
})

export const bookNoteSchema = z.object({
  content: z.string().min(1, 'Note content is required'),
  pageNumber: z.number().int().positive().optional(),
})

export type CreateBookInput = z.infer<typeof createBookSchema>
export type UpdateBookInput = z.infer<typeof updateBookSchema>
export type UpdateReadingStatusInput = z.infer<typeof updateReadingStatusSchema>
export type CollectionInput = z.infer<typeof collectionSchema>
export type BookNoteInput = z.infer<typeof bookNoteSchema>
