import { NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

async function requireSuperadmin() {
  const { userId } = await auth()
  if (!userId) return null

  const client = await clerkClient()
  const user = await client.users.getUser(userId)
  const role = user.publicMetadata?.role as string | undefined

  if (role !== 'superadmin') return null
  return { userId }
}

export async function GET(req: Request) {
  const admin = await requireSuperadmin()
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || ''
  const page = parseInt(searchParams.get('page') || '1')
  const limit = 20

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { slug: { contains: search, mode: 'insensitive' as const } },
        ],
      }
    : {}

  const [companies, total] = await Promise.all([
    prisma.company.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        subscriptionStatus: true,
        isActive: true,
        trialStartedAt: true,
        trialEndsAt: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
            orders: true,
            products: true,
            customers: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.company.count({ where }),
  ])

  const enriched = companies.map((c) => ({
    ...c,
    trialDaysRemaining: c.trialEndsAt
      ? Math.max(0, Math.ceil((c.trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : null,
  }))

  return NextResponse.json({
    companies: enriched,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  })
}
