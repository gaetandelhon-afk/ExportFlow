'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { TimeSeriesData } from '@/types/analytics'

interface CustomersChartsProps {
  activityData: TimeSeriesData[]
  topChartData: { name: string; value: number; count: number }[]
  currencySymbol: string
}

export default function CustomersCharts({ activityData, topChartData, currencySymbol }: CustomersChartsProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-5">
        <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-4">New Customers Over Time</h3>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={activityData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="customers-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0071e3" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#0071e3" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f2" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#86868b' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#86868b' }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ border: '1px solid #d2d2d7', borderRadius: 8, fontSize: 12 }}
            />
            <Area type="monotone" dataKey="value" stroke="#0071e3" strokeWidth={2} fill="url(#customers-gradient)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-5">
        <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-4">Top Customers by Revenue</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={topChartData.slice(0, 10)} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
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
    </div>
  )
}
