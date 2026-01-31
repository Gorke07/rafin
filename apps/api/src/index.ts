import { cors } from '@elysiajs/cors'
import { staticPlugin } from '@elysiajs/static'
import { Elysia } from 'elysia'
import { auth, trustedOrigins } from './lib/auth'
import { authMiddleware } from './middleware/auth'
import { rateLimitMiddleware } from './middleware/rate-limit'
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
import { reviewsRoutes } from './routes/reviews'
import { setupRoutes } from './routes/setup'
import { statsRoutes } from './routes/stats'
import { uploadRoutes } from './routes/upload'
import { userBookRoutes } from './routes/user-books'
import { userSettingsRoutes } from './routes/user-settings'

const app = new Elysia()
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
  .use(importRoutes)
  .use(uploadRoutes)
  .use(userSettingsRoutes)
  .use(authMiddleware)
  .get('/', () => ({ message: 'Rafin API is running' }))
  .get('/health', () => ({ status: 'ok', timestamp: new Date().toISOString() }))
  .onRequest(({ request }) => {
    const url = new URL(request.url)
    if (url.pathname !== '/health') {
      console.log(`[${new Date().toISOString()}] ${request.method} ${url.pathname}`)
    }
  })
  .onError(({ code, error, request, set }) => {
    const url = new URL(request.url)
    const message = 'message' in error ? error.message : String(error)
    console.error(`[${new Date().toISOString()}] ERROR ${request.method} ${url.pathname}:`, message)

    if (code === 'NOT_FOUND') {
      set.status = 404
      return { error: 'Not found' }
    }

    if (code === 'VALIDATION') {
      set.status = 400
      return { error: 'Validation failed', details: message }
    }

    set.status = 500
    return { error: 'Internal server error' }
  })
  .listen({
    port: Number(process.env.API_PORT) || 3001,
    hostname: '0.0.0.0',
  })

console.log(`[rafin] API running at ${app.server?.hostname}:${app.server?.port}`)

export type App = typeof app
