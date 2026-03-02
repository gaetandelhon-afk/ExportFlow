'use client'

import { useAuth } from '@clerk/nextjs'
import { useEffect } from 'react'

/**
 * Intercepts all window.fetch calls to /api/* and injects a fresh Clerk JWT.
 * This fixes intermittent 401 errors across the entire app without having
 * to update every page individually.
 */
export function GlobalAuthFetch() {
  const { getToken } = useAuth()

  useEffect(() => {
    const originalFetch = window.fetch

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : (input as Request).url

      // Only intercept internal API calls
      if (url.startsWith('/api/')) {
        try {
          const token = await getToken()
          if (token) {
            const headers = new Headers(init?.headers)
            if (!headers.has('Authorization')) {
              headers.set('Authorization', `Bearer ${token}`)
            }
            return originalFetch(input, { ...init, headers })
          }
        } catch {
          // If token fetch fails, proceed without auth header
        }
      }

      return originalFetch(input, init)
    }

    return () => {
      window.fetch = originalFetch
    }
  }, [getToken])

  return null
}
