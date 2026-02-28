'use client'

import { useAuth } from '@clerk/nextjs'
import { useCallback } from 'react'

/**
 * Returns a fetch wrapper that always injects a fresh Clerk JWT.
 * Solves intermittent 401 caused by short-lived session tokens expiring
 * between page load and API call.
 */
export function useAuthFetch() {
  const { getToken } = useAuth()

  const authFetch = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      const token = await getToken()
      const headers: Record<string, string> = {
        ...(options.headers as Record<string, string>),
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      return fetch(url, { ...options, headers })
    },
    [getToken]
  )

  return authFetch
}
