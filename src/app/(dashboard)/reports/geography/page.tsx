'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { ArrowLeft, Globe, Loader2 } from 'lucide-react'
import { PeriodSelector } from '@/components/analytics/PeriodSelector'
import { AnalyticsResult, TimePeriod, DimensionData } from '@/types/analytics'
import { useLocalization } from '@/hooks/useLocalization'

const GeographyBarChart = dynamic(
  () => import('./GeographyBarChart'),
  { ssr: false, loading: () => <div className="h-80 animate-pulse rounded-xl bg-gray-100 mb-6" /> }
)

const COUNTRY_NAMES: Record<string, string> = {
  'CN': 'China',
  'US': 'United States',
  'DE': 'Germany',
  'FR': 'France',
  'GB': 'United Kingdom',
  'JP': 'Japan',
  'KR': 'South Korea',
  'AU': 'Australia',
  'CA': 'Canada',
  'NL': 'Netherlands',
  'BE': 'Belgium',
  'ES': 'Spain',
  'IT': 'Italy',
  'BR': 'Brazil',
  'IN': 'India',
  'RU': 'Russia',
  'MX': 'Mexico',
  'SG': 'Singapore',
  'HK': 'Hong Kong',
  'TW': 'Taiwan',
  'TH': 'Thailand',
  'VN': 'Vietnam',
  'ID': 'Indonesia',
  'MY': 'Malaysia',
  'PH': 'Philippines',
  'AE': 'UAE',
  'SA': 'Saudi Arabia',
  'TR': 'Turkey',
  'PL': 'Poland',
  'SE': 'Sweden',
  'CH': 'Switzerland',
  'AT': 'Austria',
  'DK': 'Denmark',
  'NO': 'Norway',
  'FI': 'Finland',
  'IE': 'Ireland',
  'PT': 'Portugal',
  'CZ': 'Czech Republic',
  'NZ': 'New Zealand',
  'ZA': 'South Africa',
  'IL': 'Israel',
  'Unknown': 'Unknown'
}

const CONTINENTS: Record<string, string> = {
  'CN': 'Asia',
  'JP': 'Asia',
  'KR': 'Asia',
  'SG': 'Asia',
  'HK': 'Asia',
  'TW': 'Asia',
  'TH': 'Asia',
  'VN': 'Asia',
  'ID': 'Asia',
  'MY': 'Asia',
  'PH': 'Asia',
  'IN': 'Asia',
  'US': 'Americas',
  'CA': 'Americas',
  'MX': 'Americas',
  'BR': 'Americas',
  'DE': 'Europe',
  'FR': 'Europe',
  'GB': 'Europe',
  'NL': 'Europe',
  'BE': 'Europe',
  'ES': 'Europe',
  'IT': 'Europe',
  'PL': 'Europe',
  'SE': 'Europe',
  'CH': 'Europe',
  'AT': 'Europe',
  'DK': 'Europe',
  'NO': 'Europe',
  'FI': 'Europe',
  'IE': 'Europe',
  'PT': 'Europe',
  'CZ': 'Europe',
  'RU': 'Europe',
  'AU': 'Oceania',
  'NZ': 'Oceania',
  'AE': 'Middle East',
  'SA': 'Middle East',
  'IL': 'Middle East',
  'TR': 'Middle East',
  'ZA': 'Africa'
}

function getCountryFlag(code: string): string {
  if (code === 'Unknown' || !code || code.length !== 2) return '🌍'
  return code
    .toUpperCase()
    .split('')
    .map(char => String.fromCodePoint(char.charCodeAt(0) + 127397))
    .join('')
}

function getCountryName(code: string): string {
  return COUNTRY_NAMES[code] || code
}

function getContinent(code: string): string {
  return CONTINENTS[code] || 'Other'
}

