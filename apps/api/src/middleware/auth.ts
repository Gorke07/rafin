import { Elysia } from 'elysia'
import { auth } from '../lib/auth'

export const authMiddleware = new Elysia({ name: 'auth-middleware' })
  .derive(async ({ request }) => {
    const session = await auth.api.getSession({ headers: request.headers })
    return {
      user: session?.user ?? null,
      session: session?.session ?? null,
    }
  })
  .macro({
    requireAuth: () => ({
      async beforeHandle({ user, error }) {
        if (!user) {
          return error(401, { message: 'Unauthorized' })
        }
      },
    }),
  })
