'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { ArrowLeft, TrendingUp, TrendingDown, Loader2 } from 'lucide-react'
import { PeriodSelector } from '@/components/analytics/PeriodSelector'
import { AnalyticsResult, TimePeriod } from '@/types/analytics'
import { useLocalization } from '@/hooks/useLocalization'

const chartLoadingFallback = <div className="h-64 animate-pulse rounded-xl bg-gray-100" />

const RevenueChart = dynamic(
  () => import('@/components/analytics/RevenueChart').then(m => ({ default: m.RevenueChart })),
  { ssr: false, loading: () => chartLoadingFallback }
)

const OrdersChart = dynamic(
  () => import('@/components/analytics/OrdersChart').then(m => ({ default: m.OrdersChart })),
  { ssr: false, loading: () => chartLoadingFallback }
)

const SalesPieCharts = dynamic(
  () => import('./SalesPieCharts'),
  { ssr: false, loading: () => <div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><div className="h-64 animate-pulse rounded-xl bg-gray-100" /><div className="h-64 animate-pulse rounded-xl bg-gray-100" /></div> }
)

export default function SalesAnalysisPage() {
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
            <h1 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">Sales Analysis</h1>
            <p className="text-[15px] text-[#86868b] mt-1">
              Detailed breakdown of your sales performance
            </p>
          </div>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <SummaryCard
          label="Total Revenue"
          value={`${currencySymbol}${(data?.kpis.totalRevenue || 0).toLocaleString()}`}
          change={data?.kpis.totalRevenueChange || 0}
        />
        <SummaryCard
          label="Total Orders"
          value={data?.kpis.totalOrders || 0}
          change={data?.kpis.totalOrdersChange || 0}
        />
        <SummaryCard
          label="Avg Order Value"
          value={`${currencySymbol}${Math.round(data?.kpis.averageOrderValue || 0).toLocaleString()}`}
          change={data?.kpis.averageOrderValueChange || 0}
        />
        <SummaryCard
          label="Products Ordered"
          value={data?.kpis.productsOrdered || 0}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <RevenueChart data={data?.timeSeries.revenue || []} loading={loading} />
        <OrdersChart data={data?.timeSeries.orders || []} loading={loading} />
      </div>

      {/* Pie Charts */}
      <SalesPieCharts
        statusData={data?.byDimension.byStatus || []}
        categoryData={data?.byDimension.byCategory || []}
        currencySymbol={currencySymbol}
      />

      {/* Price Tier Analysis */}
      <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-5">
        <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-4">Sales by Price Tier</h3>
        <div className="space-y-3">
          {(data?.byDimension.byPriceTier || []).map((tier, i) => (
            <TierRow 
              key={i}
              rank={i + 1}
              name={tier.dimension}
              value={tier.value}
              count={tier.count}
              percentage={tier.percentage}
              currencySymbol={currencySymbol}
            />
          ))}
          {(!data?.byDimension.byPriceTier || data.byDimension.byPriceTier.length === 0) && (
            <p className="text-[13px] text-[#86868b] text-center py-4">No price tier data available</p>
          )}
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ label, value, change }: { label: string; value: string | number; change?: number }) {
  return (
    <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-4">
      <p className="text-[12px] text-[#86868b] mb-1">{label}</p>
      <p className="text-[24px] font-semibold text-[#1d1d1f]">{value}</p>
      {change !== undefined && (
        <div className={`flex items-center gap-1 text-[12px] font-medium ${
          change > 0 ? 'text-[#34c759]' : change < 0 ? 'text-[#ff3b30]' : 'text-[#86868b]'
        }`}>
          {change > 0 ? <TrendingUp className="w-3 h-3" /> : change < 0 ? <TrendingDown className="w-3 h-3" /> : null}
          {change > 0 ? '+' : ''}{change}% vs prev period
        </div>
      )}
    </div>
  )
}

function TierRow({ rank, name, value, count, percentage, currencySymbol }: {
  rank: number
  name: string
  value: number
  count: number
  percentage: number
  currencySymbol: string
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-[#86868b] w-5">#{rank}</span>
          <span className="text-[13px] font-medium text-[#1d1d1f]">{name}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[12px] text-[#86868b]">{count} orders</span>
          <span className="text-[13px] font-semibold text-[#1d1d1f]">
            {currencySymbol}{value.toLocaleString()}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-[#f5f5f7] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#0071e3] rounded-full"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-[11px] text-[#86868b] w-10 text-right">{percentage}%</span>
      </div>
    </div>
  )
}
