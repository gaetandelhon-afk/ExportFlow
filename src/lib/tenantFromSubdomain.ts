import { prisma } from '@/lib/prisma'

const RESERVED_SUBDOMAINS = new Set([
  'www', 'app', 'api', 'admin', 'mail', 'dashboard', 'support',
  'help', 'billing', 'login', 'signup', 'blog', 'docs', 'status',
])

interface TenantInfo {
  companyId: string
  companyName: string
  slug: string
  customDomain: string | null
  senderEmail: string | null
  subscriptionStatus: string
  isActive: boolean
  trialEndsAt: Date | null
  accessUntil: Date | null
}

const cache = new Map<string, { data: TenantInfo | null; expiry: number }>()
const CACHE_TTL_MS = 60_000

export function isReservedSubdomain(sub: string): boolean {
  return RESERVED_SUBDOMAINS.has(sub.toLowerCase())
}

export async function getTenantFromHostname(hostname: string): Promise<TenantInfo | null> {
  const slug = extractSubdomain(hostname)

  if (slug && !isReservedSubdomain(slug)) {
    return lookupBySlug(slug)
  }

  return lookupByCustomDomain(hostname)
}

function extractSubdomain(hostname: string): string | null {
  const host = hostname.toLowerCase().replace(/:\d+$/, '')

  if (host.endsWith('.exportflow.io')) {
    const parts = host.replace('.exportflow.io', '').split('.')
    if (parts.length === 1 && parts[0]) {
      return parts[0]
    }
  }

  if (host.endsWith('.localhost') || host.match(/^.+\.localhost$/)) {
    const parts = host.replace('.localhost', '').split('.')
    if (parts.length === 1 && parts[0]) {
      return parts[0]
    }
  }

  return null
}

async function lookupBySlug(slug: string): Promise<TenantInfo | null> {
  const cacheKey = `slug:${slug}`
  const cached = cache.get(cacheKey)
  if (cached && cached.expiry > Date.now()) {
    return cached.data
  }

  const company = await prisma.company.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      customDomain: true,
      senderEmail: true,
      subscriptionStatus: true,
      isActive: true,
      trialEndsAt: true,
      accessUntil: true,
    },
  })

  const result = company
    ? {
        companyId: company.id,
        companyName: company.name,
        slug: company.slug,
        customDomain: company.customDomain,
        senderEmail: company.senderEmail,
        subscriptionStatus: company.subscriptionStatus,
        isActive: company.isActive,
        trialEndsAt: company.trialEndsAt,
        accessUntil: company.accessUntil,
      }
    : null

  cache.set(cacheKey, { data: result, expiry: Date.now() + CACHE_TTL_MS })
  return result
}

async function lookupByCustomDomain(hostname: string): Promise<TenantInfo | null> {
  const domain = hostname.toLowerCase().replace(/:\d+$/, '')
  const cacheKey = `domain:${domain}`
  const cached = cache.get(cacheKey)
  if (cached && cached.expiry > Date.now()) {
    return cached.data
  }

  const company = await prisma.company.findFirst({
    where: { customDomain: domain },
    select: {
      id: true,
      name: true,
      slug: true,
      customDomain: true,
      senderEmail: true,
      subscriptionStatus: true,
      isActive: true,
      trialEndsAt: true,
      accessUntil: true,
    },
  })

  const result = company
    ? {
        companyId: company.id,
        companyName: company.name,
        slug: company.slug,
        customDomain: company.customDomain,
        senderEmail: company.senderEmail,
        subscriptionStatus: company.subscriptionStatus,
        isActive: company.isActive,
        trialEndsAt: company.trialEndsAt,
        accessUntil: company.accessUntil,
      }
    : null

  cache.set(cacheKey, { data: result, expiry: Date.now() + CACHE_TTL_MS })
  return result
}

export function invalidateTenantCache(slug: string) {
  cache.delete(`slug:${slug}`)
  for (const [key] of cache) {
    if (key.startsWith('domain:')) {
      const entry = cache.get(key)
      if (entry?.data?.slug === slug) {
        cache.delete(key)
      }
    }
  }
}
