import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTenantAuth, isErrorResponse } from '@/lib/tenantGuard'
import { prisma } from '@/lib/prisma'

const updateSchema = z.object({
  sessionDurationDays: z.enum(['1', '7', '15', '30']).transform(Number).optional(),
})

export async function GET() {
  const session = await requireTenantAuth()
  if (isErrorResponse(session)) return session

  const user = await prisma.user.findFirst({
    where: { email: session.email, companyId: session.companyId },
    select: { sessionDurationDays: true },
  })

  return NextResponse.json({
    sessionDurationDays: user?.sessionDurationDays ?? 7,
  })
}

export async function PUT(req: Request) {
  const session = await requireTenantAuth()
  if (isErrorResponse(session)) return session

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  if (parsed.data.sessionDurationDays !== undefined) {
    await prisma.user.updateMany({
      where: { email: session.email, companyId: session.companyId },
      data: { sessionDurationDays: parsed.data.sessionDurationDays },
    })
  }

  return NextResponse.json({ success: true })
}
