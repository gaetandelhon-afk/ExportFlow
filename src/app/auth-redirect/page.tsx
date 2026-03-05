'use client'

import { useEffect } from 'react'
import { useUser } from '@clerk/nextjs'

/**
 * This page handles post-login redirect.
 * It reads the user's companySlug from Clerk metadata and redirects
 * to the correct subdomain dashboard, or to onboarding if not set up.
 */
export default function AuthRedirectPage() {
  const { user, isLoaded } = useUser()

  useEffect(() => {
    if (!isLoaded) return

    if (!user) {
      window.location.href = '/sign-in'
      return
    }

    const metadata = user.publicMetadata as Record<string, unknown>
    const companySlug = metadata?.companySlug as string | undefined
    const onboardingComplete = metadata?.onboardingComplete as boolean | undefined

    if (!onboardingComplete || !companySlug) {
      window.location.href = '/onboarding'
      return
    }

    // Redirect to the correct subdomain in production, or /dashboard in dev
    const isProd = typeof window !== 'undefined' && window.location.hostname.endsWith('.exportflow.io')
    if (isProd) {
      window.location.href = `https://${companySlug}.exportflow.io/dashboard`
    } else {
      window.location.href = '/dashboard'
    }
  }, [isLoaded, user])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mb-4" />
        <p className="text-slate-600 text-sm">Redirecting to your dashboard...</p>
      </div>
    </div>
  )
}
