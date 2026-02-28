'use client'

import { useUser } from '@clerk/nextjs'
import { 
  PlanName, 
  FeatureName, 
  canUse as canUseFeature, 
  getLimit as getFeatureLimit, 
  hasReachedLimit as checkReachedLimit,
  PLAN_FEATURES,
  getMinimumPlanFor,
} from '@/lib/plans'

export interface UsePlanReturn {
  plan: PlanName
  isLoading: boolean
  canUse: (feature: FeatureName) => boolean
  getLimit: (feature: FeatureName) => number
  hasReachedLimit: (feature: FeatureName, currentCount: number) => boolean
  getMinimumPlan: (feature: FeatureName) => PlanName
  features: typeof PLAN_FEATURES[PlanName]
}

export function usePlan(): UsePlanReturn {
  const { user, isLoaded } = useUser()

  const plan = (user?.publicMetadata?.plan as PlanName) || 'starter'

  const canUse = (feature: FeatureName): boolean => {
    return canUseFeature(plan, feature)
  }

  const getLimit = (feature: FeatureName): number => {
    return getFeatureLimit(plan, feature)
  }

  const hasReachedLimit = (feature: FeatureName, currentCount: number): boolean => {
    return checkReachedLimit(plan, feature, currentCount)
  }

  const getMinimumPlan = (feature: FeatureName): PlanName => {
    return getMinimumPlanFor(feature)
  }

  return {
    plan,
    isLoading: !isLoaded,
    canUse,
    getLimit,
    hasReachedLimit,
    getMinimumPlan,
    features: PLAN_FEATURES[plan],
  }
}
