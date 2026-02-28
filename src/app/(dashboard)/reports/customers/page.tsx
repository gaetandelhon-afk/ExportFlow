'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { ArrowLeft, Users, Loader2, TrendingUp, TrendingDown } from 'lucide-react'
import { PeriodSelector } from '@/components/analytics/PeriodSelector'
import { AnalyticsResult, TimePeriod } from '@/types/analytics'
import { useLocalization } from '@/hooks/useLocalization'

const CustomersCharts = dynamic(
  () => import('./CustomersCharts'),
  { ssr: false, loading: () => <><div className="h-64 animate-pulse rounded-xl bg-gray-100 mb-6" /><div className="h-80 animate-pulse rounded-xl bg-gray-100 mb-6" /></> }
)

export default function CustomersAnalysisPage() {
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

  const topCustomers = data?.byDimension.byCustomer || []
  const chartData = topCustomers.slice(0, 10).map(c => ({
    name: c.dimension.length > 15 ? c.dimension.substring(0, 15) + '...' : c.dimension,
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
            <h1 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">Customer Analysis</h1>
            <p className="text-[15px] text-[#86868b] mt-1">
              Understand your customer base and their buying patterns
            </p>
          </div>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[12px] text-[#86868b]">Total Customers</p>
            <Users className="w-5 h-5 text-[#5856d6]" />
          </div>
          <p className="text-[24px] font-semibold text-[#1d1d1f]">
            {data?.kpis.totalCustomers || 0}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-4">
          <p className="text-[12px] text-[#86868b] mb-1">Active Customers</p>
          <p className="text-[24px] font-semibold text-[#1d1d1f]">
            {data?.kpis.activeCustomers || 0}
          </p>
          <p className="text-[12px] text-[#86868b]">
            {data?.kpis.totalCustomers ? Math.round((data.kpis.activeCustomers / data.kpis.totalCustomers) * 100) : 0}% of total
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-4">
          <p className="text-[12px] text-[#86868b] mb-1">New Customers</p>
          <p className="text-[24px] font-semibold text-[#1d1d1f]">
            {data?.kpis.newCustomers || 0}
          </p>
          <div className={`flex items-center gap-1 text-[12px] font-medium ${
            (data?.kpis.newCustomersChange || 0) > 0 ? 'text-[#34c759]' : 'text-[#86868b]'
          }`}>
            {(data?.kpis.newCustomersChange || 0) > 0 && <TrendingUp className="w-3 h-3" />}
            {(data?.kpis.newCustomersChange || 0) < 0 && <TrendingDown className="w-3 h-3" />}
            {data?.kpis.newCustomersChange || 0}% vs prev
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-4">
          <p className="text-[12px] text-[#86868b] mb-1">Avg Order Value</p>
          <p className="text-[24px] font-semibold text-[#1d1d1f]">
            {currencySymbol}{Math.round(data?.kpis.averageOrderValue || 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Charts */}
      <CustomersCharts
        activityData={data?.timeSeries.customers || []}
        topChartData={chartData}
        currencySymbol={currencySymbol}
      />

      {/* Customer Table */}
      <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 overflow-hidden">
        <div className="p-5 border-b border-[#d2d2d7]/30">
          <h3 className="text-[15px] font-semibold text-[#1d1d1f]">All Active Customers</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#d2d2d7]/30 bg-[#f5f5f7]/50">
                <th className="text-left text-[12px] font-medium text-[#86868b] px-5 py-3">Rank</th>
                <th className="text-left text-[12px] font-medium text-[#86868b] px-5 py-3">Customer</th>
                <th className="text-left text-[12px] font-medium text-[#86868b] px-5 py-3">Country</th>
                <th className="text-right text-[12px] font-medium text-[#86868b] px-5 py-3">Orders</th>
                <th className="text-right text-[12px] font-medium text-[#86868b] px-5 py-3">Revenue</th>
                <th className="text-right text-[12px] font-medium text-[#86868b] px-5 py-3">% of Total</th>
              </tr>
            </thead>
            <tbody>
              {topCustomers.map((customer, i) => (
                <tr key={i} className="border-b border-[#d2d2d7]/30 last:border-0 hover:bg-[#f5f5f7]/30">
                  <td className="px-5 py-3 text-[13px] text-[#86868b]">#{i + 1}</td>
                  <td className="px-5 py-3 text-[13px] font-medium text-[#1d1d1f]">{customer.dimension}</td>
                  <td className="px-5 py-3 text-[13px] text-[#1d1d1f]">
                    {(customer.metadata?.country as string) || '-'}
                  </td>
                  <td className="px-5 py-3 text-[13px] text-[#1d1d1f] text-right">{customer.count}</td>
                  <td className="px-5 py-3 text-[13px] font-semibold text-[#1d1d1f] text-right">
                    {currencySymbol}{customer.value.toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-[13px] text-[#86868b] text-right">{customer.percentage}%</td>
                </tr>
              ))}
              {topCustomers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-[13px] text-[#86868b]">
                    No customer data available for this period
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
