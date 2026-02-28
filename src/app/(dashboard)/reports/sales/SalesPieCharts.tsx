'use client'

import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend
} from 'recharts'
import { DimensionData } from '@/types/analytics'

const COLORS = ['#0071e3', '#34c759', '#ff9500', '#5856d6', '#ff3b30', '#00c7be', '#ff2d55', '#af52de']

interface SalesPieChartsProps {
  statusData: DimensionData[]
  categoryData: DimensionData[]
  currencySymbol: string
}

export default function SalesPieCharts({ statusData, categoryData, currencySymbol }: SalesPieChartsProps) {
  const statusChartData = statusData.map((s, i) => ({
    name: s.dimension,
    value: s.value,
    count: s.count,
    fill: COLORS[i % COLORS.length]
  }))

  const categoryChartData = categoryData.map((c, i) => ({
    name: c.dimension,
    value: c.value,
    count: c.count,
    fill: COLORS[i % COLORS.length]
  }))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-5">
        <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-4">Sales by Status</h3>
        <div className="h-64">
          {statusChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {statusChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number | undefined) => `${currencySymbol}${(value ?? 0).toLocaleString()}`}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-[#86868b]">
              No data available
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-5">
        <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-4">Sales by Category</h3>
        <div className="h-64">
          {categoryChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {categoryChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number | undefined) => `${currencySymbol}${(value ?? 0).toLocaleString()}`}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-[#86868b]">
              No data available
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
