import { NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { requireTenantAuth, isErrorResponse } from '@/lib/tenantGuard'

export async function GET() {
  const session = await requireTenantAuth()
  if (isErrorResponse(session)) return session

  if (session.role !== 'owner' && session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const client = await clerkClient()

    const allUsers = await client.users.getUserList({ limit: 100 })

    const teamMembers = allUsers.data.filter((u) => {
      const meta = u.publicMetadata as Record<string, unknown>
      return meta.companyId === session.companyId
    })

    const members = teamMembers.map((u) => ({
      id: u.id,
      email: u.emailAddresses[0]?.emailAddress || '',
      name: `${u.firstName || ''} ${u.lastName || ''}`.trim(),
      role: (u.publicMetadata as Record<string, unknown>).role || 'member',
      imageUrl: u.imageUrl,
      createdAt: u.createdAt,
      lastSignInAt: u.lastSignInAt,
    }))

    const invitations = await client.invitations.getInvitationList({ limit: 50 })
    const pendingInvites = invitations.data
      .filter((inv) => {
        const meta = inv.publicMetadata as Record<string, unknown>
        return meta.companyId === session.companyId && inv.status === 'pending'
      })
      .map((inv) => ({
        id: inv.id,
        email: inv.emailAddress,
        role: (inv.publicMetadata as Record<string, unknown>).role || 'member',
        status: inv.status,
        createdAt: inv.createdAt,
      }))

    return NextResponse.json({ members, pendingInvites })
  } catch (error) {
    console.error('[API] team list error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
