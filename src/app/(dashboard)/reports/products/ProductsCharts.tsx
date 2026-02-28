'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'

const COLORS = ['#0071e3', '#34c759', '#ff9500', '#5856d6', '#ff3b30', '#00c7be', '#ff2d55', '#af52de']

interface ProductsChartsProps {
  chartData: { name: string; value: number; count: number }[]
  categoryData: { dimension: string; value: number }[]
  currencySymbol: string
}

export default function ProductsCharts({ chartData, categoryData, currencySymbol }: ProductsChartsProps) {
  const pieData = categoryData.map((c, i) => ({
    name: c.dimension,
    value: c.value,
    fill: COLORS[i % COLORS.length]
  }))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* Top Products Chart */}
      <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-5">
        <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-4">Top 10 Products by Revenue</h3>
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
                  tick={{ fontSize: 10, fill: '#1d1d1f' }}
                  tickLine={false}
                  axisLine={false}
                  width={140}
                />
                <Tooltip
                  formatter={(value: number | undefined, name, props) => [
                    `${currencySymbol}${(value ?? 0).toLocaleString()} (${props.payload.count} units)`,
                    'Revenue'
                  ]}
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb'
                  }}
                />
                <Bar dataKey="value" fill="#ff9500" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-[#86868b]">
              No product data available
            </div>
          )}
        </div>
      </div>

      {/* Category Distribution */}
      <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-5">
        <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-4">Sales by Category</h3>
        <div className="h-80">
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
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
              No category data available
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
