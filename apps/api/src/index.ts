import { cors } from '@elysiajs/cors'
import { staticPlugin } from '@elysiajs/static'
import { Elysia } from 'elysia'
import { auth } from './lib/auth'
import { authMiddleware } from './middleware/auth'
import { bookLookupRoutes } from './routes/book-lookup'
import { bookNotesRoutes } from './routes/book-notes'
import { bookRoutes } from './routes/books'
import { categoryRoutes } from './routes/categories'
import { collectionRoutes } from './routes/collections'
import { locationRoutes } from './routes/locations'
import { setupRoutes } from './routes/setup'
import { statsRoutes } from './routes/stats'
import { uploadRoutes } from './routes/upload'
import { userBookRoutes } from './routes/user-books'
import { userSettingsRoutes } from './routes/user-settings'

const app = new Elysia()
  .use(
    cors({
      origin: true,
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
  .use(uploadRoutes)
  .use(userSettingsRoutes)
  .use(authMiddleware)
  .get('/', () => ({ message: 'Rafin API is running' }))
  .get('/health', () => ({ status: 'ok', timestamp: new Date().toISOString() }))
  .listen({
    port: Number(process.env.API_PORT) || 3001,
    hostname: '0.0.0.0',
  })

console.log(`🦊 Rafin API is running at ${app.server?.hostname}:${app.server?.port}`)

export type App = typeof app
