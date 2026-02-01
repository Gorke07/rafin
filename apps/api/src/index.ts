import { cors } from '@elysiajs/cors'
import { staticPlugin } from '@elysiajs/static'
import { db } from '@rafin/db/client'
import { sql } from 'drizzle-orm'
import { Elysia } from 'elysia'
import { auth, trustedOrigins } from './lib/auth'
import { validateEnv } from './lib/env'
import { logger } from './lib/logger'

validateEnv()
import { authMiddleware } from './middleware/auth'
import { rateLimitMiddleware } from './middleware/rate-limit'
import { requestLogger } from './middleware/request-logger'
import { securityHeaders } from './middleware/security-headers'
import { authorRoutes } from './routes/authors'
import { bookLookupRoutes } from './routes/book-lookup'
import { bookNotesRoutes } from './routes/book-notes'
import { bookRoutes } from './routes/books'
import { categoryRoutes } from './routes/categories'
import { collectionRoutes } from './routes/collections'
import { importRoutes } from './routes/import'
import { locationRoutes } from './routes/locations'
import { publisherRoutes } from './routes/publishers'
import { quotesRoutes } from './routes/quotes'
import { readingGoalRoutes } from './routes/reading-goals'
import { reviewsRoutes } from './routes/reviews'
import { setupRoutes } from './routes/setup'
import { statsRoutes } from './routes/stats'
import { uploadRoutes } from './routes/upload'
import { userBookRoutes } from './routes/user-books'
import { userSettingsRoutes } from './routes/user-settings'

const app = new Elysia()
  .use(securityHeaders)
  .use(
    cors({
      origin: trustedOrigins,
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  )
  .use(
    staticPlugin({
      assets: 'uploads',
      prefix: '/uploads',
    }),
  )
  .use(rateLimitMiddleware)
  .use(requestLogger)
  .mount(auth.handler)
  .use(setupRoutes)
  .use(bookLookupRoutes)
  .use(bookNotesRoutes)
  .use(bookRoutes)
  .use(locationRoutes)
  .use(userBookRoutes)
  .use(statsRoutes)
  .use(collectionRoutes)
  .use(categoryRoutes)
  .use(authorRoutes)
  .use(publisherRoutes)
  .use(quotesRoutes)
  .use(reviewsRoutes)
  .use(readingGoalRoutes)
  .use(importRoutes)
  .use(uploadRoutes)
  .use(userSettingsRoutes)
  .use(authMiddleware)
  .get('/', () => ({ message: 'Rafin API is running' }))
  .get('/health', async ({ set }) => {
    const checks: Record<string, { status: string; message?: string }> = {}

    try {
      await db.execute(sql`SELECT 1`)
      checks.database = { status: 'healthy' }
    } catch (err) {
      checks.database = {
        status: 'unhealthy',
        message: err instanceof Error ? err.message : 'Connection failed',
      }
    }

    const allHealthy = Object.values(checks).every((c) => c.status === 'healthy')

    if (!allHealthy) {
      set.status = 503
    }

    return {
      status: allHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
    }
  })
  .onError(({ code, error, request, set }) => {
    const url = new URL(request.url)
    const message = 'message' in error ? error.message : String(error)

    if (code === 'NOT_FOUND') {
      set.status = 404
      return { error: 'Not found' }
    }

    if (code === 'VALIDATION') {
      set.status = 400
      return { error: 'Validation failed', details: message }
    }

    logger.error(
      {
        method: request.method,
        path: url.pathname,
        error: message,
        code,
      },
      'Unhandled error',
    )

    set.status = 500
    return { error: 'Internal server error' }
  })
  .listen({
    port: Number(process.env.API_PORT) || 3001,
    hostname: '0.0.0.0',
  })

logger.info({ host: app.server?.hostname, port: app.server?.port }, 'Rafin API started')

function gracefulShutdown(signal: string) {
  logger.info({ signal }, 'Shutdown signal received, closing server...')
  app.stop()
  logger.info('Server closed')
  process.exit(0)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

export type App = typeof app
