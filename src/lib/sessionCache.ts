/**
 * Shared in-memory cache for Clerk session lookups.
 * Prevents repeated API calls when JWT claims don't yet include companyId
 * (e.g. right after onboarding, before the JWT is refreshed).
 *
 * TTL: 5 minutes. Safe to use in both API routes and server components.
 * In serverless environments, this caches within a single warm function instance.
 */

interface CachedEntry {
  companyId: string
  role?: string
  email?: string
  expiry: number
}

const _cache = new Map<string, CachedEntry>()
const TTL_MS = 5 * 60 * 1000 // 5 minutes

export function getCachedSession(userId: string): CachedEntry | null {
  const entry = _cache.get(userId)
  if (entry && entry.expiry > Date.now()) return entry
  return null
}

export function getStaleCachedSession(userId: string): CachedEntry | null {
  return _cache.get(userId) ?? null
}

export function setCachedSession(
  userId: string,
  data: { companyId: string; role?: string; email?: string }
) {
  _cache.set(userId, { ...data, expiry: Date.now() + TTL_MS })
}
