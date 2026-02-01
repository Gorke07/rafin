import { Elysia } from 'elysia'

export const securityHeaders = new Elysia({ name: 'security-headers' }).onAfterHandle(({ set }) => {
  set.headers['X-Content-Type-Options'] = 'nosniff'
  set.headers['X-Frame-Options'] = 'DENY'
  set.headers['X-XSS-Protection'] = '0'
  set.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
  set.headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  set.headers['Content-Security-Policy'] = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')

  if (process.env.NODE_ENV === 'production') {
    set.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
  }
})
