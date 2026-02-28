import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getCachedSession, getStaleCachedSession, setCachedSession } from '@/lib/sessionCache'

export interface TenantSession {
  userId: string
  companyId: string
  role: string
  email?: string
}

/**
 * Centralized tenant authentication guard.
 * Fast path: reads from JWT claims (no network call).
 * Slow path: falls back to Clerk API when claims are missing.
 * NEVER trust companyId from the request body.
 */
export async function requireTenantAuth(): Promise<TenantSession | NextResponse> {
  const { userId, sessionClaims } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fast path: read from JWT claims (no network call)
  const claims = (sessionClaims?.metadata as Record<string, unknown>) || {}
  const companyIdFromClaims = claims.companyId as string | undefined
  if (companyIdFromClaims) {
    const session = {
      userId,
      companyId: companyIdFromClaims,
      role: normalizeRole((claims.role as string | undefined) ?? 'ADMIN'),
    }
    setCachedSession(userId, session)
    return session
  }

  // Cache path: avoid hitting Clerk API on every request
  const cached = getCachedSession(userId)
  if (cached) {
    return { userId, companyId: cached.companyId, role: normalizeRole(cached.role ?? 'ADMIN'), email: cached.email }
  }

  // Slow path: JWT not yet refreshed — call Clerk API
  try {
    const client = await clerkClient()
    const user = await client.users.getUser(userId)
    const metadata = user.publicMetadata as Record<string, unknown>
    const companyId = metadata.companyId as string | undefined

    if (!companyId) {
      console.error('[requireTenantAuth] No companyId in metadata for userId:', userId)
      return NextResponse.json({ error: 'No company associated with this account' }, { status: 403 })
    }

    const session = {
      userId,
      companyId,
      role: normalizeRole((metadata.role as string | undefined) ?? 'ADMIN'),
      email: user.emailAddresses[0]?.emailAddress,
    }
    setCachedSession(userId, session)
    return session
  } catch (err) {
    console.error('[requireTenantAuth] Clerk API error for userId:', userId, err)
    // Last resort: use stale cache rather than false Unauthorized
    const stale = getStaleCachedSession(userId)
    if (stale) {
      console.warn('[requireTenantAuth] Using stale cache for userId:', userId)
      return { userId, companyId: stale.companyId, role: normalizeRole(stale.role ?? 'ADMIN'), email: stale.email }
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

/**
 * Normalizes legacy/onboarding roles to standard role names.
 * 'owner' → 'ADMIN' (full access), 'member' → 'COMMERCIAL'
 */
function normalizeRole(role: string): string {
  if (role === 'owner') return 'ADMIN'
  if (role === 'member') return 'COMMERCIAL'
  return role
}

/**
 * Type guard to check if requireTenantAuth returned an error response.
 */
export function isErrorResponse(
  result: TenantSession | NextResponse
): result is NextResponse {
  return result instanceof NextResponse
}
