import { Elysia } from 'elysia'

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

const WINDOW_MS = 15 * 60 * 1000
const MAX_REQUESTS = 20

setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key)
  }
}, 60_000)

function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

export const rateLimitMiddleware = new Elysia({ name: 'rate-limit' }).onBeforeHandle(
  ({ request, set }) => {
    const url = new URL(request.url)
    const isAuthRoute =
      url.pathname.startsWith('/api/auth/sign-in') ||
      url.pathname.startsWith('/api/auth/sign-up') ||
      url.pathname.startsWith('/api/setup/complete')

    if (!isAuthRoute) return

    const ip = getClientIp(request)
    const key = `${ip}:${url.pathname}`
    const now = Date.now()

    const entry = store.get(key)
    if (!entry || now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + WINDOW_MS })
      return
    }

    entry.count++
    if (entry.count > MAX_REQUESTS) {
      set.status = 429
      set.headers['retry-after'] = String(Math.ceil((entry.resetAt - now) / 1000))
      return { error: 'Too many requests. Please try again later.' }
    }
  },
)
