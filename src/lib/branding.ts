// ============================================
// BRANDING UTILITIES
// Server-side and client-side helpers for branding
// ============================================

import { CompanyInfo } from '@/config/features'

export interface BrandingConfig {
  primaryColor: string
  secondaryColor: string
  accentColor: string
  logoUrl: string | null
  logoWidth: number
  companyName: string
  companyLegalName: string | null
  tagline: string | null
  invoiceHeader: string | null
  invoiceFooter: string | null
}

// Default branding values
export const DEFAULT_BRANDING: BrandingConfig = {
  primaryColor: '#0071e3',
  secondaryColor: '#34c759',
  accentColor: '#ff9500',
  logoUrl: null,
  logoWidth: 150,
  companyName: 'ExportFlow',
  companyLegalName: null,
  tagline: null,
  invoiceHeader: null,
  invoiceFooter: null
}

/**
 * Fetch branding from API (client-side)
 */
export async function fetchBranding(): Promise<BrandingConfig> {
  try {
    const res = await fetch('/api/branding')
    if (res.ok) {
      const data = await res.json()
      return {
        ...DEFAULT_BRANDING,
        ...data.branding
      }
    }
  } catch {
    console.error('Failed to fetch branding')
  }
  return DEFAULT_BRANDING
}

/**
 * Apply branding to company info for PDF generation
 */
export function applyBrandingToCompanyInfo(
  baseCompany: CompanyInfo,
  branding: BrandingConfig
): CompanyInfo {
  return {
    ...baseCompany,
    name: branding.companyName || baseCompany.name,
    legalName: branding.companyLegalName || baseCompany.legalName,
    logo: branding.logoUrl || baseCompany.logo
  }
}

/**
 * Convert hex color to RGB array
 */
export function hexToRgb(hex: string): [number, number, number] {
  hex = hex.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  return [r, g, b]
}

/**
 * Lighten a hex color
 */
export function lightenColor(hex: string, percent: number): string {
  const [r, g, b] = hexToRgb(hex)
  const amount = Math.round(255 * (percent / 100))
  const newR = Math.min(255, r + amount)
  const newG = Math.min(255, g + amount)
  const newB = Math.min(255, b + amount)
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`
}

/**
 * Get contrast text color (black or white) for a background
 */
export function getContrastColor(hex: string): string {
  const [r, g, b] = hexToRgb(hex)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? '#000000' : '#ffffff'
}
