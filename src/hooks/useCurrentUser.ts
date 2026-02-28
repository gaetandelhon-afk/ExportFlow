'use client'

import { useState, useEffect } from 'react'

interface CurrentUser {
  userId: string
  email: string
  name: string
  role: 'ADMIN' | 'COMMERCIAL' | 'WAREHOUSE' | 'DISTRIBUTOR'
  companyId: string
  companyName?: string
}

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/me')
        if (!res.ok) {
          throw new Error('Failed to fetch user')
        }
        const data = await res.json()
        setUser(data)
      } catch (err) {
        console.error('Failed to fetch current user:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [])

  return { user, loading, error }
}
