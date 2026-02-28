'use client'

import { useState, useEffect, useMemo } from 'react'

// Types for localization settings
export interface Currency {
  code: string
  symbol: string
  name: string
  enabled: boolean
  isDefault: boolean
}

export interface Language {
  code: string
  name: string
  enabled: boolean
  isDefault: boolean
}

export interface LocalizationSettings {
  languages: Language[]
  currencies: Currency[]
  dateFormat: string
  timeFormat: '12h' | '24h'
  timezone: string
  numberFormat: string
  decimalSeparator: '.' | ','
  thousandsSeparator: ',' | '.' | ' '
  defaultCountry: string
  weightUnit: 'kg' | 'lb'
  dimensionUnit: 'cm' | 'in'
}

const STORAGE_KEY = 'orderbridge_localization_settings'

// Default settings
const DEFAULT_CURRENCIES: Currency[] = [
  { code: 'EUR', symbol: '€', name: 'Euro', enabled: true, isDefault: true },
  { code: 'USD', symbol: '$', name: 'US Dollar', enabled: true, isDefault: false },
  { code: 'GBP', symbol: '£', name: 'British Pound', enabled: false, isDefault: false },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', enabled: false, isDefault: false },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', enabled: false, isDefault: false },
  { code: 'RMB', symbol: '¥', name: 'Chinese Yuan (RMB)', enabled: false, isDefault: false },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', enabled: false, isDefault: false },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won', enabled: false, isDefault: false },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham', enabled: false, isDefault: false },
  { code: 'SAR', symbol: 'SAR', name: 'Saudi Riyal', enabled: false, isDefault: false },
  { code: 'QAR', symbol: 'QAR', name: 'Qatari Riyal', enabled: false, isDefault: false },
  { code: 'KWD', symbol: 'KWD', name: 'Kuwaiti Dinar', enabled: false, isDefault: false },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', enabled: false, isDefault: false },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', enabled: false, isDefault: false },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', enabled: false, isDefault: false },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', enabled: false, isDefault: false },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar', enabled: false, isDefault: false },
  { code: 'TWD', symbol: 'NT$', name: 'Taiwan Dollar', enabled: false, isDefault: false },
  { code: 'THB', symbol: '฿', name: 'Thai Baht', enabled: false, isDefault: false },
  { code: 'VND', symbol: '₫', name: 'Vietnamese Dong', enabled: false, isDefault: false },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', enabled: false, isDefault: false },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', enabled: false, isDefault: false },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso', enabled: false, isDefault: false },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', enabled: false, isDefault: false },
  { code: 'PKR', symbol: 'Rs', name: 'Pakistani Rupee', enabled: false, isDefault: false },
  { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka', enabled: false, isDefault: false },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira', enabled: false, isDefault: false },
  { code: 'RUB', symbol: '₽', name: 'Russian Ruble', enabled: false, isDefault: false },
  { code: 'PLN', symbol: 'zł', name: 'Polish Zloty', enabled: false, isDefault: false },
  { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna', enabled: false, isDefault: false },
  { code: 'HUF', symbol: 'Ft', name: 'Hungarian Forint', enabled: false, isDefault: false },
  { code: 'RON', symbol: 'lei', name: 'Romanian Leu', enabled: false, isDefault: false },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', enabled: false, isDefault: false },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone', enabled: false, isDefault: false },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone', enabled: false, isDefault: false },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', enabled: false, isDefault: false },
  { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso', enabled: false, isDefault: false },
  { code: 'ARS', symbol: 'AR$', name: 'Argentine Peso', enabled: false, isDefault: false },
  { code: 'CLP', symbol: 'CLP$', name: 'Chilean Peso', enabled: false, isDefault: false },
  { code: 'COP', symbol: 'COL$', name: 'Colombian Peso', enabled: false, isDefault: false },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand', enabled: false, isDefault: false },
  { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound', enabled: false, isDefault: false },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', enabled: false, isDefault: false },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', enabled: false, isDefault: false },
  { code: 'MAD', symbol: 'MAD', name: 'Moroccan Dirham', enabled: false, isDefault: false },
  { code: 'ILS', symbol: '₪', name: 'Israeli Shekel', enabled: false, isDefault: false },
]

