import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTenantAuth, isErrorResponse } from '@/lib/tenantGuard'
import { checkFeatureAccess, handlePlanError } from '@/lib/check-plan-session'
import { prisma } from '@/lib/prisma'
import { invalidateTenantCache } from '@/lib/tenantFromSubdomain'

const domainSchema = z.object({
  customDomain: z
    .string()
    .min(4)
    .max(253)
    .regex(
      /^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/,
      'Invalid domain format'
    )
    .nullable(),
})

export async function GET() {
  const session = await requireTenantAuth()
  if (isErrorResponse(session)) return session

  const company = await prisma.company.findUnique({
    where: { id: session.companyId },
    select: {
      slug: true,
      customDomain: true,
    },
  })

  return NextResponse.json(company)
}

export async function PUT(req: Request) {
  const session = await requireTenantAuth()
  if (isErrorResponse(session)) return session

  if (session.role !== 'owner' && session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    await checkFeatureAccess('custom_domain')
  } catch (planError) {
    return handlePlanError(planError)
  }

  const body = await req.json()
  const parsed = domainSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid domain', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { customDomain } = parsed.data

  if (customDomain) {
    const existing = await prisma.company.findFirst({
      where: { customDomain, id: { not: session.companyId } },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'This domain is already in use' },
        { status: 409 }
      )
    }
  }

  const company = await prisma.company.update({
    where: { id: session.companyId },
    data: { customDomain },
    select: { slug: true, customDomain: true },
  })

  invalidateTenantCache(company.slug)

  return NextResponse.json(company)
}
