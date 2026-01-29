import { Elysia, t } from 'elysia'
import { db, user } from '@rafin/db'
import { count } from 'drizzle-orm'
import { auth } from '../lib/auth'

export const setupRoutes = new Elysia({ prefix: '/api/setup' })
  .get('/status', async () => {
    const result = await db.select({ count: count() }).from(user)
    const userCount = result[0]?.count ?? 0
    return { needsSetup: userCount === 0 }
  })
  .post(
    '/complete',
    async ({ body, set }) => {
      // Check if setup is still needed
      const result = await db.select({ count: count() }).from(user)
      const userCount = result[0]?.count ?? 0

      if (userCount > 0) {
        set.status = 400
        return { error: 'Setup already completed' }
      }

      try {
        // Create the admin user using Better Auth's signUp
        const signUpResponse = await auth.api.signUpEmail({
          body: {
            name: body.name,
            email: body.email,
            password: body.password,
          },
        })

        if (!signUpResponse) {
          set.status = 500
          return { error: 'Failed to create user' }
        }

        return { success: true }
      } catch (error) {
        console.error('Setup error:', error)
        set.status = 500
        return { error: 'Failed to create admin account' }
      }
    },
    {
      body: t.Object({
        name: t.String({ minLength: 2 }),
        email: t.String({ format: 'email' }),
        password: t.String({ minLength: 8 }),
      }),
    }
  )
