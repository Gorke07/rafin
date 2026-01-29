import { Elysia, t } from 'elysia'
import { db, locations } from '@rafin/db'
import { eq, isNull, asc } from 'drizzle-orm'

export const locationRoutes = new Elysia({ prefix: '/api/locations' })
  .get('/', async () => {
    const result = await db
      .select()
      .from(locations)
      .orderBy(asc(locations.name))

    // Build tree structure
    const locationMap = new Map<number, typeof result[0] & { children: typeof result }>()
    const roots: (typeof result[0] & { children: typeof result })[] = []

    result.forEach(loc => {
      locationMap.set(loc.id, { ...loc, children: [] })
    })

    result.forEach(loc => {
      const node = locationMap.get(loc.id)!
      if (loc.parentId) {
        const parent = locationMap.get(loc.parentId)
        if (parent) {
          parent.children.push(node)
        }
      } else {
        roots.push(node)
      }
    })

    return { locations: roots, flat: result }
  })

  .get('/:id', async ({ params, set }) => {
    const result = await db
      .select()
      .from(locations)
      .where(eq(locations.id, Number(params.id)))
      .limit(1)

    if (result.length === 0) {
      set.status = 404
      return { error: 'Location not found' }
    }

    return { location: result[0] }
  }, {
    params: t.Object({
      id: t.String()
    })
  })

  .post('/', async ({ body }) => {
    const result = await db.insert(locations).values({
      name: body.name,
      type: body.type,
      parentId: body.parentId || null,
    }).returning()

    return { location: result[0] }
  }, {
    body: t.Object({
      name: t.String({ minLength: 1 }),
      type: t.Union([t.Literal('room'), t.Literal('furniture'), t.Literal('shelf')]),
      parentId: t.Optional(t.Number()),
    })
  })

  .patch('/:id', async ({ params, body, set }) => {
    const existing = await db
      .select()
      .from(locations)
      .where(eq(locations.id, Number(params.id)))
      .limit(1)

    if (existing.length === 0) {
      set.status = 404
      return { error: 'Location not found' }
    }

    const result = await db
      .update(locations)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(locations.id, Number(params.id)))
      .returning()

    return { location: result[0] }
  }, {
    params: t.Object({
      id: t.String()
    }),
    body: t.Object({
      name: t.Optional(t.String()),
      type: t.Optional(t.Union([t.Literal('room'), t.Literal('furniture'), t.Literal('shelf')])),
      parentId: t.Optional(t.Number()),
    })
  })

  .delete('/:id', async ({ params, set }) => {
    const existing = await db
      .select()
      .from(locations)
      .where(eq(locations.id, Number(params.id)))
      .limit(1)

    if (existing.length === 0) {
      set.status = 404
      return { error: 'Location not found' }
    }

    await db.delete(locations).where(eq(locations.id, Number(params.id)))

    return { success: true }
  }, {
    params: t.Object({
      id: t.String()
    })
  })
