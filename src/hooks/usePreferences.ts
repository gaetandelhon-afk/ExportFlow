'use client'

import { useState, useEffect } from 'react'
import { formatNumber } from '@/lib/utils'

// Taux de change approximatifs (à remplacer par une API plus tard)
const EXCHANGE_RATES: Record<string, Record<string, number>> = {
  RMB: {
    EUR: 0.13,
    USD: 0.14,
    GBP: 0.11,
    AUD: 0.21,
    CAD: 0.19,
    BRL: 0.70,
    JPY: 21.0,
    KRW: 185.0,
    SGD: 0.19,
    CHF: 0.12,
  },
  EUR: {
    RMB: 7.8,
    USD: 1.08,
    GBP: 0.85,
    AUD: 1.65,
    CAD: 1.47,
    BRL: 5.40,
    JPY: 162.0,
    KRW: 1420.0,
    SGD: 1.45,
    CHF: 0.94,
  },
  USD: {
    RMB: 7.2,
    EUR: 0.92,
    GBP: 0.79,
    AUD: 1.53,
    CAD: 1.36,
    BRL: 5.0,
    JPY: 150.0,
    KRW: 1320.0,
    SGD: 1.34,
    CHF: 0.87,
  },
}

export interface UserPreferences {
  showIndicativePrice: boolean
  indicativeCurrencies: string[]
}

export const CURRENCY_SYMBOLS: Record<string, string> = {
  RMB: '¥',
  EUR: '€',
  USD: '$',
  GBP: '£',
  AUD: 'A$',
  CAD: 'C$',
  BRL: 'R$',
  JPY: '¥',
  KRW: '₩',
  SGD: 'S$',
  CHF: 'CHF',
}

export function usePreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>({
    showIndicativePrice: false,
    indicativeCurrencies: [],
  })
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('distributor_preferences')
    if (saved) {
      setPreferences(JSON.parse(saved))
    }
    setIsLoaded(true)
  }, [])

  return { preferences, isLoaded }
}

export function convertPrice(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): number {
  if (fromCurrency === toCurrency) return amount
  
  const rates = EXCHANGE_RATES[fromCurrency]
  if (!rates || !rates[toCurrency]) {
    // Fallback: essayer via USD
    const toUsd = EXCHANGE_RATES[fromCurrency]?.USD || 1
    const fromUsd = EXCHANGE_RATES.USD?.[toCurrency] || 1
    return amount * toUsd * fromUsd
  }
  
  return amount * rates[toCurrency]
}

export function formatIndicativePrice(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): string {
  const converted = convertPrice(amount, fromCurrency, toCurrency)
  const symbol = CURRENCY_SYMBOLS[toCurrency] || ''
  
  // Formater selon la devise
  if (['JPY', 'KRW'].includes(toCurrency)) {
    return `${symbol}${formatNumber(Math.round(converted))}`
  }
  
  return `${symbol}${converted.toFixed(2)}`
}