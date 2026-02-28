'use client'

import { BrandingProvider } from '@/contexts/BrandingContext'

export function BrandingProviderWrapper({ children }: { children: React.ReactNode }) {
  return <BrandingProvider>{children}</BrandingProvider>
}
