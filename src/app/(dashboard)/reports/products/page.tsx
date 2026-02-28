'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { ArrowLeft, Package, Loader2 } from 'lucide-react'
import { PeriodSelector } from '@/components/analytics/PeriodSelector'
import { AnalyticsResult, TimePeriod } from '@/types/analytics'
import { useLocalization } from '@/hooks/useLocalization'

const ProductsCharts = dynamic(
  () => import('./ProductsCharts'),
  { ssr: false, loading: () => <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6"><div className="h-80 animate-pulse rounded-xl bg-gray-100" /><div className="h-80 animate-pulse rounded-xl bg-gray-100" /></div> }
)

export default function ProductsAnalysisPage() {
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

  const topProducts = data?.byDimension.byProduct || []
  const categories = data?.byDimension.byCategory || []

  const chartData = topProducts.slice(0, 10).map(p => ({
    name: p.dimension.length > 20 ? p.dimension.substring(0, 20) + '...' : p.dimension,
    value: p.value,
    count: p.count
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
            <h1 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">Product Analysis</h1>
            <p className="text-[15px] text-[#86868b] mt-1">
              Analyze your best-selling products and categories
            </p>
          </div>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[12px] text-[#86868b]">Products Ordered</p>
            <Package className="w-5 h-5 text-[#ff9500]" />
          </div>
          <p className="text-[24px] font-semibold text-[#1d1d1f]">
            {data?.kpis.productsOrdered || 0}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-4">
          <p className="text-[12px] text-[#86868b] mb-1">Categories Active</p>
          <p className="text-[24px] font-semibold text-[#1d1d1f]">
            {categories.length}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-4">
          <p className="text-[12px] text-[#86868b] mb-1">Total Revenue</p>
          <p className="text-[24px] font-semibold text-[#1d1d1f]">
            {currencySymbol}{(data?.kpis.totalRevenue || 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <ProductsCharts
        chartData={chartData}
        categoryData={categories}
        currencySymbol={currencySymbol}
      />

      {/* Product Table */}
      <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 overflow-hidden">
        <div className="p-5 border-b border-[#d2d2d7]/30">
          <h3 className="text-[15px] font-semibold text-[#1d1d1f]">All Products Ordered</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#d2d2d7]/30 bg-[#f5f5f7]/50">
                <th className="text-left text-[12px] font-medium text-[#86868b] px-5 py-3">Rank</th>
                <th className="text-left text-[12px] font-medium text-[#86868b] px-5 py-3">Product</th>
                <th className="text-left text-[12px] font-medium text-[#86868b] px-5 py-3">Category</th>
                <th className="text-right text-[12px] font-medium text-[#86868b] px-5 py-3">Units Sold</th>
                <th className="text-right text-[12px] font-medium text-[#86868b] px-5 py-3">Revenue</th>
                <th className="text-right text-[12px] font-medium text-[#86868b] px-5 py-3">% of Total</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map((product, i) => (
                <tr key={i} className="border-b border-[#d2d2d7]/30 last:border-0 hover:bg-[#f5f5f7]/30">
                  <td className="px-5 py-3 text-[13px] text-[#86868b]">#{i + 1}</td>
                  <td className="px-5 py-3">
                    <p className="text-[13px] font-medium text-[#1d1d1f]">{product.dimension}</p>
                    {typeof (product.metadata as { ref?: unknown } | null | undefined)?.ref === 'string' && (
                      <p className="text-[11px] text-[#86868b]">
                        {(product.metadata as { ref: string }).ref}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-3 text-[13px] text-[#1d1d1f]">
                    {(product.metadata?.category as string) || '-'}
                  </td>
                  <td className="px-5 py-3 text-[13px] text-[#1d1d1f] text-right">{product.count}</td>
                  <td className="px-5 py-3 text-[13px] font-semibold text-[#1d1d1f] text-right">
                    {currencySymbol}{product.value.toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-[13px] text-[#86868b] text-right">{product.percentage}%</td>
                </tr>
              ))}
              {topProducts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-[13px] text-[#86868b]">
                    No product data available for this period
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
