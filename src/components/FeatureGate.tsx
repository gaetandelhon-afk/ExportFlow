'use client'

import { ReactNode } from 'react'
import { usePlan } from '@/hooks/usePlan'
import { UpgradeBanner } from '@/components/UpgradeBanner'
import { FeatureName, PlanName, PLAN_HIERARCHY, getMinimumPlanFor } from '@/lib/plans'
import { Lock } from 'lucide-react'

interface FeatureGateProps {
  feature: FeatureName
  requiredPlan?: PlanName
  children: ReactNode
  fallback?: ReactNode
  showBanner?: boolean
  featureLabel?: string
}

export function FeatureGate({
  feature,
  requiredPlan,
  children,
  fallback,
  showBanner = true,
  featureLabel,
}: FeatureGateProps) {
  const { plan, canUse, isLoading } = usePlan()

  if (isLoading) {
    return null
  }

  const minimumPlan = requiredPlan || getMinimumPlanFor(feature)
  const hasAccess = canUse(feature) || 
    (requiredPlan && PLAN_HIERARCHY.indexOf(plan) >= PLAN_HIERARCHY.indexOf(requiredPlan))

  if (hasAccess) {
    return <>{children}</>
  }

  if (fallback) {
    return <>{fallback}</>
  }

  if (showBanner) {
    return <UpgradeBanner requiredPlan={minimumPlan} feature={featureLabel} />
  }

  return null
}

interface LimitGateProps {
  feature: FeatureName
  currentCount: number
  children: ReactNode
  fallback?: ReactNode
  showBanner?: boolean
  featureLabel?: string
}

export function LimitGate({
  feature,
  currentCount,
  children,
  fallback,
  showBanner = true,
  featureLabel,
}: LimitGateProps) {
  const { plan, hasReachedLimit, getMinimumPlan, getLimit, isLoading } = usePlan()

  if (isLoading) {
    return null
  }

  const limitReached = hasReachedLimit(feature, currentCount)

  if (!limitReached) {
    return <>{children}</>
  }

  if (fallback) {
    return <>{fallback}</>
  }

  if (showBanner) {
    const currentLimit = getLimit(feature)
    const nextPlan = getNextPlanWithHigherLimit(plan, feature, currentLimit)
    
    return (
      <UpgradeBanner 
        requiredPlan={nextPlan} 
        feature={featureLabel || `plus de ${feature.replace(/_/g, ' ')}`} 
      />
    )
  }

  return null
}

function getNextPlanWithHigherLimit(currentPlan: PlanName, feature: FeatureName, currentLimit: number): PlanName {
  const currentIndex = PLAN_HIERARCHY.indexOf(currentPlan)
  
  for (let i = currentIndex + 1; i < PLAN_HIERARCHY.length; i++) {
    const plan = PLAN_HIERARCHY[i]
    const { getLimit } = require('@/lib/plans')
    const limit = getLimit(plan, feature)
    
    if (limit > currentLimit) {
      return plan
    }
  }
  
  return 'enterprise'
}

interface LockedFeatureProps {
  requiredPlan: PlanName
  children: ReactNode
  className?: string
}

export function LockedFeature({ requiredPlan, children, className = '' }: LockedFeatureProps) {
  const { plan, isLoading } = usePlan()

  if (isLoading) {
    return null
  }

  const hasAccess = PLAN_HIERARCHY.indexOf(plan) >= PLAN_HIERARCHY.indexOf(requiredPlan)

  if (hasAccess) {
    return <>{children}</>
  }

  return (
    <div className={`relative ${className}`}>
      <div className="opacity-50 pointer-events-none select-none">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[1px] rounded-lg">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full text-sm text-slate-600">
          <Lock className="w-3.5 h-3.5" />
          Plan {requiredPlan} requis
        </div>
      </div>
    </div>
  )
}
