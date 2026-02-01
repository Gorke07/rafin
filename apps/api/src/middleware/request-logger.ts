import { Elysia } from 'elysia'
import { logger } from '../lib/logger'

let requestCounter = 0

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${(++requestCounter).toString(36)}`
}

function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

export const requestLogger = new Elysia({ name: 'request-logger' })
  .derive(({ request }) => {
    const requestId = generateRequestId()
    return { requestId, requestStart: Date.now(), requestIp: getClientIp(request) }
  })
  .onAfterHandle(({ request, requestId, requestStart, set }) => {
    const url = new URL(request.url)
    if (url.pathname === '/health') return

    const duration = Date.now() - requestStart
    logger.info(
      {
        requestId,
        method: request.method,
        path: url.pathname,
        status: set.status || 200,
        duration,
      },
      `${request.method} ${url.pathname}`,
    )
  })
  .onError(({ request, error, code, requestId, requestStart }) => {
    const url = new URL(request.url)
    const duration = requestStart ? Date.now() - requestStart : 0
    const message = 'message' in error ? error.message : String(error)

    logger.error(
      {
        requestId,
        method: request.method,
        path: url.pathname,
        error: message,
        code,
        duration,
      },
      `${request.method} ${url.pathname} ERROR`,
    )
  })
