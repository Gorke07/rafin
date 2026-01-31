'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
const SETUP_CACHE_KEY = 'rafin:setup-complete'

export function SetupGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    if (pathname === '/setup') {
      setIsChecking(false)
      return
    }

    const cached = sessionStorage.getItem(SETUP_CACHE_KEY)
    if (cached === 'true') {
      setIsChecking(false)
      return
    }

    async function checkSetup() {
      try {
        const response = await fetch(`${API_URL}/api/setup/status`)
        if (response.ok) {
          const data = await response.json()
          if (data.needsSetup) {
            router.replace('/setup')
            return
          }
          sessionStorage.setItem(SETUP_CACHE_KEY, 'true')
        }
      } catch (error) {
        console.error('Setup check failed:', error)
      }
      setIsChecking(false)
    }

    checkSetup()
  }, [pathname, router])

  if (isChecking && pathname !== '/setup') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return <>{children}</>
}
