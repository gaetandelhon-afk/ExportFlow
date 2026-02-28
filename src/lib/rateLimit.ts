/**
 * In-memory sliding-window rate limiter.
 *
 * Works on Vercel Edge/Serverless. For production at scale,
 * replace with @upstash/ratelimit + Vercel KV.
 */

interface RateLimitEntry {
  timestamps: number[]
}

const store = new Map<string, RateLimitEntry>()

const CLEANUP_INTERVAL = 60_000
let lastCleanup = Date.now()

function cleanup(windowMs: number) {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now

  for (const [key, entry] of store.entries()) {
    entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs)
    if (entry.timestamps.length === 0) {
      store.delete(key)
    }
  }
}

interface RateLimitConfig {
  /** Maximum number of requests in the window */
  maxRequests: number
  /** Time window in milliseconds */
  windowMs: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetMs: number
}

export function rateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const { maxRequests, windowMs } = config
  const now = Date.now()

  cleanup(windowMs)

  let entry = store.get(key)
  if (!entry) {
    entry = { timestamps: [] }
    store.set(key, entry)
  }

  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs)

  if (entry.timestamps.length >= maxRequests) {
    const oldestInWindow = entry.timestamps[0]
    return {
      allowed: false,
      remaining: 0,
      resetMs: oldestInWindow + windowMs - now,
    }
  }

  entry.timestamps.push(now)

  return {
    allowed: true,
    remaining: maxRequests - entry.timestamps.length,
    resetMs: windowMs,
  }
}

import { NextResponse } from 'next/server'

/**
 * Pre-configured rate limiters for common API routes.
 */
export const RATE_LIMITS = {
  checkout: { maxRequests: 10, windowMs: 60_000 },
  auth: { maxRequests: 20, windowMs: 60_000 },
  webhooks: { maxRequests: 100, windowMs: 60_000 },
  upload: { maxRequests: 30, windowMs: 60_000 },
  api: { maxRequests: 120, windowMs: 60_000 },
} as const

/**
 * Apply rate limiting to a request. Returns a NextResponse if rate limited,
 * or null if the request should proceed.
 */
export function applyRateLimit(
  identifier: string,
  config: RateLimitConfig
): NextResponse | null {
  const result = rateLimit(identifier, config)

  if (!result.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil(result.resetMs / 1000)),
          'X-RateLimit-Remaining': '0',
        },
      }
    )
  }

  return null
}
