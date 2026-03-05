import { auth, currentUser, clerkClient } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { getCachedSession, getStaleCachedSession, setCachedSession } from '@/lib/sessionCache'

export type Plan = 'starter' | 'pro' | 'business' | 'enterprise'

export interface UserMetadata {
  plan?: Plan
  companyId?: string
  companyName?: string
  country?: string
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  onboardingComplete?: boolean
}

export interface AuthenticatedUser {
  id: string
  clerkId: string
  email: string
  firstName: string | null
  lastName: string | null
  fullName: string | null
  imageUrl: string
  plan: Plan
  companyId: string | null
  companyName: string | null
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  onboardingComplete: boolean
}

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  let user
  try {
    user = await currentUser()
  } catch {
    // currentUser() makes a network call to Clerk API (requires CLERK_SECRET_KEY).
    // If unavailable (missing env var, network issue, etc.), fall back gracefully.
    return null
  }
  
  if (!user) {
    return null
  }

  const metadata = (user.publicMetadata || {}) as UserMetadata

  return {
    id: user.id,
    clerkId: user.id,
    email: user.emailAddresses[0]?.emailAddress || '',
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: user.fullName,
    imageUrl: user.imageUrl,
    plan: metadata.plan || 'starter',
    companyId: metadata.companyId || null,
    companyName: metadata.companyName || null,
    stripeCustomerId: metadata.stripeCustomerId || null,
    stripeSubscriptionId: metadata.stripeSubscriptionId || null,
    onboardingComplete: metadata.onboardingComplete || false,
  }
}

export async function requireAuth(): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser()
  
  if (!user) {
    throw new Error('Unauthorized')
  }
  
  return user
}

export interface DashboardSession {
  userId: string
  companyId: string
  plan: Plan
  role: string
}

/**
 * Safe session getter for server components.
 * Reads metadata from JWT sessionClaims (no network call).
 * Falls back to Clerk API only if claims are missing (first login after onboarding).
 */
export async function getDashboardSession(): Promise<DashboardSession | null> {
  const { userId, sessionClaims } = await auth()
  if (!userId) return null

  // Fast path: read from JWT claims (no network call)
  const claims = (sessionClaims?.metadata as Record<string, unknown>) || {}
  let companyId = claims.companyId as string | undefined
  let plan = (claims.plan as Plan) || undefined
  let role = (claims.role as string) || undefined

  // Slow path: only if claims are empty (e.g. right after onboarding before JWT refresh)
  if (!companyId) {
    try {
      const client = await clerkClient()
      const user = await client.users.getUser(userId)
      const meta = (user.publicMetadata || {}) as Record<string, unknown>
      companyId = meta.companyId as string | undefined
      plan = (meta.plan as Plan) || undefined
      role = (meta.role as string) || undefined
    } catch {
      return null
    }
  }

  if (!companyId) return null

  return {
    userId,
    companyId,
    plan: plan || 'starter',
    role: role || 'owner',
  }
}

export interface ApiSession {
  userId: string
  companyId: string
  role?: string
  email?: string
}

/**
 * Reliable session getter for API routes.
 * Returns { userId, companyId } only when BOTH are confirmed.
 * Returns null if not authenticated or companyId is missing.
 *
 * Fast path: reads companyId from JWT sessionClaims (no network call).
 * Slow path: falls back to Clerk API if claims are empty or missing companyId.
 */
export async function getApiSession(): Promise<ApiSession | null> {
  const { userId, sessionClaims } = await auth()

  if (!userId) return null

  // Fast path: read companyId + role from JWT claims (no network call)
  const claims = (sessionClaims?.metadata as Record<string, unknown>) || {}
  const companyIdFromClaims = claims.companyId as string | undefined
  if (companyIdFromClaims) {
    const session = {
      userId,
      companyId: companyIdFromClaims,
      role: normalizeRole((claims.role as string) || undefined),
    }
    setCachedSession(userId, session)
    return session
  }

  // Cache path: avoid hitting Clerk API on every request when JWT claims are empty
  const cached = getCachedSession(userId)
  if (cached) {
    return { userId, companyId: cached.companyId, role: cached.role, email: cached.email }
  }

  // Slow path: JWT claims don't have companyId yet (first login / JWT not refreshed)
  try {
    const client = await clerkClient()
    const user = await client.users.getUser(userId)
    const metadata = (user.publicMetadata || {}) as Record<string, unknown>
    const companyId = metadata.companyId as string | undefined
    if (!companyId) return null
    const session = {
      userId,
      companyId,
      role: normalizeRole((metadata.role as string) || undefined),
      email: user.emailAddresses[0]?.emailAddress,
    }
    setCachedSession(userId, session)
    return session
  } catch (err) {
    console.error('[getApiSession] Clerk API error for userId:', userId, err)
    // Last resort: use stale cache rather than returning false Unauthorized
    const stale = getStaleCachedSession(userId)
    if (stale) {
      console.warn('[getApiSession] Using stale cache for userId:', userId)
      return { userId, companyId: stale.companyId, role: stale.role, email: stale.email }
    }
    return null
  }
}

/**
 * Normalizes legacy/onboarding roles to the standard role names used in checks.
 * 'owner' is treated as 'ADMIN' (full access to all tenant resources).
 * 'member' is treated as 'COMMERCIAL' (standard staff access).
 */
function normalizeRole(role: string | undefined): string | undefined {
  if (!role) return undefined
  if (role === 'owner') return 'ADMIN'
  if (role === 'member') return 'COMMERCIAL'
  return role
}

export async function getCompanyForUser(clerkUserId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const company = await prisma.company.findFirst({
    where: { clerkUserId } as any,
  })
  
  return company
}

export async function getUserPlan(): Promise<Plan> {
  const user = await getAuthenticatedUser()
  return user?.plan || 'starter'
}

export function canAccessFeature(plan: Plan, feature: string): boolean {
  const featureAccess: Record<string, Plan[]> = {
    'basic_orders': ['starter', 'pro', 'business', 'enterprise'],
    'product_catalog': ['starter', 'pro', 'business', 'enterprise'],
    'basic_reports': ['starter', 'pro', 'business', 'enterprise'],
    'advanced_reports': ['pro', 'business', 'enterprise'],
    'api_access': ['pro', 'business', 'enterprise'],
    'team_members': ['business', 'enterprise'],
    'custom_branding': ['business', 'enterprise'],
    'priority_support': ['business', 'enterprise'],
    'dedicated_account': ['enterprise'],
    'custom_integrations': ['enterprise'],
    'sla_guarantee': ['enterprise'],
  }

  const allowedPlans = featureAccess[feature]
  
  if (!allowedPlans) {
    return false
  }
  
  return allowedPlans.includes(plan)
}

export function getPlanLimits(plan: Plan) {
  const limits: Record<Plan, {
    maxProducts: number
    maxOrders: number
    maxTeamMembers: number
    maxCustomers: number
  }> = {
    starter: {
      maxProducts: 100,
      maxOrders: 50,
      maxTeamMembers: 1,
      maxCustomers: 20,
    },
    pro: {
      maxProducts: 1000,
      maxOrders: 500,
      maxTeamMembers: 3,
      maxCustomers: 100,
    },
    business: {
      maxProducts: 10000,
      maxOrders: 5000,
      maxTeamMembers: 10,
      maxCustomers: 500,
    },
    enterprise: {
      maxProducts: Infinity,
      maxOrders: Infinity,
      maxTeamMembers: Infinity,
      maxCustomers: Infinity,
    },
  }

  return limits[plan]
}
