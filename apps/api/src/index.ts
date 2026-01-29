import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { staticPlugin } from '@elysiajs/static'
import { auth } from './lib/auth'
import { authMiddleware } from './middleware/auth'

const app = new Elysia()
  .use(
    cors({
      origin: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  )
  .use(
    staticPlugin({
      assets: 'uploads',
      prefix: '/uploads',
    })
  )
  .mount('/api/auth', auth.handler)
  .use(authMiddleware)
  .get('/', () => ({ message: 'Rafin API is running' }))
  .get('/health', () => ({ status: 'ok', timestamp: new Date().toISOString() }))
  .listen(Number(process.env.API_PORT) || 3001)

console.log(`🦊 Rafin API is running at ${app.server?.hostname}:${app.server?.port}`)

export type App = typeof app
