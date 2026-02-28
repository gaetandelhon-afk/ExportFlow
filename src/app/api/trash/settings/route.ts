import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireTenantAuth, isErrorResponse } from '@/lib/tenantGuard'
import { validateBody, isValidationError, trashSettingsSchema } from '@/lib/validation'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rateLimit'

export async function GET() {
  try {
    const session = await requireTenantAuth()
    if (isErrorResponse(session)) return session

    const rateLimited = applyRateLimit(`trash-settings:${session.userId}`, RATE_LIMITS.api)
    if (rateLimited) return rateLimited

    const company = await prisma.company.findUnique({
      where: { id: session.companyId },
      select: { trashRetentionDays: true },
    })

    return NextResponse.json({
      retentionDays: company?.trashRetentionDays || 30,
      allowedValues: [15, 30, 60],
    })
  } catch (error) {
    console.error('Get trash settings error:', error)
    return NextResponse.json({ error: 'Failed to get settings' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireTenantAuth()
    if (isErrorResponse(session)) return session

    if (session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const rateLimited = applyRateLimit(`trash-settings-update:${session.userId}`, { maxRequests: 10, windowMs: 60_000 })
    if (rateLimited) return rateLimited

    const validated = await validateBody(request, trashSettingsSchema)
    if (isValidationError(validated)) return validated

    await prisma.company.update({
      where: { id: session.companyId },
      data: { trashRetentionDays: validated.retentionDays },
    })

    return NextResponse.json({ success: true, retentionDays: validated.retentionDays })
  } catch (error) {
    console.error('Update trash settings error:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
