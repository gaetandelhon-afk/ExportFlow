'use client'

import { PreviewProvider } from '@/contexts/PreviewContext'

export function PreviewProviderWrapper({ children }: { children: React.ReactNode }) {
  return <PreviewProvider>{children}</PreviewProvider>
}
