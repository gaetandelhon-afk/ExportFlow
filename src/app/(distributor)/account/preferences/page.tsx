'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useDistributor, CURRENCY_SYMBOLS } from '@/contexts/DistributorContext'
import { COMPANY_CONFIG } from '@/config/features'
import { ChevronLeft, Check, Info, X } from 'lucide-react'

const CURRENCY_NAMES: Record<string, string> = {
  EUR: 'Euro',
  USD: 'US Dollar',
  GBP: 'British Pound',
  AUD: 'Australian Dollar',
  CAD: 'Canadian Dollar',
  BRL: 'Brazilian Real',
  JPY: 'Japanese Yen',
  KRW: 'Korean Won',
  SGD: 'Singapore Dollar',
  CHF: 'Swiss Franc',
  RMB: 'Chinese Yuan',
}

export default function PreferencesPage() {
  const { user } = useDistributor()
  
  const [showIndicativePrice, setShowIndicativePrice] = useState(false)
  const [selectedCurrencies, setSelectedCurrencies] = useState<string[]>([])
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const savedPrefs = localStorage.getItem('distributor_preferences')
    if (savedPrefs) {
      const prefs = JSON.parse(savedPrefs)
      setShowIndicativePrice(prefs.showIndicativePrice ?? false)
      setSelectedCurrencies(prefs.indicativeCurrencies ?? [])
    }
  }, [])

  // Available currencies - only exclude the display currency (what they already see)
  const availableCurrencies = COMPANY_CONFIG.indicativeCurrencies.filter(
    c => c !== user?.displayCurrency
  )

  const toggleCurrency = (currency: string) => {
    setSelectedCurrencies(prev => {
      if (prev.includes(currency)) {
        return prev.filter(c => c !== currency)
      }
      if (prev.length >= 3) {
        return prev
      }
      return [...prev, currency]
    })
  }

  const handleSave = () => {
    const prefs = {
      showIndicativePrice,
      indicativeCurrencies: selectedCurrencies
    }
    localStorage.setItem('distributor_preferences', JSON.stringify(prefs))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link 
        href="/account"
        className="inline-flex items-center gap-1 text-[13px] mb-6"
        style={{ color: 'var(--color-brand-primary)' }}
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Account
      </Link>

        <div className="mb-8">
          <h1 
            className="text-[28px] font-semibold tracking-tight"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Display Preferences
          </h1>
          <p 
            className="text-[15px] mt-1"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Customize how prices are displayed in the catalog
          </p>
        </div>

        <div 
          className="card p-4 mb-6 flex items-start gap-3"
          style={{ backgroundColor: 'rgba(0, 113, 227, 0.05)' }}
        >
          <Info className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--color-brand-primary)' }} />
          <div>
            <p className="text-[13px]" style={{ color: 'var(--color-text-primary)' }}>
              Your catalog prices are displayed in <strong>{user?.displayCurrency}</strong>
            </p>
            <p className="text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
              Your invoices are issued in <strong>{user?.invoiceCurrency}</strong>
            </p>
            <p className="text-[11px] mt-2" style={{ color: 'var(--color-text-tertiary)' }}>
              Contact your sales representative to change these settings.
            </p>
          </div>
        </div>

        <div className="card p-6">
          <h2 
            className="text-[15px] font-semibold mb-4"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Indicative Prices
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p 
                  className="text-[14px] font-medium"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  Show indicative prices in other currencies
                </p>
                <p 
                  className="text-[12px]"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Display approximate prices for reference (based on exchange rates)
                </p>
              </div>
              <button
                onClick={() => setShowIndicativePrice(!showIndicativePrice)}
                className="w-12 h-7 rounded-full transition-colors relative"
                style={{ 
                  backgroundColor: showIndicativePrice ? 'var(--color-brand-primary)' : 'var(--color-bg-tertiary)'
                }}
              >
                <span 
                  className="absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform"
                  style={{ 
                    transform: showIndicativePrice ? 'translateX(24px)' : 'translateX(4px)'
                  }}
                />
              </button>
            </div>

            {showIndicativePrice && (
              <div 
                className="pt-4"
                style={{ borderTop: '1px solid rgba(210, 210, 215, 0.3)' }}
              >
                <div className="flex items-center justify-between mb-3">
                  <label 
                    className="text-[12px] font-medium"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Select currencies (max 3)
                  </label>
                  <span 
                    className="text-[11px]"
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    {selectedCurrencies.length}/3 selected
                  </span>
                </div>

                {selectedCurrencies.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {selectedCurrencies.map((currency) => (
                      <span
                        key={currency}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium"
                        style={{ 
                          backgroundColor: 'var(--color-brand-primary)',
                          color: 'white'
                        }}
                      >
                        {CURRENCY_SYMBOLS[currency as keyof typeof CURRENCY_SYMBOLS] || ''} {currency}
                        <button
                          onClick={() => toggleCurrency(currency)}
                          className="hover:opacity-70"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {availableCurrencies.map((currency) => {
                    const isSelected = selectedCurrencies.includes(currency)
                    const isDisabled = !isSelected && selectedCurrencies.length >= 3
                    const symbol = CURRENCY_SYMBOLS[currency as keyof typeof CURRENCY_SYMBOLS] || ''
                    const name = CURRENCY_NAMES[currency] || currency

                    return (
                      <button
                        key={currency}
                        onClick={() => toggleCurrency(currency)}
                        disabled={isDisabled}
                        className="p-3 rounded-xl text-left transition-all"
                        style={{ 
                          backgroundColor: isSelected 
                            ? 'rgba(0, 113, 227, 0.1)' 
                            : 'var(--color-bg-secondary)',
                          border: isSelected 
                            ? '2px solid var(--color-brand-primary)' 
                            : '1px solid rgba(210, 210, 215, 0.3)',
                          opacity: isDisabled ? 0.5 : 1,
                          cursor: isDisabled ? 'not-allowed' : 'pointer'
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p 
                              className="text-[14px] font-medium"
                              style={{ color: 'var(--color-text-primary)' }}
                            >
                              {symbol} {currency}
                            </p>
                            <p 
                              className="text-[11px]"
                              style={{ color: 'var(--color-text-secondary)' }}
                            >
                              {name}
                            </p>
                          </div>
                          {isSelected && (
                            <Check className="w-4 h-4" style={{ color: 'var(--color-brand-primary)' }} />
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
                
                <div 
                  className="mt-4 p-3 rounded-lg flex items-start gap-2"
                  style={{ backgroundColor: 'rgba(255, 149, 0, 0.1)' }}
                >
                  <span className="text-[14px]">⚠️</span>
                  <p className="text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>
                    Indicative prices are estimates based on current exchange rates. 
                    They are for reference only and may differ from actual invoice amounts. 
                    Your invoice will be in <strong>{user?.invoiceCurrency}</strong>.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            className="btn-primary"
            style={{ 
              backgroundColor: saved ? 'var(--color-success)' : 'var(--color-brand-primary)'
            }}
          >
            {saved ? (
              <>
                <Check className="w-4 h-4" />
                Saved!
              </>
            ) : (
              'Save Preferences'
            )}
          </button>
        </div>
    </div>
  )
}