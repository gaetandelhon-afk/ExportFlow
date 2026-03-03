'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { DimensionData } from '@/types/analytics'

const COLORS = ['#0071e3', '#34c759', '#ff9500', '#ff3b30', '#5856d6', '#32ade6', '#ff2d55', '#af52de']

interface ProductsChartsProps {
  chartData: { name: string; value: number; count: number }[]
  categoryData: DimensionData[]
  currencySymbol: string
}

export default function ProductsCharts({ chartData, categoryData }: ProductsChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-5">
        <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-4">Top Products by Revenue</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData.slice(0, 8)} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f2" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: '#86868b' }} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#1d1d1f' }} tickLine={false} axisLine={false} width={75} />
            <Tooltip contentStyle={{ border: '1px solid #d2d2d7', borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="value" fill="#0071e3" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-5">
        <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-4">Revenue by Category</h3>
        {categoryData.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={categoryData} dataKey="value" nameKey="dimension" cx="50%" cy="50%" outerRadius={90} label={false}>
                {categoryData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ border: '1px solid #d2d2d7', borderRadius: 8, fontSize: 12 }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[260px] flex items-center justify-center text-[13px] text-[#86868b]">No data available</div>
        )}
      </div>
    </div>
  )
}
