'use client'

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'
import { TimeSeriesData } from '@/types/analytics'
import { useLocalization } from '@/hooks/useLocalization'
import { useTheme } from '@/contexts/ThemeContext'

interface RevenueChartProps {
  data: TimeSeriesData[]
  loading?: boolean
}

export function RevenueChart({ data, loading }: RevenueChartProps) {
  const { currencySymbol } = useLocalization()
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-5">
        <div className="h-5 bg-[#f5f5f7] rounded w-32 mb-4 animate-pulse" />
        <div className="h-64 bg-[#f5f5f7] rounded animate-pulse" />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-5">
      <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-4">Revenue Over Time</h3>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0071e3" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#0071e3" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={isDark ? '#38383a' : '#f0f0f0'} 
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: isDark ? '#98989d' : '#86868b' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: isDark ? '#98989d' : '#86868b' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${currencySymbol}${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              formatter={(value) => {
                const numericValue = typeof value === 'number' ? value : Number(value ?? 0)
                return [`${currencySymbol}${numericValue.toLocaleString()}`, 'Revenue']
              }}
              contentStyle={{
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                backgroundColor: isDark ? '#2c2c2e' : '#fff',
                color: isDark ? '#f5f5f7' : '#1d1d1f'
              }}
              labelStyle={{ color: isDark ? '#98989d' : '#86868b' }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#0071e3"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorRevenue)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
