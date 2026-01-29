'use client'

import { useEffect, useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface SetupStatus {
  needsSetup: boolean
  isLoading: boolean
  error: string | null
}

export function useSetupStatus(): SetupStatus {
  const [status, setStatus] = useState<SetupStatus>({
    needsSetup: false,
    isLoading: true,
    error: null,
  })

  useEffect(() => {
    async function checkStatus() {
      try {
        const response = await fetch(`${API_URL}/api/setup/status`)

        if (!response.ok) {
          setStatus({
            needsSetup: false,
            isLoading: false,
            error: 'Failed to check setup status',
          })
          return
        }

        const data = await response.json()
        setStatus({
          needsSetup: data.needsSetup ?? false,
          isLoading: false,
          error: null,
        })
      } catch {
        setStatus({
          needsSetup: false,
          isLoading: false,
          error: 'Network error',
        })
      }
    }

    checkStatus()
  }, [])

  return status
}
