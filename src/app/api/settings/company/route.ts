import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTenantAuth, isErrorResponse } from '@/lib/tenantGuard'
import { prisma } from '@/lib/prisma'
import { createAuditLog, computeChanges } from '@/lib/auditLog'

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  senderEmail: z.string().email().optional().nullable(),
  currency: z.string().min(1).max(10).optional(),
})

export async function GET() {
  const session = await requireTenantAuth()
  if (isErrorResponse(session)) return session

  const company = await prisma.company.findUnique({
    where: { id: session.companyId },
    select: {
      id: true,
      name: true,
      slug: true,
      currency: true,
      senderEmail: true,
      customDomain: true,
      subscriptionStatus: true,
      trialEndsAt: true,
      createdAt: true,
    },
  })

  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  return NextResponse.json(company)
}

export async function PUT(req: Request) {
  const session = await requireTenantAuth()
  if (isErrorResponse(session)) return session

  if (session.role !== 'owner' && session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const existing = await prisma.company.findUnique({
    where: { id: session.companyId },
    select: { name: true, senderEmail: true, currency: true },
  })

  const updated = await prisma.company.update({
    where: { id: session.companyId },
    data: parsed.data,
    select: {
      id: true,
      name: true,
      slug: true,
      currency: true,
      senderEmail: true,
    },
  })

  const changes = existing
    ? computeChanges(
        existing as Record<string, unknown>,
        updated as Record<string, unknown>,
        ['name', 'senderEmail', 'currency']
      )
    : null
  await createAuditLog({
    companyId: session.companyId,
    userId: session.userId,
    action: 'UPDATE',
    entityType: 'Settings',
    entityId: session.companyId,
    changes: changes ?? undefined,
    metadata: { slug: updated.slug },
    request: req,
  })

  return NextResponse.json(updated)
}
