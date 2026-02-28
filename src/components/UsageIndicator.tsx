'use client'

import { usePlan } from '@/hooks/usePlan'
import { FeatureName, UNLIMITED } from '@/lib/plans'
import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'

interface UsageIndicatorProps {
  feature: FeatureName
  currentCount: number
  label: string
  showWarningAt?: number
}

export function UsageIndicator({ 
  feature, 
  currentCount, 
  label,
  showWarningAt = 80 
}: UsageIndicatorProps) {
  const { getLimit, hasReachedLimit } = usePlan()
  
  const limit = getLimit(feature)
  const isUnlimited = limit === UNLIMITED
  const percentage = isUnlimited ? 0 : (currentCount / limit) * 100
  const isWarning = percentage >= showWarningAt
  const isReached = hasReachedLimit(feature, currentCount)

  if (isUnlimited) {
    return (
      <span className="text-[13px] text-[#86868b]">
        {currentCount} {label}
      </span>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className={`text-[13px] ${isReached ? 'text-[#ff3b30]' : isWarning ? 'text-[#ff9500]' : 'text-[#86868b]'}`}>
        {currentCount}/{limit} {label}
      </span>
      {isReached && (
        <Link 
          href="/settings/subscription"
          className="inline-flex items-center gap-1 text-[12px] text-[#ff3b30] hover:text-[#ff2d20]"
        >
          <AlertTriangle className="w-3 h-3" />
          Upgrade
        </Link>
      )}
    </div>
  )
}

interface UsageBarProps {
  feature: FeatureName
  currentCount: number
  label: string
  className?: string
}

export function UsageBar({ feature, currentCount, label, className = '' }: UsageBarProps) {
  const { getLimit } = usePlan()
  
  const limit = getLimit(feature)
  const isUnlimited = limit === UNLIMITED
  const percentage = isUnlimited ? 0 : Math.min((currentCount / limit) * 100, 100)
  
  const getBarColor = () => {
    if (percentage >= 100) return 'bg-[#ff3b30]'
    if (percentage >= 80) return 'bg-[#ff9500]'
    return 'bg-[#34c759]'
  }

  if (isUnlimited) {
    return (
      <div className={`${className}`}>
        <div className="flex justify-between text-[12px] mb-1">
          <span className="text-[#86868b]">{label}</span>
          <span className="text-[#1d1d1f] font-medium">{currentCount} (unlimited)</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`${className}`}>
      <div className="flex justify-between text-[12px] mb-1">
        <span className="text-[#86868b]">{label}</span>
        <span className="text-[#1d1d1f] font-medium">{currentCount}/{limit}</span>
      </div>
      <div className="h-2 bg-[#f5f5f7] rounded-full overflow-hidden">
        <div 
          className={`h-full ${getBarColor()} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
