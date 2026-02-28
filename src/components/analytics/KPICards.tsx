'use client'

import { DashboardKPIs } from '@/types/analytics'
import {
  TrendingUp, TrendingDown, Minus,
  ShoppingCart, DollarSign, Users, CreditCard
} from 'lucide-react'
import { useLocalization } from '@/hooks/useLocalization'

interface KPICardsProps {
  kpis?: DashboardKPIs
  loading?: boolean
}

export function KPICards({ kpis, loading }: KPICardsProps) {
  const { currencySymbol } = useLocalization()

  const cards = [
    {
      title: 'Revenue',
      value: kpis?.totalRevenue || 0,
      change: kpis?.totalRevenueChange || 0,
      format: 'currency' as const,
      icon: DollarSign,
      color: '#0071e3'
    },
    {
      title: 'Orders',
      value: kpis?.totalOrders || 0,
      change: kpis?.totalOrdersChange || 0,
      format: 'number' as const,
      icon: ShoppingCart,
      color: '#34c759',
      subtitle: `${kpis?.pendingOrders || 0} pending`
    },
    {
      title: 'Active Customers',
      value: kpis?.activeCustomers || 0,
      change: kpis?.newCustomersChange || 0,
      format: 'number' as const,
      icon: Users,
      color: '#5856d6',
      subtitle: `${kpis?.newCustomers || 0} new`
    },
    {
      title: 'Payments',
      value: kpis?.paymentsReceived || 0,
      change: kpis?.paymentRate || 0,
      format: 'currency' as const,
      icon: CreditCard,
      color: '#ff9500',
      subtitle: `${kpis?.paymentRate || 0}% collected`
    }
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-5 animate-pulse">
            <div className="h-4 bg-[#f5f5f7] rounded w-24 mb-3" />
            <div className="h-8 bg-[#f5f5f7] rounded w-32 mb-2" />
            <div className="h-3 bg-[#f5f5f7] rounded w-20" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => {
        const Icon = card.icon
        return (
          <div
            key={i}
            className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-5 hover:border-[#d2d2d7] transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] font-medium text-[#86868b]">{card.title}</span>
              <div 
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${card.color}15` }}
              >
                <Icon className="w-5 h-5" style={{ color: card.color }} />
              </div>
            </div>

            <div className="text-[28px] font-semibold text-[#1d1d1f] mb-1">
              {card.format === 'currency'
                ? `${currencySymbol}${formatNumber(card.value)}`
                : formatNumber(card.value)
              }
            </div>

            <div className="flex items-center justify-between">
              <ChangeIndicator value={card.change} />
              {card.subtitle && (
                <span className="text-[12px] text-[#86868b]">{card.subtitle}</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ChangeIndicator({ value }: { value: number }) {
  if (value === 0) {
    return (
      <span className="flex items-center text-[12px] text-[#86868b]">
        <Minus className="w-3 h-3 mr-1" />
        0%
      </span>
    )
  }

  const isPositive = value > 0
  return (
    <span className={`flex items-center text-[12px] font-medium ${
      isPositive ? 'text-[#34c759]' : 'text-[#ff3b30]'
    }`}>
      {isPositive ? (
        <TrendingUp className="w-3 h-3 mr-1" />
      ) : (
        <TrendingDown className="w-3 h-3 mr-1" />
      )}
      {isPositive ? '+' : ''}{value}%
    </span>
  )
}

function formatNumber(value: number): string {
  if (value >= 1000000) {
    return (value / 1000000).toFixed(1) + 'M'
  }
  if (value >= 1000) {
    return (value / 1000).toFixed(1) + 'K'
  }
  return value.toLocaleString()
}
