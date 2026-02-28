import { NextResponse } from 'next/server'
import { requireTenantAuth, isErrorResponse } from '@/lib/tenantGuard'
import { prisma } from '@/lib/prisma'
import { sendCompanyEmail } from '@/lib/resend'
import { DistributorInviteEmail } from '@/lib/emails/DistributorInviteEmail'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireTenantAuth()
  if (isErrorResponse(session)) return session

  if (session.role !== 'owner' && session.role !== 'ADMIN' && session.role !== 'COMMERCIAL') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id: customerId } = await params

  try {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, companyId: session.companyId },
      include: { emails: true },
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const company = await prisma.company.findUnique({
      where: { id: session.companyId },
      select: { name: true, slug: true },
    })

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // Collect all emails (primary from customer + additional from CustomerEmail)
    const emailAddresses: string[] = []

    if (customer.email) {
      emailAddresses.push(customer.email)
    }

    for (const ce of customer.emails) {
      if (!emailAddresses.includes(ce.email)) {
        emailAddresses.push(ce.email)
      }
    }

    // Ensure primary email exists in CustomerEmail table
    const existingEmails = await prisma.customerEmail.findMany({
      where: { customerId },
      select: { email: true },
    })
    const existingEmailSet = new Set(existingEmails.map((e) => e.email))

    if (customer.email && !existingEmailSet.has(customer.email)) {
      await prisma.customerEmail.create({
        data: {
          customerId,
          email: customer.email,
          isPrimary: true,
        },
      })
    }

    const portalUrl = `https://${company.slug}.exportflow.io`
    const loginUrl = `${portalUrl}/sign-in`

    let sentCount = 0
    for (const email of emailAddresses) {
      await sendCompanyEmail(
        session.companyId,
        email,
        `${company.name} has invited you to their ordering portal`,
        DistributorInviteEmail({
          companyName: company.name,
          portalUrl,
          loginUrl,
        })
      )
      sentCount++
    }

    return NextResponse.json({ success: true, sentCount, emails: emailAddresses })
  } catch (error) {
    console.error('[API] customer invite error:', error)
    return NextResponse.json({ error: 'Failed to send invitations' }, { status: 500 })
  }
}
