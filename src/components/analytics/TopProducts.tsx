'use client'

import { DimensionData } from '@/types/analytics'
import { useLocalization } from '@/hooks/useLocalization'
import { Package, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface TopProductsProps {
  data: DimensionData[]
  loading?: boolean
}

export function TopProducts({ data, loading }: TopProductsProps) {
  const { currencySymbol } = useLocalization()

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-5">
        <div className="h-5 bg-[#f5f5f7] rounded w-32 mb-4 animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-12 bg-[#f5f5f7] rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const total = data.reduce((sum, d) => sum + d.value, 0)

  return (
    <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[15px] font-semibold text-[#1d1d1f]">Top Products</h3>
        <Link 
          href="/reports/products"
          className="text-[12px] text-[#0071e3] hover:underline flex items-center gap-1"
        >
          View all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 bg-[#f5f5f7] rounded-xl flex items-center justify-center mb-3">
            <Package className="w-6 h-6 text-[#86868b]" />
          </div>
          <p className="text-[13px] text-[#86868b]">No product data yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.slice(0, 5).map((product, i) => {
            const percentage = total > 0 ? (product.value / total) * 100 : 0
            return (
              <div key={i} className="group">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[11px] font-medium text-[#86868b] w-5">#{i + 1}</span>
                    <span className="text-[13px] font-medium text-[#1d1d1f] truncate">
                      {product.dimension}
                    </span>
                  </div>
                  <span className="text-[13px] font-semibold text-[#1d1d1f] flex-shrink-0 ml-2">
                    {currencySymbol}{product.value.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-[#f5f5f7] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#ff9500] rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-[#86868b] w-12 text-right">
                    {product.count} sold
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
