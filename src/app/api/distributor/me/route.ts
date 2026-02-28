import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { clerkClient } from '@clerk/nextjs/server'
import { getApiSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getApiSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!session.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch additional user metadata for distributor check and admin display
    const client = await clerkClient()
    const user = await client.users.getUser(session.userId)
    const metadata = user.publicMetadata as Record<string, unknown>
    const customerId = metadata.customerId as string | undefined

    // If user is a distributor/customer, get their customer data
    if (customerId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const customer = await (prisma.customer.findFirst as any)({
        where: { id: customerId, companyId: session.companyId },
        select: {
          id: true,
          companyName: true,
          contactName: true,
          email: true,
          phone: true,
          priceType: true,
          currency: true,
          paymentTerms: true,
          addresses: {
            where: { isActive: true },
            select: {
              id: true,
              label: true,
              type: true,
              street: true,
              city: true,
              state: true,
              postalCode: true,
              country: true,
              contactName: true,
              phone: true,
              isDefault: true,
            }
          }
        }
      })

      if (!customer) {
        return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
      }

      return NextResponse.json({
        user: {
          id: customer.id,
          name: customer.contactName || customer.companyName,
          email: customer.email,
          company: customer.companyName,
          priceType: customer.priceType || 'STANDARD',
          displayCurrency: customer.currency || 'EUR',
          invoiceCurrency: customer.currency || 'EUR',
          paymentTerms: customer.paymentTerms || 'Net 30',
          overrides: {
            stockVisible: true,
            canGenerateQuotes: true,
          }
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        addresses: customer.addresses.map((addr: any) => ({
          id: addr.id,
          label: addr.label || addr.type || 'Address',
          company: customer.companyName,
          contactName: addr.contactName || customer.contactName || '',
          street: addr.street,
          city: addr.city,
          postalCode: addr.postalCode || '',
          country: addr.country,
          phone: addr.phone,
          isDefault: addr.isDefault,
        }))
      })
    }

    // For admin users, return basic info
    return NextResponse.json({
      user: {
        id: session.userId,
        name: user.fullName ?? user.firstName ?? user.emailAddresses[0]?.emailAddress ?? '',
        email: user.emailAddresses[0]?.emailAddress ?? '',
        company: metadata.companyName as string | undefined,
        role: (metadata.role as string | undefined) ?? 'ADMIN',
      },
      addresses: [],
    })
  } catch (error) {
    console.error('Error fetching user data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
