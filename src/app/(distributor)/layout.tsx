import { ReactNode } from 'react'
import { DistributorProvider } from '@/contexts/DistributorContext'
import { PreviewProviderWrapper } from '@/components/providers/PreviewProviderWrapper'
import { PreviewBannerClient } from '@/components/preview/PreviewBannerClient'
import { BrandingProviderWrapper } from '@/components/providers/BrandingProviderWrapper'
import DistributorLayoutClient from '@/components/DistributorLayoutClient'

export default function DistributorRootLayout({ children }: { children: ReactNode }) {
  return (
    <BrandingProviderWrapper>
      <PreviewProviderWrapper>
        <DistributorProvider>
          <PreviewBannerClient />
          <DistributorLayoutClient>
            {children}
          </DistributorLayoutClient>
        </DistributorProvider>
      </PreviewProviderWrapper>
    </BrandingProviderWrapper>
  )
}
