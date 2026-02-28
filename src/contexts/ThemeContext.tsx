'use client'

import { createContext, useContext, useEffect, useState, useSyncExternalStore, ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { locales } from '@/i18n/locales'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
}

const DARK_STYLE_ID = 'dark-mode-styles'

const DISTRIBUTOR_PATHS = [
  '/catalog',
  '/cart',
  '/order',
  '/my-orders',
  '/my-quotes',
  '/my-packing-lists',
  '/my-invoices',
  '/checkout',
  '/account',
  '/notifications',
]

function isDistributorContext(): boolean {
  if (typeof window === 'undefined') return false
  const pathname = window.location.pathname
  return DISTRIBUTOR_PATHS.some(path => pathname.startsWith(path))
}

function getStorageKey(): string {
  if (typeof window === 'undefined') return 'exportflow_theme'
  return isDistributorContext() ? 'exportflow_theme_client' : 'exportflow_theme_admin'
}

function isMarketingPath(pathname: string): boolean {
  return locales.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`))
}

const THEME_CHANGE_EVENT = 'exportflow-theme-change'

function subscribeTheme(callback: () => void) {
  if (typeof window === 'undefined') return () => {}
  const handler = () => callback()
  window.addEventListener(THEME_CHANGE_EVENT, handler)
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, handler)
    window.removeEventListener('storage', handler)
  }
}

function getThemeSnapshot(): Theme {
  if (typeof window === 'undefined') return 'system'
  const storageKey = getStorageKey()
  const stored = localStorage.getItem(storageKey) as Theme | null
  return stored && ['light', 'dark', 'system'].includes(stored) ? stored : 'system'
}

const DARK_MODE_CSS = `
  /* ========== BASE ========== */
  html, body { 
    background-color: #000000 !important; 
    color: #f5f5f7 !important; 
  }
  
  /* ========== BACKGROUNDS ========== */
  .bg-white { background-color: #1c1c1e !important; }
  [class*="bg-[#f5f5f7]"] { background-color: #2c2c2e !important; }
  [class*="bg-[#fafafa]"] { background-color: #2c2c2e !important; }
  [class*="bg-[#e8e8ed]"] { background-color: #3a3a3c !important; }
  [class*="bg-gray-50"] { background-color: #2c2c2e !important; }
  [class*="bg-gray-100"] { background-color: #2c2c2e !important; }
  
  /* ========== TEXT COLORS ========== */
  [class*="text-[#1d1d1f]"] { color: #f5f5f7 !important; }
  [class*="text-[#86868b]"] { color: #98989d !important; }
  .text-black { color: #f5f5f7 !important; }
  .text-gray-900 { color: #f5f5f7 !important; }
  .text-gray-800 { color: #e5e5e7 !important; }
  .text-gray-700 { color: #d1d1d6 !important; }
  .text-gray-600 { color: #98989d !important; }
  .text-gray-500 { color: #8e8e93 !important; }
  
  /* ========== BORDERS ========== */
  [class*="border-[#d2d2d7]"] { border-color: #38383a !important; }
  [class*="border-gray"] { border-color: #38383a !important; }
  .border { border-color: #38383a !important; }
  
  /* ========== INPUTS & FORMS ========== */
  input, select, textarea { 
    background-color: #2c2c2e !important; 
    color: #f5f5f7 !important; 
    border-color: #38383a !important;
  }
  input::placeholder, textarea::placeholder { color: #636366 !important; }
  
  /* ========== CARDS - White background cards ========== */
  .bg-white.rounded-2xl,
  .bg-white.rounded-xl,
  .bg-white.rounded-lg,
  div.bg-white[class*="border"],
  div.bg-white[class*="rounded"] {
    background-color: #1c1c1e !important;
    border-color: #38383a !important;
  }
  
  /* ========== NAVIGATION ========== */
  aside, nav, header { 
    background-color: #1c1c1e !important; 
    border-color: #38383a !important;
  }
  
  /* ========== TABLES ========== */
  table { background-color: #1c1c1e !important; }
  th { background-color: #2c2c2e !important; color: #98989d !important; }
  td { border-color: #38383a !important; }
  tr:hover td { background-color: #2c2c2e !important; }
  
  /* ========== MODALS & OVERLAYS ========== */
  [class*="bg-black/"] { background-color: rgba(0, 0, 0, 0.8) !important; }
  .fixed.inset-0.bg-black { background-color: rgba(0, 0, 0, 0.8) !important; }
  
  /* ========== HOVERS ========== */
  [class*="hover:bg-[#f5f5f7]"]:hover { background-color: #2c2c2e !important; }
  [class*="hover:bg-[#e8e8ed]"]:hover { background-color: #3a3a3c !important; }
  [class*="hover:bg-gray"]:hover { background-color: #2c2c2e !important; }
  
  /* ========== GRADIENTS ========== */
  [class*="bg-gradient-to-br"][class*="from-[#f5f5f7]"],
  [class*="bg-gradient"][class*="to-white"],
  [class*="from-[#f5f5f7]"][class*="to-white"],
  a[class*="bg-gradient-to-br"],
  .bg-gradient-to-br {
    background: linear-gradient(to bottom right, #2c2c2e, #1c1c1e) !important;
  }
  
  /* Import card specific fix */
  a[href="/import"][class*="rounded-xl"] {
    background: linear-gradient(to bottom right, #2c2c2e, #1c1c1e) !important;
    border-color: #38383a !important;
  }
  
  /* ========== TRANSPORT METHOD CARDS ========== */
  /* Fix for shipments page transport method selector */
  button[class*="rounded-xl"][class*="border"][class*="p-4"],
  button[class*="rounded-xl"][class*="border"][class*="p-3"],
  div[class*="rounded-xl"][class*="border"][class*="p-4"],
  div[class*="rounded-xl"][class*="border"][class*="p-3"] {
    background-color: #1c1c1e !important;
    border-color: #38383a !important;
  }
  
  /* ========== STATISTICS CARDS ========== */
  div[class*="rounded-2xl"][class*="p-6"],
  div[class*="rounded-xl"][class*="p-4"],
  div[class*="rounded-xl"][class*="p-5"],
  div[class*="rounded-lg"][class*="p-4"] {
    background-color: #1c1c1e !important;
  }
  
  /* ========== STATUS BADGES - Keep colorful backgrounds ========== */
  [class*="bg-[#0071e3]"] { /* Blue - keep */ }
  [class*="bg-[#34c759]"] { /* Green - keep */ }
  [class*="bg-[#ff9500]"] { /* Orange - keep */ }
  [class*="bg-[#ff3b30]"] { /* Red - keep */ }
  [class*="bg-[#5856d6]"] { /* Purple - keep */ }
  
  /* ========== DROPDOWN MENUS ========== */
  [class*="absolute"][class*="bg-white"][class*="shadow"],
  [class*="absolute"][class*="bg-white"][class*="rounded"],
  div.absolute.bg-white,
  .bg-white[class*="shadow-lg"],
  .bg-white[class*="shadow-xl"] {
    background-color: #2c2c2e !important;
    border-color: #38383a !important;
  }
  
  /* Dropdown menu items */
  [class*="hover:bg-[#f5f5f7]"]:hover {
    background-color: #3a3a3c !important;
  }
  
  /* ========== ICONS - Text color should adapt ========== */
  svg { color: inherit; }

  /* ========== QUANTITY STEPPER ========== */
  .qty-stepper {
    background-color: #3a3a3c !important;
    border-color: #48484a !important;
  }
  .qty-stepper button,
  .qty-stepper span,
  .qty-stepper input {
    color: #f5f5f7 !important;
    background-color: transparent !important;
  }
  .qty-stepper svg {
    color: #f5f5f7 !important;
  }
  .qty-stepper button:hover {
    background-color: #48484a !important;
  }
  .qty-stepper button:disabled {
    opacity: 0.35 !important;
  }
  
  /* ========== SPECIFIC FIXES ========== */
  /* Statistics numbers - any large text */
  p[class*="text-[24px]"], 
  p[class*="text-[28px]"], 
  p[class*="text-[32px]"],
  p[class*="text-[18px]"],
  p[class*="text-[17px]"],
  p[class*="text-[15px]"],
  p[class*="text-[14px]"],
  p[class*="text-[13px]"],
  p[class*="text-[12px]"],
  span[class*="text-[24px]"],
  span[class*="text-[18px]"],
  span[class*="text-[14px]"],
  span[class*="text-[13px]"],
  span[class*="text-[12px]"],
  span[class*="text-[11px]"],
  span[class*="text-[10px]"],
  h1, h2, h3, h4, h5, h6 {
    color: #f5f5f7 !important;
  }
  
  /* Preserve colored text */
  [class*="text-[#0071e3]"] { color: #0a84ff !important; }
  [class*="text-[#34c759]"] { color: #30d158 !important; }
  [class*="text-[#ff9500]"] { color: #ff9f0a !important; }
  [class*="text-[#ff3b30]"] { color: #ff453a !important; }
  [class*="text-[#5856d6]"] { color: #5e5ce6 !important; }
  [class*="text-white"] { color: white !important; }
  
  /* Secondary text */
  [class*="text-[#86868b]"] { color: #98989d !important; }
  
  /* Small cards inside larger containers */
  .bg-\\[\\#f5f5f7\\].rounded-xl,
  .bg-\\[\\#f5f5f7\\].rounded-lg,
  div.bg-\\[\\#f5f5f7\\],
  [class*="bg-[#f5f5f7]"] {
    background-color: #2c2c2e !important;
  }
  
  /* Gantt chart and similar */
  [class*="bg-[#fafafa]"] { background-color: #2c2c2e !important; }
  
  /* All white backgrounds on common elements */
  div.bg-white,
  section.bg-white,
  article.bg-white,
  main.bg-white,
  [class*="flex"][class*="bg-white"],
  [class*="grid"][class*="bg-white"] {
    background-color: #1c1c1e !important;
  }
  
  /* Links - make them brighter */
  a[class*="text-[#0071e3]"]:hover { color: #409cff !important; }
  
  /* Button hover states */
  button:hover { background-color: inherit; }
  button[class*="hover:bg-[#f5f5f7]"]:hover { background-color: #2c2c2e !important; }
  
  /* SVG icons inherit color properly */
  svg[class*="text-[#86868b]"] { color: #98989d !important; }
  svg[class*="text-[#1d1d1f]"] { color: #f5f5f7 !important; }
  
  /* Calendar/date header cells */
  [class*="border-r"][class*="border-[#d2d2d7]"] { border-color: #38383a !important; }
  
  /* Weekend backgrounds in Gantt */
  [class*="bg-[#f5f5f7]/50"] { background-color: rgba(44, 44, 46, 0.5) !important; }
  [class*="bg-[#0071e3]/5"] { background-color: rgba(10, 132, 255, 0.1) !important; }
`

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore<Theme>(subscribeTheme, getThemeSnapshot, () => 'system')
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')
  const pathname = usePathname()
  const marketing = isMarketingPath(pathname)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const updateResolvedTheme = () => {
      if (theme === 'system') {
        setResolvedTheme(mediaQuery.matches ? 'dark' : 'light')
      } else {
        setResolvedTheme(theme)
      }
    }

    updateResolvedTheme()
    mediaQuery.addEventListener('change', updateResolvedTheme)

    return () => mediaQuery.removeEventListener('change', updateResolvedTheme)
  }, [theme])

  useEffect(() => {
    const root = document.documentElement
    
    // Remove existing dark style
    const existingStyle = document.getElementById(DARK_STYLE_ID)
    if (existingStyle) {
      existingStyle.remove()
    }

    // Marketing UI uses its own theming; avoid injecting dashboard dark CSS there.
    if (marketing) {
      return
    }
    
    if (resolvedTheme === 'dark') {
      root.classList.add('dark')
      root.style.colorScheme = 'dark'
      
      // Inject dark mode styles
      const style = document.createElement('style')
      style.id = DARK_STYLE_ID
      style.textContent = DARK_MODE_CSS
      document.head.appendChild(style)
      
      // Fix inline styles for dark mode
      const fixInlineStyles = () => {
        // Fix white backgrounds
        document.querySelectorAll('[style*="background"]').forEach((el) => {
          const htmlEl = el as HTMLElement
          const bg = htmlEl.style.backgroundColor
          if (bg === 'white' || bg === 'rgb(255, 255, 255)' || bg === '#ffffff' || bg === '#fff') {
            htmlEl.style.backgroundColor = '#1c1c1e'
          }
          // Handle rgba white with opacity
          if (bg.startsWith('rgba(255, 255, 255')) {
            const opacity = bg.match(/rgba\(255,\s*255,\s*255,\s*([\d.]+)\)/)
            if (opacity) {
              htmlEl.style.backgroundColor = `rgba(28, 28, 30, ${opacity[1]})`
            }
          }
        })
        
        // Fix dark text colors
        document.querySelectorAll('[style*="color"]').forEach((el) => {
          const htmlEl = el as HTMLElement
          const color = htmlEl.style.color
          if (color === '#1d1d1f' || color === 'rgb(29, 29, 31)') {
            htmlEl.style.color = '#f5f5f7'
          }
        })
      }
      
      fixInlineStyles()
      
      // Watch for DOM changes and fix new elements
      const observer = new MutationObserver(fixInlineStyles)
      observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] })
      
      return () => observer.disconnect()
    } else {
      root.classList.remove('dark')
      root.style.colorScheme = 'light'
    }
  }, [marketing, resolvedTheme])

  const setTheme = (newTheme: Theme) => {
    const storageKey = getStorageKey()
    localStorage.setItem(storageKey, newTheme)
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT))
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
