import { clerkClient } from '@clerk/nextjs/server'
import { 
  PlanName, 
  FeatureName, 
  canUse, 
  getLimit, 
  hasReachedLimit,
  getMinimumPlanFor,
  PLAN_HIERARCHY,
} from '@/lib/plans'

export class PlanError extends Error {
  status: number
  code: string
  requiredPlan: PlanName

  constructor(message: string, requiredPlan: PlanName) {
    super(message)
    this.name = 'PlanError'
    this.status = 403
    this.code = 'PLAN_REQUIRED'
    this.requiredPlan = requiredPlan
  }
}

export class LimitError extends Error {
  status: number
  code: string
  limit: number
  current: number

  constructor(message: string, limit: number, current: number) {
    super(message)
    this.name = 'LimitError'
    this.status = 403
    this.code = 'LIMIT_REACHED'
    this.limit = limit
    this.current = current
  }
}

async function getUserPlan(userId: string): Promise<PlanName> {
  const client = await clerkClient()
  const user = await client.users.getUser(userId)
  return (user.publicMetadata?.plan as PlanName) || 'starter'
}

export async function checkFeatureAccess(userId: string, feature: FeatureName): Promise<void> {
  const plan = await getUserPlan(userId)
  
  if (!canUse(plan, feature)) {
    const requiredPlan = getMinimumPlanFor(feature)
    throw new PlanError(
      `This feature requires the ${requiredPlan} plan`,
      requiredPlan
    )
  }
}

export async function checkLimitNotReached(
  userId: string, 
  feature: FeatureName, 
  currentCount: number
): Promise<void> {
  const plan = await getUserPlan(userId)
  
  if (hasReachedLimit(plan, feature, currentCount)) {
    const limit = getLimit(plan, feature)
    throw new LimitError(
      `Limite atteinte: ${currentCount}/${limit} ${feature.replace(/_/g, ' ')}`,
      limit,
      currentCount
    )
  }
}

export async function checkPlanLevel(userId: string, requiredPlan: PlanName): Promise<void> {
  const plan = await getUserPlan(userId)
  const currentIndex = PLAN_HIERARCHY.indexOf(plan)
  const requiredIndex = PLAN_HIERARCHY.indexOf(requiredPlan)
  
  if (currentIndex < requiredIndex) {
    throw new PlanError(
      `This feature requires the ${requiredPlan} plan`,
      requiredPlan
    )
  }
}

export async function getRemainingQuota(
  userId: string, 
  feature: FeatureName, 
  currentCount: number
): Promise<{ limit: number; used: number; remaining: number; unlimited: boolean }> {
  const plan = await getUserPlan(userId)
  const limit = getLimit(plan, feature)
  const unlimited = limit === Infinity
  
  return {
    limit: unlimited ? -1 : limit,
    used: currentCount,
    remaining: unlimited ? -1 : Math.max(0, limit - currentCount),
    unlimited,
  }
}

export function handlePlanError(error: unknown): Response {
  if (error instanceof PlanError) {
    return new Response(
      JSON.stringify({
        error: error.message,
        code: error.code,
        requiredPlan: error.requiredPlan,
      }),
      { status: error.status, headers: { 'Content-Type': 'application/json' } }
    )
  }
  
  if (error instanceof LimitError) {
    return new Response(
      JSON.stringify({
        error: error.message,
        code: error.code,
        limit: error.limit,
        current: error.current,
      }),
      { status: error.status, headers: { 'Content-Type': 'application/json' } }
    )
  }
  
  throw error
}
