import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const localeCookie = request.cookies.get('NEXT_LOCALE')?.value
  const locale = localeCookie || 'en'

  const response = NextResponse.next()

  if (!localeCookie) {
    response.cookies.set('NEXT_LOCALE', locale, {
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    })
  }

  return response
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
