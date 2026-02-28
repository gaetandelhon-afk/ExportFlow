'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Calendar, RefreshCw, AlertCircle } from 'lucide-react'
import { formatNumber } from '@/lib/utils'
import { useLocalization, CURRENCY_SYMBOLS } from '@/hooks/useLocalization'

interface DashboardRevenueProps {
  revenue: number  // Revenue in EUR (base currency from database)
  baseCurrency?: string  // The currency the revenue is stored in (default EUR)
}

const CURRENCIES: Record<string, { symbol: string; name: string }> = {
  EUR: { symbol: '€', name: 'Euro' },
  USD: { symbol: '$', name: 'US Dollar' },
  GBP: { symbol: '£', name: 'British Pound' },
  CHF: { symbol: 'CHF', name: 'Swiss Franc' },
  CNY: { symbol: '¥', name: 'Chinese Yuan' },
  RMB: { symbol: '¥', name: 'Chinese Yuan (RMB)' },
  AED: { symbol: 'AED', name: 'UAE Dirham' },
  JPY: { symbol: '¥', name: 'Japanese Yen' },
  HKD: { symbol: 'HK$', name: 'Hong Kong Dollar' },
}

// Cache for exchange rates (valid for 1 hour)
const CACHE_KEY = 'orderbridge_exchange_rates'
const CACHE_DURATION = 60 * 60 * 1000 // 1 hour in ms

interface ExchangeRateCache {
  rates: Record<string, number>
  timestamp: number
  base: string
}

async function fetchExchangeRates(baseCurrency: string): Promise<Record<string, number>> {
  // Check cache first
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) {
      const cacheData: ExchangeRateCache = JSON.parse(cached)
      const isValid = Date.now() - cacheData.timestamp < CACHE_DURATION
      if (isValid && cacheData.base === baseCurrency) {
        return cacheData.rates
      }
    }
  } catch {
    // Cache invalid, continue to fetch
  }

  // Fetch fresh rates from exchangerate-api (free tier)
  // Using EUR as base since that's typically what orders are stored in
  try {
    const response = await fetch(
      `https://api.exchangerate-api.com/v4/latest/${baseCurrency}`
    )
    
    if (!response.ok) {
      throw new Error('Failed to fetch exchange rates')
    }

    const data = await response.json()
    const rates = data.rates as Record<string, number>

    // Cache the rates
    const cacheData: ExchangeRateCache = {
      rates,
      timestamp: Date.now(),
      base: baseCurrency
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData))

    return rates
  } catch (error) {
    console.error('Failed to fetch exchange rates:', error)
    // Return fallback rates (approximate)
    return {
      EUR: 1,
      USD: 1.08,
      GBP: 0.86,
      CHF: 0.94,
      CNY: 7.85,
      AED: 3.97,
      JPY: 162.5,
      HKD: 8.45,
    }
  }
}

export default function DashboardRevenue({ revenue, baseCurrency = 'EUR' }: DashboardRevenueProps) {
  const { defaultCurrency, isLoaded } = useLocalization()
  const [currencySymbol, setCurrencySymbol] = useState('€')
  const [currencyCode, setCurrencyCode] = useState('EUR')
  const [convertedRevenue, setConvertedRevenue] = useState(revenue)
  const [exchangeRate, setExchangeRate] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    if (isLoaded) {
      loadCurrencyAndConvert()
    }
  }, [revenue, baseCurrency, isLoaded, defaultCurrency.code])

  const loadCurrencyAndConvert = async () => {
    setLoading(true)
    setError(false)

    try {
      // Get target currency from localization settings
      const targetCurrency = defaultCurrency.code

      setCurrencyCode(targetCurrency)
      setCurrencySymbol(CURRENCY_SYMBOLS[targetCurrency] || defaultCurrency.symbol || targetCurrency)

      // If same currency, no conversion needed
      if (targetCurrency === baseCurrency) {
        setConvertedRevenue(revenue)
        setExchangeRate(1)
        setLastUpdated(new Date())
        setLoading(false)
        return
      }

      // Fetch exchange rates and convert
      const rates = await fetchExchangeRates(baseCurrency)
      const rate = rates[targetCurrency]
      
      if (rate) {
        setConvertedRevenue(revenue * rate)
        setExchangeRate(rate)
        setLastUpdated(new Date())
      } else {
        throw new Error(`No rate found for ${targetCurrency}`)
      }
    } catch (err) {
      console.error('Currency conversion error:', err)
      setError(true)
      setConvertedRevenue(revenue) // Fallback to original value
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    // Clear cache and refetch
    localStorage.removeItem(CACHE_KEY)
    loadCurrencyAndConvert()
  }

  return (
    <div className="bg-gradient-to-br from-[#1d1d1f] to-[#3d3d3f] rounded-2xl p-6 mb-8 text-white">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-[#34c759]" />
            <span className="text-[13px] text-white/60">Monthly Revenue</span>
            <span className="text-[11px] text-white/40 px-1.5 py-0.5 bg-white/10 rounded">{currencyCode}</span>
            {exchangeRate && exchangeRate !== 1 && (
              <span className="text-[10px] text-white/30">
                (1 {baseCurrency} = {exchangeRate.toFixed(4)} {currencyCode})
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-2">
            {loading ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-white/60" />
                <span className="text-[24px] text-white/60">Loading...</span>
              </div>
            ) : (
              <p className="text-[32px] font-semibold">
                {currencySymbol}{formatNumber(Math.round(convertedRevenue * 100) / 100)}
              </p>
            )}
            {error && (
              <span className="text-[11px] text-[#ff9500] flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Rate unavailable
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-[13px] text-white/60 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
            {lastUpdated && currencyCode !== baseCurrency && (
              <button
                onClick={handleRefresh}
                className="text-[11px] text-white/40 hover:text-white/60 flex items-center gap-1 transition-colors"
                title="Refresh exchange rate"
              >
                <RefreshCw className="w-3 h-3" />
                Updated {lastUpdated.toLocaleTimeString()}
              </button>
            )}
          </div>
        </div>
        <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center">
          <TrendingUp className="w-8 h-8 text-[#34c759]" />
        </div>
      </div>
    </div>
  )
}