const DEFAULT_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', enabled: true, isDefault: true },
  { code: 'fr', name: 'French', enabled: true, isDefault: false },
  { code: 'de', name: 'German', enabled: false, isDefault: false },
  { code: 'es', name: 'Spanish', enabled: false, isDefault: false },
  { code: 'it', name: 'Italian', enabled: false, isDefault: false },
  { code: 'pt', name: 'Portuguese', enabled: false, isDefault: false },
  { code: 'nl', name: 'Dutch', enabled: false, isDefault: false },
  { code: 'pl', name: 'Polish', enabled: false, isDefault: false },
  { code: 'ru', name: 'Russian', enabled: false, isDefault: false },
  { code: 'zh', name: 'Chinese', enabled: false, isDefault: false },
  { code: 'ja', name: 'Japanese', enabled: false, isDefault: false },
  { code: 'ko', name: 'Korean', enabled: false, isDefault: false },
  { code: 'ar', name: 'Arabic', enabled: false, isDefault: false },
  { code: 'hi', name: 'Hindi', enabled: false, isDefault: false },
  { code: 'tr', name: 'Turkish', enabled: false, isDefault: false },
  { code: 'th', name: 'Thai', enabled: false, isDefault: false },
  { code: 'vi', name: 'Vietnamese', enabled: false, isDefault: false },
  { code: 'id', name: 'Indonesian', enabled: false, isDefault: false },
  { code: 'ms', name: 'Malay', enabled: false, isDefault: false },
  { code: 'he', name: 'Hebrew', enabled: false, isDefault: false },
]

const DEFAULT_SETTINGS: LocalizationSettings = {
  languages: DEFAULT_LANGUAGES,
  currencies: DEFAULT_CURRENCIES,
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '24h',
  timezone: 'Europe/Paris',
  numberFormat: '1 234,56',
  decimalSeparator: ',',
  thousandsSeparator: ' ',
  defaultCountry: 'FR',
  weightUnit: 'kg',
  dimensionUnit: 'cm'
}

// Currency symbols mapping
export const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
  CHF: 'CHF',
  CNY: '¥',
  RMB: '¥',
  JPY: '¥',
  KRW: '₩',
  AED: 'AED',
  SAR: 'SAR',
  QAR: 'QAR',
  KWD: 'KWD',
  AUD: 'A$',
  CAD: 'C$',
  NZD: 'NZ$',
  SGD: 'S$',
  HKD: 'HK$',
  TWD: 'NT$',
  THB: '฿',
  VND: '₫',
  IDR: 'Rp',
  MYR: 'RM',
  PHP: '₱',
  INR: '₹',
  PKR: 'Rs',
  BDT: '৳',
  TRY: '₺',
  RUB: '₽',
  PLN: 'zł',
  CZK: 'Kč',
  HUF: 'Ft',
  RON: 'lei',
  SEK: 'kr',
  NOK: 'kr',
  DKK: 'kr',
  BRL: 'R$',
  MXN: 'MX$',
  ARS: 'AR$',
  CLP: 'CLP$',
  COP: 'COL$',
  ZAR: 'R',
  EGP: 'E£',
  NGN: '₦',
  KES: 'KSh',
  MAD: 'MAD',
  ILS: '₪',
}

/**
 * Merge stored currencies/languages with defaults to add any new options
 */
function mergeWithDefaults(stored: LocalizationSettings): LocalizationSettings {
  const result = { ...DEFAULT_SETTINGS, ...stored }
  
  // Merge currencies - keep user's enabled/default state, add new ones
  const storedCurrencyCodes = new Set((stored.currencies || []).map(c => c.code))
  const mergedCurrencies = [
    ...(stored.currencies || []),
    ...DEFAULT_CURRENCIES.filter(c => !storedCurrencyCodes.has(c.code))
  ]
  result.currencies = mergedCurrencies
  
  // Merge languages - keep user's enabled/default state, add new ones
  const storedLanguageCodes = new Set((stored.languages || []).map(l => l.code))
  const mergedLanguages = [
    ...(stored.languages || []),
    ...DEFAULT_LANGUAGES.filter(l => !storedLanguageCodes.has(l.code))
  ]
  result.languages = mergedLanguages
  
  return result
}

/**
 * Hook to get localization settings from admin configuration
 * Should be used across the entire platform for consistent currency, date, and number formatting
 */