export default function GeographyAnalysisPage() {
  const [period, setPeriod] = useState<TimePeriod>('last30days')
  const [data, setData] = useState<AnalyticsResult | null>(null)
  const [loading, setLoading] = useState(true)
  const { currencySymbol } = useLocalization()

  useEffect(() => {
    loadData()
  }, [period])

  async function loadData() {
    setLoading(true)
    try {
      const res = await fetch(`/api/analytics?period=${period}`)
      if (res.ok) {
        const result = await res.json()
        setData(result)
      }
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const countries = data?.byDimension.byCountry || []
  const totalRevenue = countries.reduce((sum, c) => sum + c.value, 0)

  // Group by continent
  const byContinent = countries.reduce((acc, country) => {
    const continent = getContinent(String(country.dimension))
    if (!acc[continent]) {
      acc[continent] = { value: 0, count: 0, countries: 0 }
    }
    acc[continent].value += country.value
    acc[continent].count += country.count
    acc[continent].countries += 1
    return acc
  }, {} as Record<string, { value: number; count: number; countries: number }>)

  const continentData = Object.entries(byContinent)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.value - a.value)

  const chartData = countries.slice(0, 10).map(c => ({
    name: getCountryName(String(c.dimension)),
    value: c.value,
    count: c.count
  }))

  if (loading && !data) {
    return (
      <div className="max-w-6xl mx-auto flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#0071e3]" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/reports"
            className="p-2 hover:bg-[#f5f5f7] rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[#86868b]" />
          </Link>
          <div>
            <h1 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">Geographic Analysis</h1>
            <p className="text-[15px] text-[#86868b] mt-1">
              Analyze sales distribution across countries and regions
            </p>
          </div>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[12px] text-[#86868b]">Countries</p>
            <Globe className="w-5 h-5 text-[#34c759]" />
          </div>
          <p className="text-[24px] font-semibold text-[#1d1d1f]">
            {countries.length}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-4">
          <p className="text-[12px] text-[#86868b] mb-1">Continents</p>
          <p className="text-[24px] font-semibold text-[#1d1d1f]">
            {continentData.length}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-4">
          <p className="text-[12px] text-[#86868b] mb-1">Total Revenue</p>
          <p className="text-[24px] font-semibold text-[#1d1d1f]">
            {currencySymbol}{totalRevenue.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Continent Breakdown */}
      <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-5 mb-6">
        <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-4">Sales by Continent</h3>
        <div className="space-y-4">
          {continentData.map((continent, i) => {
            const percentage = totalRevenue > 0 ? (continent.value / totalRevenue) * 100 : 0
            return (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-3">
                    <span className="text-[14px] font-medium text-[#1d1d1f]">{continent.name}</span>
                    <span className="text-[12px] text-[#86868b]">
                      {continent.countries} {continent.countries === 1 ? 'country' : 'countries'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[12px] text-[#86868b]">{continent.count} orders</span>
                    <span className="text-[14px] font-semibold text-[#1d1d1f]">
                      {currencySymbol}{continent.value.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-[#f5f5f7] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#34c759] rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-[12px] text-[#86868b] w-12 text-right">
                    {percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            )
          })}
          {continentData.length === 0 && (
            <p className="text-[13px] text-[#86868b] text-center py-4">No data available</p>
          )}
        </div>
      </div>

      {/* Top Countries Chart */}
      <GeographyBarChart chartData={chartData} currencySymbol={currencySymbol} />

      {/* Country Table */}
      <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 overflow-hidden">
        <div className="p-5 border-b border-[#d2d2d7]/30">
          <h3 className="text-[15px] font-semibold text-[#1d1d1f]">All Countries</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#d2d2d7]/30 bg-[#f5f5f7]/50">
                <th className="text-left text-[12px] font-medium text-[#86868b] px-5 py-3">Rank</th>
                <th className="text-left text-[12px] font-medium text-[#86868b] px-5 py-3">Country</th>
                <th className="text-left text-[12px] font-medium text-[#86868b] px-5 py-3">Continent</th>
                <th className="text-right text-[12px] font-medium text-[#86868b] px-5 py-3">Orders</th>
                <th className="text-right text-[12px] font-medium text-[#86868b] px-5 py-3">Revenue</th>
                <th className="text-right text-[12px] font-medium text-[#86868b] px-5 py-3">% of Total</th>
              </tr>
            </thead>
            <tbody>
              {countries.map((country, i) => {
                const code = String(country.dimension)
                return (
                  <tr key={i} className="border-b border-[#d2d2d7]/30 last:border-0 hover:bg-[#f5f5f7]/30">
                    <td className="px-5 py-3 text-[13px] text-[#86868b]">#{i + 1}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getCountryFlag(code)}</span>
                        <span className="text-[13px] font-medium text-[#1d1d1f]">
                          {getCountryName(code)}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-[13px] text-[#1d1d1f]">
                      {getContinent(code)}
                    </td>
                    <td className="px-5 py-3 text-[13px] text-[#1d1d1f] text-right">{country.count}</td>
                    <td className="px-5 py-3 text-[13px] font-semibold text-[#1d1d1f] text-right">
                      {currencySymbol}{country.value.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-[13px] text-[#86868b] text-right">{country.percentage}%</td>
                  </tr>
                )
              })}
              {countries.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-[13px] text-[#86868b]">
                    No geographic data available for this period
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
