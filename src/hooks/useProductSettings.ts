'use client'

import { useState, useEffect } from 'react'

export type ViewMode = 'list' | 'grid-small' | 'grid-medium' | 'grid-large'

export interface ProductSettings {
  defaultView: ViewMode
  productsPerPage: number
  showOutOfStock: boolean
  showPrices: boolean
}

const STORAGE_KEY = 'orderbridge_product_settings'

const DEFAULT_SETTINGS: ProductSettings = {
  defaultView: 'grid-medium',
  productsPerPage: 24,
  showOutOfStock: true,
  showPrices: true,
}

export function useProductSettings() {
  const [settings, setSettings] = useState<ProductSettings>(DEFAULT_SETTINGS)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setSettings({
          ...DEFAULT_SETTINGS,
          ...parsed,
        })
      }
    } catch (error) {
      console.error('Failed to load product settings:', error)
    }
    setIsLoaded(true)
  }, [])

  return { settings, isLoaded }
}

export function getDefaultViewMode(): ViewMode {
  if (typeof window === 'undefined') return 'grid-medium'
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return parsed.defaultView || 'grid-medium'
    }
  } catch {
    // ignore
  }
  return 'grid-medium'
}
