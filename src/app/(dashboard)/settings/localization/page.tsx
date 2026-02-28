'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  ChevronLeft, Globe, Save, Loader2, CheckCircle, 
  Languages, DollarSign, Calendar, Clock, Plus, Trash2, Star
} from 'lucide-react'

interface Currency {
  code: string
  symbol: string
  name: string
  enabled: boolean
  isDefault: boolean
}

interface Language {
  code: string
  name: string
  enabled: boolean
  isDefault: boolean
}

interface LocalizationSettings {
  // Languages
  languages: Language[]
  
  // Currencies
  currencies: Currency[]
  
  // Date & Time
  dateFormat: string
  timeFormat: '12h' | '24h'
  timezone: string
  
  // Numbers
  numberFormat: string
  decimalSeparator: '.' | ','
  thousandsSeparator: ',' | '.' | ' '
  
  // Regional
  defaultCountry: string
  weightUnit: 'kg' | 'lb'
  dimensionUnit: 'cm' | 'in'
}

const STORAGE_KEY = 'orderbridge_localization_settings'

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
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira', enabled: false, isDefault: false },
  { code: 'RUB', symbol: '₽', name: 'Russian Ruble', enabled: false, isDefault: false },
  { code: 'PLN', symbol: 'zł', name: 'Polish Zloty', enabled: false, isDefault: false },
  { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna', enabled: false, isDefault: false },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', enabled: false, isDefault: false },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone', enabled: false, isDefault: false },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone', enabled: false, isDefault: false },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', enabled: false, isDefault: false },
  { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso', enabled: false, isDefault: false },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand', enabled: false, isDefault: false },
  { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound', enabled: false, isDefault: false },
  { code: 'ILS', symbol: '₪', name: 'Israeli Shekel', enabled: false, isDefault: false },
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

const timezones = [
  'Europe/Paris',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Amsterdam',
  'Europe/Brussels',
  'Europe/Zurich',
  'Europe/Vienna',
  'Europe/Warsaw',
  'Europe/Prague',
  'Europe/Stockholm',
  'Europe/Oslo',
  'Europe/Helsinki',
  'Europe/Athens',
  'Europe/Istanbul',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Vancouver',
  'America/Mexico_City',
  'America/Sao_Paulo',
  'America/Buenos_Aires',
  'Asia/Shanghai',
  'Asia/Hong_Kong',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Asia/Singapore',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Bangkok',
  'Asia/Ho_Chi_Minh',
  'Asia/Jakarta',
  'Asia/Manila',
  'Asia/Taipei',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Pacific/Auckland',
  'Africa/Cairo',
  'Africa/Johannesburg',
  'Africa/Lagos',
]

const countries = [
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
  { code: 'CN', name: 'China' },
  { code: 'AE', name: 'UAE' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
]

// Merge stored settings with defaults to add new currencies/languages
function mergeWithDefaults(stored: Partial<LocalizationSettings>): LocalizationSettings {
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

export default function LocalizationSettingsPage() {
  const [settings, setSettings] = useState<LocalizationSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        const merged = mergeWithDefaults(parsed)
        setSettings(merged)
        // Save merged settings back
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
    setLoading(false)
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      console.error('Failed to save:', error)
    } finally {
      setSaving(false)
    }
  }

  const toggleLanguage = (code: string) => {
    setSettings(prev => ({
      ...prev,
      languages: prev.languages.map(l => 
        l.code === code ? { ...l, enabled: !l.enabled } : l
      )
    }))
  }

  const setDefaultLanguage = (code: string) => {
    setSettings(prev => ({
      ...prev,
      languages: prev.languages.map(l => ({
        ...l,
        isDefault: l.code === code,
        enabled: l.code === code ? true : l.enabled
      }))
    }))
  }

  const toggleCurrency = (code: string) => {
    setSettings(prev => ({
      ...prev,
      currencies: prev.currencies.map(c => 
        c.code === code ? { ...c, enabled: !c.enabled } : c
      )
    }))
  }

  const setDefaultCurrency = (code: string) => {
    setSettings(prev => ({
      ...prev,
      currencies: prev.currencies.map(c => ({
        ...c,
        isDefault: c.code === code,
        enabled: c.code === code ? true : c.enabled
      }))
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0071e3]"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Link href="/settings" className="text-[#0071e3] hover:text-[#0077ed] flex items-center gap-1 text-[13px] mb-4">
        <ChevronLeft className="w-4 h-4" />
        Back to Settings
      </Link>
      
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#007aff]/10 rounded-xl flex items-center justify-center">
            <Globe className="w-6 h-6 text-[#007aff]" />
          </div>
          <div>
            <h1 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">Localization</h1>
            <p className="text-[15px] text-[#86868b] mt-1">
              Languages, currencies, and regional settings
            </p>
          </div>
        </div>
        
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#0071e3] text-white rounded-xl text-[14px] font-medium hover:bg-[#0077ED] transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      <div className="space-y-6">
        {/* Languages */}
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Languages className="w-5 h-5 text-[#5856d6]" />
            <h2 className="text-[17px] font-semibold text-[#1d1d1f]">Languages</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {settings.languages.map(lang => (
              <div 
                key={lang.code}
                className={`flex items-center justify-between p-3 rounded-xl border-2 transition-colors ${
                  lang.enabled ? 'bg-[#0071e3]/5 border-[#0071e3]/30' : 'bg-[#f5f5f7] border-transparent'
                }`}
              >
                <label className="flex items-center gap-3 cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    checked={lang.enabled}
                    onChange={() => toggleLanguage(lang.code)}
                    className="w-5 h-5 rounded border-[#d2d2d7] text-[#0071e3] focus:ring-[#0071e3]"
                  />
                  <span className="text-[14px] font-medium text-[#1d1d1f]">{lang.name}</span>
                  <span className="text-[12px] text-[#86868b] uppercase">{lang.code}</span>
                </label>
                {lang.isDefault ? (
                  <span className="flex items-center gap-1 px-2 py-1 bg-[#ff9500]/10 text-[#ff9500] text-[11px] font-medium rounded-full">
                    <Star className="w-3 h-3 fill-current" />
                    Default
                  </span>
                ) : lang.enabled ? (
                  <button
                    onClick={() => setDefaultLanguage(lang.code)}
                    className="text-[12px] text-[#0071e3] hover:underline"
                  >
                    Set default
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        {/* Currencies */}
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-6">
          <div className="flex items-center gap-3 mb-6">
            <DollarSign className="w-5 h-5 text-[#34c759]" />
            <h2 className="text-[17px] font-semibold text-[#1d1d1f]">Currencies</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {settings.currencies.map(currency => (
              <div 
                key={currency.code}
                className={`flex items-center justify-between p-3 rounded-xl border-2 transition-colors ${
                  currency.enabled ? 'bg-[#34c759]/5 border-[#34c759]/30' : 'bg-[#f5f5f7] border-transparent'
                }`}
              >
                <label className="flex items-center gap-3 cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    checked={currency.enabled}
                    onChange={() => toggleCurrency(currency.code)}
                    className="w-5 h-5 rounded border-[#d2d2d7] text-[#34c759] focus:ring-[#34c759]"
                  />
                  <span className="text-[16px] font-semibold text-[#1d1d1f] w-8">{currency.symbol}</span>
                  <span className="text-[14px] text-[#1d1d1f]">{currency.name}</span>
                </label>
                {currency.isDefault ? (
                  <span className="flex items-center gap-1 px-2 py-1 bg-[#ff9500]/10 text-[#ff9500] text-[11px] font-medium rounded-full">
                    <Star className="w-3 h-3 fill-current" />
                    Default
                  </span>
                ) : currency.enabled ? (
                  <button
                    onClick={() => setDefaultCurrency(currency.code)}
                    className="text-[12px] text-[#34c759] hover:underline"
                  >
                    Set default
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        {/* Date & Time */}
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Calendar className="w-5 h-5 text-[#ff9500]" />
            <h2 className="text-[17px] font-semibold text-[#1d1d1f]">Date & Time</h2>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Date Format</label>
              <select
                value={settings.dateFormat}
                onChange={(e) => setSettings(prev => ({ ...prev, dateFormat: e.target.value }))}
                className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY (31/12/2024)</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY (12/31/2024)</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD (2024-12-31)</option>
                <option value="DD.MM.YYYY">DD.MM.YYYY (31.12.2024)</option>
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Time Format</label>
              <select
                value={settings.timeFormat}
                onChange={(e) => setSettings(prev => ({ ...prev, timeFormat: e.target.value as '12h' | '24h' }))}
                className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              >
                <option value="24h">24-hour (14:30)</option>
                <option value="12h">12-hour (2:30 PM)</option>
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Timezone</label>
              <select
                value={settings.timezone}
                onChange={(e) => setSettings(prev => ({ ...prev, timezone: e.target.value }))}
                className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              >
                {timezones.map(tz => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Number Formatting */}
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Clock className="w-5 h-5 text-[#0071e3]" />
            <h2 className="text-[17px] font-semibold text-[#1d1d1f]">Number Formatting</h2>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Decimal Separator</label>
              <select
                value={settings.decimalSeparator}
                onChange={(e) => setSettings(prev => ({ ...prev, decimalSeparator: e.target.value as '.' | ',' }))}
                className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              >
                <option value=".">Period (.)</option>
                <option value=",">Comma (,)</option>
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Thousands Separator</label>
              <select
                value={settings.thousandsSeparator}
                onChange={(e) => setSettings(prev => ({ ...prev, thousandsSeparator: e.target.value as ',' | '.' | ' ' }))}
                className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              >
                <option value=",">Comma (1,234)</option>
                <option value=".">Period (1.234)</option>
                <option value=" ">Space (1 234)</option>
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Preview</label>
              <div className="h-10 px-3 bg-[#f5f5f7] rounded-lg flex items-center text-[14px] text-[#1d1d1f]">
                1{settings.thousandsSeparator}234{settings.thousandsSeparator}567{settings.decimalSeparator}89
              </div>
            </div>
          </div>
        </div>

        {/* Regional Settings */}
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Globe className="w-5 h-5 text-[#ff3b30]" />
            <h2 className="text-[17px] font-semibold text-[#1d1d1f]">Regional Settings</h2>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Default Country</label>
              <select
                value={settings.defaultCountry}
                onChange={(e) => setSettings(prev => ({ ...prev, defaultCountry: e.target.value }))}
                className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              >
                {countries.map(c => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Weight Unit</label>
              <select
                value={settings.weightUnit}
                onChange={(e) => setSettings(prev => ({ ...prev, weightUnit: e.target.value as 'kg' | 'lb' }))}
                className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              >
                <option value="kg">Kilograms (kg)</option>
                <option value="lb">Pounds (lb)</option>
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Dimension Unit</label>
              <select
                value={settings.dimensionUnit}
                onChange={(e) => setSettings(prev => ({ ...prev, dimensionUnit: e.target.value as 'cm' | 'in' }))}
                className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              >
                <option value="cm">Centimeters (cm)</option>
                <option value="in">Inches (in)</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
