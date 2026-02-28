import { NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { z } from 'zod'
import { requireTenantAuth, isErrorResponse } from '@/lib/tenantGuard'
import { checkLimitNotReached, handlePlanError } from '@/lib/check-plan-session'
import { sendCompanyEmail } from '@/lib/resend'
import { TeamInviteEmail } from '@/lib/emails/TeamInviteEmail'
import { prisma } from '@/lib/prisma'

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['member', 'owner']).default('member'),
})

export async function POST(req: Request) {
  const session = await requireTenantAuth()
  if (isErrorResponse(session)) return session

  if (session.role !== 'owner' && session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Only owners can invite team members' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const parsed = inviteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { email, role } = parsed.data

    // Check plan limits for team members
    const client = await clerkClient()
    const allUsers = await client.users.getUserList({ limit: 100 })
    const currentTeamCount = allUsers.data.filter((u) => {
      const meta = u.publicMetadata as Record<string, unknown>
      return meta.companyId === session.companyId
    }).length

    try {
      await checkLimitNotReached('team_members', currentTeamCount)
    } catch (planError) {
      return handlePlanError(planError)
    }

    const invitation = await client.invitations.createInvitation({
      emailAddress: email,
      publicMetadata: {
        companyId: session.companyId,
        role,
      },
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://exportflow.io'}/sign-up`,
    })

    // Send custom invite email via Resend
    const company = await prisma.company.findUnique({
      where: { id: session.companyId },
      select: { name: true, slug: true },
    })

    if (company) {
      const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://exportflow.io'}/sign-up?__clerk_ticket=${invitation.id}`
      await sendCompanyEmail(
        session.companyId,
        email,
        `You're invited to join ${company.name} on ExportFlow`,
        TeamInviteEmail({
          inviterName: session.email || 'A team member',
          companyName: company.name,
          inviteUrl,
        })
      )
    }

    return NextResponse.json({ success: true, invitationId: invitation.id })
  } catch (error) {
    console.error('[API] team invite error:', error)
    return NextResponse.json({ error: 'Failed to send invitation' }, { status: 500 })
  }
}
