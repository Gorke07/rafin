import { z } from 'zod'

export const createAuthorSchema = z.object({
  name: z.string().min(1, 'Author name is required'),
  bio: z.string().optional(),
  photoUrl: z.string().url().optional(),
})

export const updateAuthorSchema = createAuthorSchema.partial()

export type CreateAuthorInput = z.infer<typeof createAuthorSchema>
export type UpdateAuthorInput = z.infer<typeof updateAuthorSchema>
