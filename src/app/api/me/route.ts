import { NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { getApiSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getApiSession()
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const client = await clerkClient()
    const user = await client.users.getUser(session.userId)
    const metadata = user.publicMetadata as Record<string, unknown>
    
    return NextResponse.json({
      userId: session.userId,
      email: user.emailAddresses[0]?.emailAddress ?? '',
      name: user.fullName ?? user.firstName ?? user.emailAddresses[0]?.emailAddress ?? '',
      role: (metadata.role as string | undefined) ?? 'ADMIN',
      companyId: session.companyId,
      companyName: metadata.companyName as string | undefined,
    })
  } catch (error) {
    console.error('Failed to get session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
