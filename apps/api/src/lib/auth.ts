import { db } from '@rafin/db/client'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { logger } from './logger'

const DEFAULT_SECRET = 'your-secret-key-change-in-production'
const secret = process.env.BETTER_AUTH_SECRET || DEFAULT_SECRET

if (secret === DEFAULT_SECRET && process.env.NODE_ENV === 'production') {
  logger.fatal(
    'BETTER_AUTH_SECRET is using the default value. Generate a secure secret with: openssl rand -hex 32',
  )
  process.exit(1)
}

function buildTrustedOrigins(): string[] {
  const origins = new Set<string>(['http://localhost:3000', 'http://localhost:3001'])

  const authUrl = process.env.BETTER_AUTH_URL
  if (authUrl) {
    origins.add(authUrl)
    const parsed = new URL(authUrl)
    const webPort = parsed.port === '3001' ? '3000' : parsed.port
    origins.add(`${parsed.protocol}//${parsed.hostname}:${webPort}`)
    origins.add(`${parsed.protocol}//${parsed.hostname}`)
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL
  if (apiUrl) {
    origins.add(apiUrl)
    const parsed = new URL(apiUrl)
    origins.add(`${parsed.protocol}//${parsed.hostname}`)
  }

  return [...origins]
}

export const trustedOrigins = buildTrustedOrigins()

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3001',
  secret,
  trustedOrigins,
  database: drizzleAdapter(db, {
    provider: 'pg',
  }),
  emailAndPassword: {
    enabled: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
})
