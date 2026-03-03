'use client'

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { DimensionData } from '@/types/analytics'

const COLORS = ['#0071e3', '#34c759', '#ff9500', '#ff3b30', '#5856d6', '#32ade6', '#ff2d55', '#af52de']

interface SalesPieChartsProps {
  statusData: DimensionData[]
  categoryData: DimensionData[]
  currencySymbol: string
}

export default function SalesPieCharts({ statusData, categoryData }: SalesPieChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-5">
        <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-4">Orders by Status</h3>
        {statusData.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="dimension" cx="50%" cy="50%" outerRadius={85} label={false}>
                {statusData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ border: '1px solid #d2d2d7', borderRadius: 8, fontSize: 12 }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[240px] flex items-center justify-center text-[13px] text-[#86868b]">No data available</div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-5">
        <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-4">Revenue by Category</h3>
        {categoryData.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={categoryData} dataKey="value" nameKey="dimension" cx="50%" cy="50%" outerRadius={85} label={false}>
                {categoryData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ border: '1px solid #d2d2d7', borderRadius: 8, fontSize: 12 }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[240px] flex items-center justify-center text-[13px] text-[#86868b]">No data available</div>
        )}
      </div>
    </div>
  )
}
