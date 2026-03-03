'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface GeographyBarChartProps {
  chartData: { name: string; value: number; count: number }[]
  currencySymbol: string
}

export default function GeographyBarChart({ chartData, currencySymbol }: GeographyBarChartProps) {
  return (
    <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-5">
      <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-4">Top Countries by Revenue</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData.slice(0, 10)} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f2" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: '#86868b' }} tickLine={false} axisLine={false}
            tickFormatter={(v) => `${currencySymbol}${(v / 1000).toFixed(0)}k`} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#1d1d1f' }} tickLine={false} axisLine={false} width={75} />
          <Tooltip
            contentStyle={{ border: '1px solid #d2d2d7', borderRadius: 8, fontSize: 12 }}
          />
          <Bar dataKey="value" fill="#0071e3" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
