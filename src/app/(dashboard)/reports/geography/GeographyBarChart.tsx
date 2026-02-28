'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'

interface GeographyBarChartProps {
  chartData: { name: string; value: number; count: number }[]
  currencySymbol: string
}

export default function GeographyBarChart({ chartData, currencySymbol }: GeographyBarChartProps) {
  return (
    <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-5 mb-6">
      <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-4">Top 10 Countries by Revenue</h3>
      <div className="h-80">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: '#86868b' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${currencySymbol}${(value / 1000).toFixed(0)}k`}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11, fill: '#1d1d1f' }}
                tickLine={false}
                axisLine={false}
                width={120}
              />
              <Tooltip
                formatter={(value: number | undefined, name, props) => [
                  `${currencySymbol}${(value ?? 0).toLocaleString()} (${props.payload.count} orders)`,
                  'Revenue'
                ]}
                contentStyle={{
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb'
                }}
              />
              <Bar dataKey="value" fill="#0071e3" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-[#86868b]">
            No country data available
          </div>
        )}
      </div>
    </div>
  )
}
