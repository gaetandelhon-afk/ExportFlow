import { NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const impersonateSchema = z.object({
  companyId: z.string().min(1),
})

async function requireSuperadmin() {
  const { userId } = await auth()
  if (!userId) return null

  const client = await clerkClient()
  const user = await client.users.getUser(userId)
  const role = user.publicMetadata?.role as string | undefined

  if (role !== 'superadmin') return null
  return { userId, user }
}

export async function POST(req: Request) {
  const admin = await requireSuperadmin()
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = impersonateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const { companyId } = parsed.data

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, name: true, slug: true },
  })

  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  // Store impersonation in session metadata (use Clerk custom claims)
  const client = await clerkClient()
  await client.users.updateUserMetadata(admin.userId, {
    publicMetadata: {
      ...admin.user.publicMetadata,
      impersonating: {
        companyId: company.id,
        companyName: company.name,
        companySlug: company.slug,
        startedAt: new Date().toISOString(),
      },
    },
  })

  // Log the impersonation
  await prisma.auditLog.create({
    data: {
      actorId: admin.userId,
      actorType: 'superadmin',
      companyId: company.id,
      action: 'impersonation_started',
      details: {
        companyName: company.name,
        companySlug: company.slug,
      },
    },
  })

  return NextResponse.json({
    success: true,
    redirectUrl: `https://${company.slug}.exportflow.io/dashboard`,
    company: { id: company.id, name: company.name, slug: company.slug },
  })
}

export async function DELETE() {
  const admin = await requireSuperadmin()
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const impersonating = (admin.user.publicMetadata as Record<string, unknown>)?.impersonating as Record<string, unknown> | undefined

  if (impersonating) {
    await prisma.auditLog.create({
      data: {
        actorId: admin.userId,
        actorType: 'superadmin',
        companyId: impersonating.companyId as string,
        action: 'impersonation_ended',
      details: {
        companyName: String(impersonating.companyName || ''),
        duration: Date.now() - new Date(impersonating.startedAt as string).getTime(),
      },
      },
    })
  }

  const client = await clerkClient()
  const meta = { ...admin.user.publicMetadata }
  delete (meta as Record<string, unknown>).impersonating

  await client.users.updateUserMetadata(admin.userId, {
    publicMetadata: meta,
  })

  return NextResponse.json({ success: true })
}
