'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'
import { TimeSeriesData } from '@/types/analytics'
import { useTheme } from '@/contexts/ThemeContext'

interface OrdersChartProps {
  data: TimeSeriesData[]
  loading?: boolean
}

export function OrdersChart({ data, loading }: OrdersChartProps) {
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
      <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-4">Orders Over Time</h3>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
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
              allowDecimals={false}
            />
            <Tooltip
              formatter={(value) => [value, 'Orders']}
              contentStyle={{
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                backgroundColor: isDark ? '#2c2c2e' : '#fff',
                color: isDark ? '#f5f5f7' : '#1d1d1f'
              }}
              labelStyle={{ color: isDark ? '#98989d' : '#86868b' }}
            />
            <Bar
              dataKey="value"
              fill="#34c759"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
