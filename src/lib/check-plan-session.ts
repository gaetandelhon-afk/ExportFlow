import { auth, clerkClient } from '@clerk/nextjs/server'
import { 
  PlanName, 
  FeatureName, 
  canUse, 
  getLimit, 
  hasReachedLimit,
  getMinimumPlanFor,
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

async function getUserPlanFromSession(): Promise<PlanName> {
  const { userId, sessionClaims } = await auth()
  if (!userId) return 'starter'

  // Fast path: read from JWT claims
  const claims = (sessionClaims?.metadata as Record<string, unknown>) || {}
  const planFromClaims = claims.plan as PlanName | undefined
  if (planFromClaims) return planFromClaims

  // Slow path: JWT not refreshed yet
  try {
    const client = await clerkClient()
    const user = await client.users.getUser(userId)
    return (user.publicMetadata?.plan as PlanName) || 'starter'
  } catch {
    return 'starter'
  }
}

export async function checkFeatureAccess(feature: FeatureName): Promise<void> {
  const plan = await getUserPlanFromSession()
  
  if (!canUse(plan, feature)) {
    const requiredPlan = getMinimumPlanFor(feature)
    throw new PlanError(
      `This feature requires the ${requiredPlan} plan`,
      requiredPlan
    )
  }
}

export async function checkLimitNotReached(
  feature: FeatureName, 
  currentCount: number
): Promise<void> {
  const plan = await getUserPlanFromSession()
  
  if (hasReachedLimit(plan, feature, currentCount)) {
    const limit = getLimit(plan, feature)
    throw new LimitError(
      `Limite atteinte: ${currentCount}/${limit} ${feature.replace(/_/g, ' ')}`,
      limit,
      currentCount
    )
  }
}

export async function getCurrentPlan(): Promise<PlanName> {
  return getUserPlanFromSession()
}

export async function getRemainingQuota(
  feature: FeatureName, 
  currentCount: number
): Promise<{ limit: number; used: number; remaining: number; unlimited: boolean }> {
  const plan = await getUserPlanFromSession()
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
