'use client'

import { ReactNode } from 'react'
import { ClerkProvider } from '@clerk/nextjs'
import { BrandingProvider } from '@/contexts/BrandingContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { SessionWatcher } from '@/components/SessionWatcher'
import { ImpersonationBanner } from '@/components/ImpersonationBanner'
import { GlobalAuthFetch } from '@/components/GlobalAuthFetch'

interface ProvidersProps {
  children: ReactNode
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <ClerkProvider
      afterSignOutUrl="/"
      signInFallbackRedirectUrl="/auth-redirect"
      signUpFallbackRedirectUrl="/onboarding"
    >
      <ThemeProvider>
        <BrandingProvider>
          <GlobalAuthFetch />
          <ImpersonationBanner />
          <SessionWatcher />
          {children}
        </BrandingProvider>
      </ThemeProvider>
    </ClerkProvider>
  )
}
