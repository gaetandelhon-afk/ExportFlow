import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/resend'
import { WelcomeEmail } from '@/lib/emails/WelcomeEmail'

const RESERVED_SLUGS = new Set([
  'www', 'app', 'api', 'admin', 'mail', 'dashboard', 'support',
  'help', 'billing', 'login', 'signup', 'blog', 'docs', 'status',
])

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 30)
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { companyName, country, slug: rawSlug, phone } = body

    if (!companyName || !country) {
      return NextResponse.json(
        { error: 'Company name and country are required' },
        { status: 400 }
      )
    }

    const slug = (rawSlug || generateSlug(companyName)).toLowerCase().trim()

    if (slug.length < 3 || slug.length > 30) {
      return NextResponse.json(
        { error: 'Slug must be between 3 and 30 characters' },
        { status: 400 }
      )
    }

    if (!SLUG_REGEX.test(slug)) {
      return NextResponse.json(
        { error: 'Slug can only contain lowercase letters, numbers, and hyphens' },
        { status: 400 }
      )
    }

    if (RESERVED_SLUGS.has(slug)) {
      return NextResponse.json(
        { error: 'This URL is reserved. Please choose another.' },
        { status: 400 }
      )
    }

    const client = await clerkClient()
    const clerkUser = await client.users.getUser(userId)
    const existingMeta = clerkUser.publicMetadata as Record<string, unknown>

    // If user already completed onboarding (retry after partial failure), reuse company
    if (existingMeta.onboardingComplete && existingMeta.companyId) {
      return NextResponse.json({
        success: true,
        companyId: existingMeta.companyId,
        slug: existingMeta.companySlug || slug,
      })
    }

    const now = new Date()
    const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

    // Check if slug is taken by another company
    let company: { id: string } | null = null
    try {
      const existing = await prisma.company.findUnique({ where: { slug }, select: { id: true } })
      if (existing) {
        // Check if this was a previous partial attempt by this user
        const userRecord = await prisma.user.findFirst({
          where: { companyId: existing.id, email: clerkUser.emailAddresses?.[0]?.emailAddress },
          select: { id: true },
        })
        if (userRecord) {
          company = existing
        } else {
          return NextResponse.json(
            { error: 'This URL is already taken. Please choose another.' },
            { status: 409 }
          )
        }
      }
    } catch {
      // slug field might not exist in DB yet — fall through to create without slug
    }

    if (!company) {
      try {
        company = await prisma.company.create({
          data: {
            name: companyName,
            slug,
            trialStartedAt: now,
            trialEndsAt: trialEnd,
            subscriptionStatus: 'trialing',
          },
        })
      } catch (createErr: unknown) {
        // If slug column doesn't exist, create without it
        if (createErr instanceof Error && createErr.message.includes('Unknown argument')) {
          company = await prisma.company.create({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data: { name: companyName } as any,
          })
        } else {
          throw createErr
        }
      }
    }

    const ownerEmail = clerkUser.emailAddresses?.[0]?.emailAddress
    const ownerName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || undefined

    await prisma.user.upsert({
      where: { email: ownerEmail || `${userId}@clerk.user` },
      update: { name: ownerName, role: 'ADMIN', companyId: company.id },
      create: {
        email: ownerEmail || `${userId}@clerk.user`,
        name: ownerName,
        role: 'ADMIN',
        companyId: company.id,
      },
    })

    // Save phone number to Clerk user profile if provided
    if (phone) {
      try {
        await client.users.updateUser(userId, {
          // Store phone in unsafeMetadata since Clerk phone numbers require verification
          unsafeMetadata: { phone },
        })
      } catch {
        // Non-critical — don't fail onboarding if phone save fails
      }
    }

    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        plan: 'business',
        companyId: company.id,
        companyName,
        companySlug: slug,
        country,
        phone: phone || undefined,
        role: 'owner',
        onboardingComplete: true,
        subscriptionStatus: 'trialing',
      },
    })

    if (ownerEmail) {
      sendEmail({
        to: ownerEmail,
        subject: `Welcome to ExportFlow, ${companyName}!`,
        react: WelcomeEmail({
          companyName,
          slug,
          dashboardUrl: `https://${slug}.exportflow.io/dashboard`,
        }),
      }).catch((err) => console.error('[Onboarding] Failed to send welcome email:', err))
    }

    return NextResponse.json({
      success: true,
      companyId: company.id,
      slug,
    })
  } catch (error) {
    console.error('Onboarding error:', error)
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'An error occurred during setup', detail: message },
      { status: 500 }
    )
  }
}
