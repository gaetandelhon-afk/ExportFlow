'use client'

import { useEffect, useRef } from 'react'
import { useClerk } from '@clerk/nextjs'

const ACTIVITY_KEY = 'ef_last_activity'
const DURATION_KEY = 'ef_session_duration_days'
const CHECK_INTERVAL_MS = 60_000

export function SessionWatcher() {
  const { signOut } = useClerk()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    fetch('/api/user/preferences')
      .then((res) => res.json())
      .then((data) => {
        const days = data.sessionDurationDays || 7
        localStorage.setItem(DURATION_KEY, String(days))
      })
      .catch(() => {})

    const updateActivity = () => {
      localStorage.setItem(ACTIVITY_KEY, String(Date.now()))
    }

    updateActivity()

    window.addEventListener('focus', updateActivity)
    window.addEventListener('click', updateActivity)
    window.addEventListener('keydown', updateActivity)

    intervalRef.current = setInterval(() => {
      const lastActivity = Number(localStorage.getItem(ACTIVITY_KEY) || Date.now())
      const durationDays = Number(localStorage.getItem(DURATION_KEY) || 7)
      const maxInactivity = durationDays * 24 * 60 * 60 * 1000
      const elapsed = Date.now() - lastActivity

      if (elapsed > maxInactivity) {
        signOut()
      }
    }, CHECK_INTERVAL_MS)

    return () => {
      window.removeEventListener('focus', updateActivity)
      window.removeEventListener('click', updateActivity)
      window.removeEventListener('keydown', updateActivity)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [signOut])

  return null
}
