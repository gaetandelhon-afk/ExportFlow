'use client'

import { usePreview } from '@/contexts/PreviewContext'
import { ReactNode } from 'react'

interface PreviewPageWrapperProps {
  children: ReactNode
  className?: string
  style?: React.CSSProperties
}

export function PreviewPageWrapper({ children, className = '', style }: PreviewPageWrapperProps) {
  const { isPreviewMode } = usePreview()
  
  return (
    <div 
      className={`min-h-screen ${isPreviewMode ? 'pt-12' : ''} ${className}`}
      style={style}
    >
      {children}
    </div>
  )
}
