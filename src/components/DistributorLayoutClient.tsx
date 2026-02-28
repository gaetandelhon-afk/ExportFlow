'use client'

import { ReactNode } from 'react'
import DistributorSidebar from '@/components/DistributorSidebar'
import { usePreview } from '@/contexts/PreviewContext'

interface DistributorLayoutClientProps {
  children: ReactNode
}

export default function DistributorLayoutClient({ children }: DistributorLayoutClientProps) {
  const { isPreviewMode } = usePreview()
  
  const previewOffset = isPreviewMode ? 48 : 0
  
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <DistributorSidebar />
      
      {/* Main Content */}
      <main 
        className="lg:pl-64 min-h-screen"
        style={{ paddingTop: `${previewOffset}px` }}
      >
        {/* Mobile header spacer - accounts for fixed mobile header */}
        <div className="lg:hidden" style={{ height: `${14 * 4}px` }} />
        
        <div className="p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
