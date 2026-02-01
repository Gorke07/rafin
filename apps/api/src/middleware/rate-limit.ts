import { Elysia } from 'elysia'

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

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

interface RateLimitRule {
  match: (pathname: string, method: string) => boolean
  windowMs: number
  max: number
}

const rules: RateLimitRule[] = [
  {
    match: (p) =>
      p.startsWith('/api/auth/sign-in') ||
      p.startsWith('/api/auth/sign-up') ||
      p.startsWith('/api/setup/complete'),
    windowMs: 15 * 60 * 1000,
    max: 20,
  },
  {
    match: (p) => p.startsWith('/api/upload'),
    windowMs: 15 * 60 * 1000,
    max: 60,
  },
  {
    match: (p) => p.startsWith('/api/import'),
    windowMs: 15 * 60 * 1000,
    max: 10,
  },
  {
    match: (p) => p.startsWith('/api/book-lookup'),
    windowMs: 15 * 60 * 1000,
    max: 60,
  },
]

export const rateLimitMiddleware = new Elysia({ name: 'rate-limit' }).onBeforeHandle(
  ({ request, set }) => {
    const url = new URL(request.url)
    const rule = rules.find((r) => r.match(url.pathname, request.method))

    if (!rule) return

    const ip = getClientIp(request)
    const key = `${ip}:${url.pathname}`
    const now = Date.now()

    const entry = store.get(key)
    if (!entry || now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + rule.windowMs })
      return
    }

    entry.count++
    if (entry.count > rule.max) {
      set.status = 429
      set.headers['retry-after'] = String(Math.ceil((entry.resetAt - now) / 1000))
      return { error: 'Too many requests. Please try again later.' }
    }
  },
)
