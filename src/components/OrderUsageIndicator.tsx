'use client'

import { usePlan } from '@/hooks/usePlan'
import { UNLIMITED } from '@/lib/plans'
import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'

interface OrderUsageIndicatorProps {
  monthlyOrderCount: number
}

export function OrderUsageIndicator({ monthlyOrderCount }: OrderUsageIndicatorProps) {
  const { getLimit, hasReachedLimit } = usePlan()
  
  const limit = getLimit('orders_per_month')
  const isUnlimited = limit === UNLIMITED
  const isReached = hasReachedLimit('orders_per_month', monthlyOrderCount)
  const percentage = isUnlimited ? 0 : (monthlyOrderCount / limit) * 100
  const isWarning = percentage >= 80

  if (isUnlimited) {
    return null
  }

  return (
    <span className={`ml-2 ${isReached ? 'text-[#ff3b30]' : isWarning ? 'text-[#ff9500]' : 'text-[#86868b]'}`}>
      • {monthlyOrderCount}/{limit} this month
      {isReached && (
        <Link 
          href="/settings/subscription"
          className="inline-flex items-center gap-1 ml-2 text-[12px] text-[#ff3b30] hover:text-[#ff2d20]"
        >
          <AlertTriangle className="w-3 h-3" />
          Upgrade
        </Link>
      )}
    </span>
  )
}
