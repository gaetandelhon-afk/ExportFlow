'use client'

import { useState, useEffect } from 'react'
import { KPICards } from '@/components/analytics/KPICards'
import { RevenueChart } from '@/components/analytics/RevenueChart'
import { OrdersChart } from '@/components/analytics/OrdersChart'
import { TopCustomers } from '@/components/analytics/TopCustomers'
import { TopProducts } from '@/components/analytics/TopProducts'
import { GeographyMap } from '@/components/analytics/GeographyMap'
import { PeriodSelector } from '@/components/analytics/PeriodSelector'
import { AnalyticsResult, TimePeriod } from '@/types/analytics'
import { BarChart3, Download, RefreshCw } from 'lucide-react'
import Link from 'next/link'

export default function ReportsPage() {
  const [period, setPeriod] = useState<TimePeriod>('last30days')
  const [data, setData] = useState<AnalyticsResult | null>(null)
  const [loading, setLoading] = useState(true)

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

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">Reports</h1>
          <p className="text-[15px] text-[#86868b] mt-1">
            Analyze your sales data and export reports
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2.5 hover:bg-[#f5f5f7] rounded-xl transition-colors disabled:opacity-50"
            title="Refresh data"
          >
            <RefreshCw className={`w-5 h-5 text-[#86868b] ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          <PeriodSelector value={period} onChange={setPeriod} />
          
          <Link
            href="/reports/exports"
            className="inline-flex items-center gap-2 px-4 h-10 bg-[#0071e3] hover:bg-[#0077ed] text-white text-[13px] font-medium rounded-xl transition-colors"
          >
            <Download className="w-4 h-4" />
            Export Data
          </Link>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Sales Analysis', href: '/reports/sales', icon: BarChart3, color: '#0071e3' },
          { label: 'Customer Analysis', href: '/reports/customers', icon: BarChart3, color: '#5856d6' },
          { label: 'Product Analysis', href: '/reports/products', icon: BarChart3, color: '#ff9500' },
          { label: 'Geographic Analysis', href: '/reports/geography', icon: BarChart3, color: '#34c759' }
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center gap-3 p-4 bg-white rounded-xl border border-[#d2d2d7]/30 hover:border-[#d2d2d7] transition-colors group"
          >
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${link.color}15` }}
            >
              <link.icon className="w-5 h-5" style={{ color: link.color }} />
            </div>
            <span className="text-[14px] font-medium text-[#1d1d1f] group-hover:text-[#0071e3] transition-colors">
              {link.label}
            </span>
          </Link>
        ))}
      </div>

      {/* KPIs */}
      <div className="mb-6">
        <KPICards kpis={data?.kpis} loading={loading} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <RevenueChart
          data={data?.timeSeries.revenue || []}
          loading={loading}
        />
        <OrdersChart
          data={data?.timeSeries.orders || []}
          loading={loading}
        />
      </div>

      {/* Analysis Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TopCustomers
          data={data?.byDimension.byCustomer.slice(0, 5) || []}
          loading={loading}
        />
        <TopProducts
          data={data?.byDimension.byProduct.slice(0, 5) || []}
          loading={loading}
        />
        <GeographyMap
          data={data?.byDimension.byCountry || []}
          loading={loading}
        />
      </div>
    </div>
  )
}