export function useLocalization() {
  const [settings, setSettings] = useState<LocalizationSettings>(DEFAULT_SETTINGS)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        const merged = mergeWithDefaults(parsed)
        setSettings(merged)
        // Save merged settings back to localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
      }
    } catch (error) {
      console.error('Failed to load localization settings:', error)
    }
    setIsLoaded(true)
  }, [])

  // Get the default currency
  const defaultCurrency = useMemo(() => {
    const defaultCurr = settings.currencies.find(c => c.isDefault)
    return defaultCurr || settings.currencies[0] || DEFAULT_CURRENCIES[0]
  }, [settings.currencies])

  // Get enabled currencies
  const enabledCurrencies = useMemo(() => {
    return settings.currencies.filter(c => c.enabled)
  }, [settings.currencies])

  // Get the default language
  const defaultLanguage = useMemo(() => {
    const defaultLang = settings.languages.find(l => l.isDefault)
    return defaultLang || settings.languages[0] || DEFAULT_LANGUAGES[0]
  }, [settings.languages])

  // Get enabled languages
  const enabledLanguages = useMemo(() => {
    return settings.languages.filter(l => l.enabled)
  }, [settings.languages])

  // Format a number according to settings
  const formatNumber = (value: number, decimals: number = 2): string => {
    const parts = value.toFixed(decimals).split('.')
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, settings.thousandsSeparator)
    if (decimals === 0) return integerPart
    return `${integerPart}${settings.decimalSeparator}${parts[1]}`
  }

  // Format a price with currency symbol
  const formatPrice = (value: number, currencyCode?: string): string => {
    const code = currencyCode || defaultCurrency.code
    const symbol = CURRENCY_SYMBOLS[code] || code
    const formatted = formatNumber(value)
    
    // Some currencies place symbol after the number
    if (['EUR'].includes(code) && settings.defaultCountry !== 'US') {
      return `${formatted} ${symbol}`
    }
    return `${symbol}${formatted}`
  }

  // Get currency symbol
  const getCurrencySymbol = (currencyCode?: string): string => {
    const code = currencyCode || defaultCurrency.code
    return CURRENCY_SYMBOLS[code] || code
  }

  // Format date according to settings
  const formatDate = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date
    const day = d.getDate().toString().padStart(2, '0')
    const month = (d.getMonth() + 1).toString().padStart(2, '0')
    const year = d.getFullYear()

    switch (settings.dateFormat) {
      case 'MM/DD/YYYY':
        return `${month}/${day}/${year}`
      case 'YYYY-MM-DD':
        return `${year}-${month}-${day}`
      case 'DD.MM.YYYY':
        return `${day}.${month}.${year}`
      case 'DD/MM/YYYY':
      default:
        return `${day}/${month}/${year}`
    }
  }

  // Format time according to settings
  const formatTime = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date
    const hours = d.getHours()
    const minutes = d.getMinutes().toString().padStart(2, '0')

    if (settings.timeFormat === '12h') {
      const ampm = hours >= 12 ? 'PM' : 'AM'
      const hour12 = hours % 12 || 12
      return `${hour12}:${minutes} ${ampm}`
    }
    return `${hours.toString().padStart(2, '0')}:${minutes}`
  }

  return {
    settings,
    isLoaded,
    defaultCurrency,
    enabledCurrencies,
    defaultLanguage,
    enabledLanguages,
    formatNumber,
    formatPrice,
    formatDate,
    formatTime,
    getCurrencySymbol,
    currencyCode: defaultCurrency.code,
    currencySymbol: defaultCurrency.symbol,
  }
}

/**
 * Get localization settings synchronously (for non-React contexts)
 * Note: This reads directly from localStorage, use with caution
 */
export function getLocalizationSettings(): LocalizationSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) }
    }
  } catch {
    // Ignore errors
  }
  return DEFAULT_SETTINGS
}

/**
 * Get default currency synchronously
 */
export function getDefaultCurrency(): Currency {
  const settings = getLocalizationSettings()
  return settings.currencies.find(c => c.isDefault) || DEFAULT_CURRENCIES[0]
}

/**
 * Get currency symbol synchronously
 */
export function getDefaultCurrencySymbol(): string {
  const currency = getDefaultCurrency()
  return CURRENCY_SYMBOLS[currency.code] || currency.symbol
}
