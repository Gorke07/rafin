import { z } from 'zod'

export const createLocationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['room', 'furniture', 'shelf']),
  parentId: z.number().int().positive().optional(),
})

export const updateLocationSchema = createLocationSchema.partial()

export type CreateLocationInput = z.infer<typeof createLocationSchema>
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>
