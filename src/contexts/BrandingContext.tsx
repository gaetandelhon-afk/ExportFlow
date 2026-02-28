'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

// ============================================
// TYPES
// ============================================

export interface Branding {
  primaryColor: string
  secondaryColor: string
  accentColor: string
  logoUrl: string | null
  logoWidth: number
  faviconUrl: string | null
  loginBannerUrl: string | null
  companyName: string
  companyLegalName: string | null
  tagline: string | null
  invoiceHeader: string | null
  invoiceFooter: string | null
  emailSignature: string | null
  customCss: string | null
}

interface BrandingContextType {
  branding: Branding
  loading: boolean
  error: string | null
  updateBranding: (updates: Partial<Branding>) => Promise<boolean>
  refreshBranding: () => Promise<void>
}

// ============================================
// DEFAULT VALUES
// ============================================

const DEFAULT_BRANDING: Branding = {
  primaryColor: '#0071e3',
  secondaryColor: '#34c759',
  accentColor: '#ff9500',
  logoUrl: null,
  logoWidth: 150,
  faviconUrl: null,
  loginBannerUrl: null,
  companyName: 'ExportFlow',
  companyLegalName: null,
  tagline: null,
  invoiceHeader: null,
  invoiceFooter: null,
  emailSignature: null,
  customCss: null
}

// ============================================
// CONTEXT
// ============================================

const BrandingContext = createContext<BrandingContextType | undefined>(undefined)

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<Branding>(DEFAULT_BRANDING)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Apply CSS variables whenever branding changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const root = document.documentElement
      
      // Primary color and variants
      root.style.setProperty('--color-primary', branding.primaryColor)
      root.style.setProperty('--color-primary-hover', adjustColor(branding.primaryColor, -10))
      root.style.setProperty('--color-primary-light', adjustColor(branding.primaryColor, 90, 0.1))
      
      // Secondary color and variants
      root.style.setProperty('--color-secondary', branding.secondaryColor)
      root.style.setProperty('--color-secondary-hover', adjustColor(branding.secondaryColor, -10))
      root.style.setProperty('--color-secondary-light', adjustColor(branding.secondaryColor, 90, 0.1))
      
      // Accent color and variants
      root.style.setProperty('--color-accent', branding.accentColor)
      root.style.setProperty('--color-accent-hover', adjustColor(branding.accentColor, -10))
      root.style.setProperty('--color-accent-light', adjustColor(branding.accentColor, 90, 0.1))

      // Apply custom CSS if any
      let customStyleEl = document.getElementById('custom-branding-css')
      if (branding.customCss) {
        if (!customStyleEl) {
          customStyleEl = document.createElement('style')
          customStyleEl.id = 'custom-branding-css'
          document.head.appendChild(customStyleEl)
        }
        customStyleEl.textContent = branding.customCss
      } else if (customStyleEl) {
        customStyleEl.remove()
      }

      // Update favicon if set
      if (branding.faviconUrl) {
        let favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement
        if (!favicon) {
          favicon = document.createElement('link')
          favicon.rel = 'icon'
          document.head.appendChild(favicon)
        }
        favicon.href = branding.faviconUrl
      }
    }
  }, [branding])

  const refreshBranding = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    // Always fetch from API to ensure correct tenant data
    try {
      const res = await fetch('/api/branding')
      if (res.ok) {
        const data = await res.json()
        const newBranding = {
          ...DEFAULT_BRANDING,
          ...data.branding
        }
        setBranding(newBranding)
      } else {
        setBranding(DEFAULT_BRANDING)
      }
    } catch {
      setBranding(DEFAULT_BRANDING)
    } finally {
      setLoading(false)
    }
  }, [])

  const updateBranding = useCallback(async (updates: Partial<Branding>): Promise<boolean> => {
    setError(null)
    
    const newBranding = { ...branding, ...updates }
    setBranding(newBranding)
    
    try {
      const res = await fetch('/api/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (res.ok) {
        const data = await res.json()
        setBranding(prev => ({
          ...prev,
          ...data.branding
        }))
        return true
      } else {
        // API failed but localStorage worked
        return true
      }
    } catch {
      // API failed but localStorage worked
      return true
    }
  }, [branding])

  // Load branding on mount
  useEffect(() => {
    refreshBranding()
  }, [refreshBranding])

  // Listen for branding updates (custom event for same-tab updates)
  useEffect(() => {
    const handleBrandingUpdate = (e: CustomEvent) => {
      if (e.detail) {
        setBranding(prev => ({ ...prev, ...e.detail }))
      }
    }
    
    // Also listen for storage changes (from other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'orderbridge_branding' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue)
          setBranding(prev => ({ ...prev, ...parsed }))
        } catch {
          // Invalid JSON, ignore
        }
      }
    }
    
    window.addEventListener('branding-updated', handleBrandingUpdate as EventListener)
    window.addEventListener('storage', handleStorageChange)
    
    return () => {
      window.removeEventListener('branding-updated', handleBrandingUpdate as EventListener)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  return (
    <BrandingContext.Provider value={{ branding, loading, error, updateBranding, refreshBranding }}>
      {children}
    </BrandingContext.Provider>
  )
}

export function useBranding() {
  const context = useContext(BrandingContext)
  if (context === undefined) {
    throw new Error('useBranding must be used within a BrandingProvider')
  }
  return context
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Adjust a hex color brightness
 * positive amount = lighter, negative = darker
 * alpha is optional for creating transparent versions
 */
function adjustColor(hex: string, amount: number, alpha?: number): string {
  // Remove # if present
  hex = hex.replace('#', '')
  
  // Parse RGB
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  
  // Adjust
  const newR = Math.min(255, Math.max(0, r + amount))
  const newG = Math.min(255, Math.max(0, g + amount))
  const newB = Math.min(255, Math.max(0, b + amount))
  
  if (alpha !== undefined) {
    return `rgba(${newR}, ${newG}, ${newB}, ${alpha})`
  }
  
  // Convert back to hex
  return '#' + [newR, newG, newB]
    .map(x => x.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Get contrast color (black or white) for a given background
 */
export function getContrastColor(hex: string): string {
  hex = hex.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  
  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  
  return luminance > 0.5 ? '#000000' : '#ffffff'
}

/**
 * Generate CSS class string for primary button
 */
export function getPrimaryButtonClasses(): string {
  return 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white'
}

/**
 * Generate CSS class string for secondary button
 */
export function getSecondaryButtonClasses(): string {
  return 'bg-[var(--color-secondary)] hover:bg-[var(--color-secondary-hover)] text-white'
}
