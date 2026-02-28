'use client'

import { ReactNode } from 'react'
import { ClerkProvider } from '@clerk/nextjs'
import { BrandingProvider } from '@/contexts/BrandingContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { SessionWatcher } from '@/components/SessionWatcher'
import { ImpersonationBanner } from '@/components/ImpersonationBanner'

interface ProvidersProps {
  children: ReactNode
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <ClerkProvider
      afterSignOutUrl="/"
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/onboarding"
    >
      <ThemeProvider>
        <BrandingProvider>
          <ImpersonationBanner />
          <SessionWatcher />
          {children}
        </BrandingProvider>
      </ThemeProvider>
    </ClerkProvider>
  )
}
