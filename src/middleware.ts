import { clerkMiddleware, createRouteMatcher, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { locales } from '@/i18n/locales'

const RESERVED_SUBDOMAINS = new Set([
  'www', 'app', 'api', 'admin', 'mail', 'dashboard', 'support',
  'help', 'billing', 'login', 'signup', 'blog', 'docs', 'status',
])

const isPublicRoute = createRouteMatcher([
  '/',
  '/pricing',
  '/about',
  '/auth-redirect',
  ...locales.map((l) => `/${l}(.*)`),
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
  '/api/check-slug(.*)',
  '/api/cron(.*)',
])

const isOnboardingRoute = createRouteMatcher(['/onboarding(.*)'])
const isApiRoute = createRouteMatcher(['/api(.*)'])
const isDashboardRoute = createRouteMatcher(['/dashboard(.*)', '/settings(.*)', '/products(.*)', '/customers(.*)', '/orders(.*)', '/invoices(.*)', '/quotes(.*)', '/shipments(.*)', '/packing-lists(.*)', '/reports(.*)', '/substitutions(.*)', '/payments(.*)'])
const isAdminRoute = createRouteMatcher(['/admin(.*)'])

function extractSubdomain(hostname: string): string | null {
  const host = hostname.toLowerCase().replace(/:\d+$/, '')

  if (host.endsWith('.exportflow.io')) {
    const sub = host.replace('.exportflow.io', '')
    if (sub && !sub.includes('.')) return sub
  }

  if (host.endsWith('.localhost')) {
    const sub = host.replace('.localhost', '')
    if (sub && !sub.includes('.')) return sub
  }

  return null
}

function isMainDomain(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/:\d+$/, '')
  return (
    host === 'exportflow.io' ||
    host === 'www.exportflow.io' ||
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.startsWith('localhost:')
  )
}

async function getUserMetadata(userId: string): Promise<Record<string, unknown> | null> {
  try {
    const client = await clerkClient()
    const user = await client.users.getUser(userId)
    return (user.publicMetadata as Record<string, unknown>) || {}
  } catch (err) {
    console.error('[Middleware] Failed to fetch user metadata from Clerk:', err)
    return null
  }
}

export default clerkMiddleware(async (auth, req) => {
  const hostname = req.headers.get('host') || 'localhost'
  const subdomain = extractSubdomain(hostname)
  const isMain = isMainDomain(hostname)
  const { userId, sessionClaims } = await auth()

  // Try session claims first (fast, no API call), fall back to API if empty
  let metadata = (sessionClaims?.metadata as Record<string, unknown>) || {}

  // If session claims don't have our custom fields, fetch from Clerk API (once)
  let apiFetched = false
  const needsApiFallback = userId && !metadata.companyId && !metadata.onboardingComplete
  if (needsApiFallback && !isPublicRoute(req) && !isOnboardingRoute(req) && !isApiRoute(req)) {
    const freshMeta = await getUserMetadata(userId)
    if (freshMeta) {
      metadata = freshMeta
      apiFetched = true
    }
  }

  const role = (metadata.role as string) || ''
  const companyId = (metadata.companyId as string) || ''
  const companySlug = (metadata.companySlug as string) || ''
  const onboardingComplete = metadata.onboardingComplete as boolean | undefined
  const subscriptionStatus = (metadata.subscriptionStatus as string) || ''

  // --- TENANT SUBDOMAIN ---
  if (subdomain && !RESERVED_SUBDOMAINS.has(subdomain)) {
    const headers = new Headers(req.headers)
    headers.set('x-tenant-slug', subdomain)

    if (isPublicRoute(req) || isApiRoute(req)) {
      return NextResponse.next({ request: { headers } })
    }

    if (!userId) {
      const signInUrl = new URL('/sign-in', req.url)
      signInUrl.searchParams.set('redirect_url', req.url)
      return NextResponse.redirect(signInUrl)
    }

    if (subscriptionStatus === 'expired') {
      const pricingUrl = new URL('/pricing', req.url)
      pricingUrl.searchParams.set('reason', 'trial_ended')
      return NextResponse.redirect(pricingUrl)
    }

    if (subscriptionStatus === 'canceled') {
      const accessUntil = metadata.accessUntil as string | undefined
      if (accessUntil && new Date(accessUntil) < new Date()) {
        const pricingUrl = new URL('/pricing', req.url)
        pricingUrl.searchParams.set('reason', 'subscription_ended')
        return NextResponse.redirect(pricingUrl)
      }
    }

    if (role === 'distributor') {
      if (companySlug !== subdomain) {
        return new NextResponse('Forbidden', { status: 403 })
      }
      if (isDashboardRoute(req)) {
        return NextResponse.redirect(new URL('/', req.url))
      }
    }

    if ((role === 'owner' || role === 'member') && companySlug !== subdomain) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    return NextResponse.next({ request: { headers } })
  }

  // --- MAIN DOMAIN ---
  if (isMain) {
    if (isPublicRoute(req)) {
      return NextResponse.next()
    }

    if (isApiRoute(req)) {
      return NextResponse.next()
    }

    if (!userId) {
      const signInUrl = new URL('/sign-in', req.url)
      signInUrl.searchParams.set('redirect_url', req.url)
      return NextResponse.redirect(signInUrl)
    }

    // Superadmin admin panel
    if (isAdminRoute(req)) {
      if (role !== 'superadmin') {
        return new NextResponse('Forbidden', { status: 403 })
      }
      return NextResponse.next()
    }

    // Onboarding flow — fetch fresh metadata only if not already fetched
    let confirmedOnboarding = onboardingComplete
    if (confirmedOnboarding === undefined && !apiFetched) {
      const freshMeta = await getUserMetadata(userId)
      if (freshMeta) {
        confirmedOnboarding = freshMeta.onboardingComplete as boolean | undefined
      }
    }

    if (!confirmedOnboarding && !isOnboardingRoute(req)) {
      return NextResponse.redirect(new URL('/onboarding', req.url))
    }

    if (confirmedOnboarding && isOnboardingRoute(req)) {
      // Redirect to subdomain dashboard if possible, otherwise use auth-redirect
      if (companySlug) {
        const host = hostname.toLowerCase().replace(/:\d+$/, '')
        const isProd = host === 'exportflow.io' || host === 'www.exportflow.io'
        if (isProd) {
          return NextResponse.redirect(`https://${companySlug}.exportflow.io/dashboard`)
        }
      }
      return NextResponse.redirect(new URL('/auth-redirect', req.url))
    }

    return NextResponse.next()
  }

  // --- CUSTOM DOMAIN ---
  const headers = new Headers(req.headers)
  headers.set('x-custom-domain', hostname.replace(/:\d+$/, ''))

  if (isPublicRoute(req) || isApiRoute(req)) {
    return NextResponse.next({ request: { headers } })
  }

  if (!userId) {
    const signInUrl = new URL('/sign-in', req.url)
    signInUrl.searchParams.set('redirect_url', req.url)
    return NextResponse.redirect(signInUrl)
  }

  return NextResponse.next({ request: { headers } })
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
