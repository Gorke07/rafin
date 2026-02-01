import path from 'node:path'
import withPWAInit from '@ducanh2912/next-pwa'
import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  scope: '/',
})

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
let apiHostname = 'localhost'
try {
  apiHostname = new URL(apiUrl).hostname
} catch {}

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../../'),
  transpilePackages: ['@rafin/shared', '@rafin/ui'],
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'http',
        hostname: apiHostname,
      },
      {
        protocol: 'https',
        hostname: apiHostname,
      },
      {
        protocol: 'https',
        hostname: 'books.google.com',
      },
      {
        protocol: 'https',
        hostname: 'covers.openlibrary.org',
      },
      {
        protocol: 'https',
        hostname: 'img.kitapyurdu.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.bkmkitap.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.idefix.com',
      },
      {
        protocol: 'https',
        hostname: '**.idefix.com',
      },
      {
        protocol: 'https',
        hostname: '**.bkmkitap.com',
      },
      {
        protocol: 'https',
        hostname: '**.kitapyurdu.com',
      },
    ],
  },
}

export default withPWA(withNextIntl(nextConfig))
