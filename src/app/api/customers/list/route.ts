import { NextResponse } from 'next/server'
import { getApiSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getApiSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!session.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const customers = await prisma.customer.findMany({
      where: { companyId: session.companyId, isActive: true },
      select: { 
        id: true, 
        companyName: true, 
        contactName: true,
        email: true,
        phone: true,
        country: true,
        vatNumber: true,
        priceType: true,
        currency: true,
        paymentTerms: true,
        customFields: true,
        categoryId: true,
        category: {
          select: {
            id: true,
            nameEn: true,
            parentId: true,
            parent: {
              select: { id: true, nameEn: true }
            }
          }
        },
        _count: {
          select: { orders: true }
        }
      },
      orderBy: { companyName: 'asc' },
    })

    // Map customers to include legalName from customFields
    const mappedCustomers = customers.map(customer => {
      const customFields = customer.customFields as Record<string, unknown> | null
      return {
        ...customer,
        legalName: customFields?.legalName as string | null || null,
      }
    })

    return NextResponse.json({ customers: mappedCustomers })
  } catch (error) {
    console.error('List customers error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
