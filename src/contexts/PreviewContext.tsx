'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'

interface PreviewCustomer {
  id: string
  name: string
  email: string
  currency?: string
  priceType?: string
  paymentTerms?: string
}

interface PreviewContextType {
  isPreviewMode: boolean
  previewCustomer: PreviewCustomer | null
  startPreview: (customer: PreviewCustomer) => void
  endPreview: () => void
  isLoading: boolean
}

const PreviewContext = createContext<PreviewContextType | undefined>(undefined)

export function PreviewProvider({ children }: { children: ReactNode }) {
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [previewCustomer, setPreviewCustomer] = useState<PreviewCustomer | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  
  useEffect(() => {
    const stored = sessionStorage.getItem('previewMode')
    if (stored) {
      try {
        const data = JSON.parse(stored)
        setPreviewCustomer(data.customer)
        setIsPreviewMode(true)
      } catch {
        sessionStorage.removeItem('previewMode')
      }
    }
    setIsLoading(false)
  }, [])
  
  useEffect(() => {
    const inPreviewRoute = pathname?.startsWith('/preview')
    if (inPreviewRoute && !isPreviewMode && !isLoading) {
      if (!previewCustomer && pathname !== '/preview') {
        router.push('/preview')
      }
    }
  }, [pathname, isPreviewMode, previewCustomer, isLoading, router])
  
  const startPreview = (customer: PreviewCustomer) => {
    setPreviewCustomer(customer)
    setIsPreviewMode(true)
    sessionStorage.setItem('previewMode', JSON.stringify({ customer }))
    router.push('/catalog')
  }
  
  const endPreview = () => {
    setPreviewCustomer(null)
    setIsPreviewMode(false)
    sessionStorage.removeItem('previewMode')
    router.push('/dashboard')
  }
  
  return (
    <PreviewContext.Provider value={{
      isPreviewMode,
      previewCustomer,
      startPreview,
      endPreview,
      isLoading
    }}>
      {children}
    </PreviewContext.Provider>
  )
}

export function usePreview() {
  const context = useContext(PreviewContext)
  if (!context) {
    throw new Error('usePreview must be used within PreviewProvider')
  }
  return context
}
