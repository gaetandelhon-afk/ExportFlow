import { NextRequest, NextResponse } from 'next/server'
import { getApiSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validateBody, isValidationError, createGroupedInvoiceSchema } from '@/lib/validation'

// GET /api/grouped-invoices - List all grouped invoices
export async function GET() {
  const session = await getApiSession()
  if (!session || !session.companyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const groupedInvoices = await prisma.groupedInvoice.findMany({
      where: { companyId: session.companyId },
      include: {
        items: true
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })

    return NextResponse.json({ groupedInvoices })
  } catch (error) {
    console.error('Failed to fetch grouped invoices:', error)
    return NextResponse.json({ error: 'Failed to fetch grouped invoices' }, { status: 500 })
  }
}

// POST /api/grouped-invoices - Create a grouped invoice
export async function POST(request: NextRequest) {
  const session = await getApiSession()
  if (!session || !session.companyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await validateBody(request, createGroupedInvoiceSchema)
    if (isValidationError(body)) return body
    const { orderIds, customerId, notes } = body

    // Verify all orders belong to the same customer
    const orders = await prisma.order.findMany({
      where: {
        id: { in: orderIds },
        companyId: session.companyId
      },
      include: {
        customer: true
      }
    })

    if (orders.length !== orderIds.length) {
      return NextResponse.json({ error: 'Some orders not found' }, { status: 404 })
    }

    const customerIds = [...new Set(orders.map(o => o.customerId))]
    if (customerIds.length > 1) {
      return NextResponse.json({ error: 'All orders must be from the same customer' }, { status: 400 })
    }

    // Calculate totals
    const subtotal = orders.reduce((sum, o) => sum + Number(o.subtotal), 0)
    const totalAmount = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0)
    const currency = orders[0].currency

    // Generate invoice number
    const count = await prisma.groupedInvoice.count({
      where: { companyId: session.companyId }
    })
    const invoiceNumber = `GRP-INV-${String(count + 1).padStart(5, '0')}`

    // Create grouped invoice
    const groupedInvoice = await prisma.groupedInvoice.create({
      data: {
        invoiceNumber,
        customerId: customerIds[0],
        subtotal,
        totalAmount,
        currency,
        notes: notes || null,
        companyId: session.companyId,
        items: {
          create: orderIds.map((orderId: string) => ({
            orderId
          }))
        }
      },
      include: {
        items: true
      }
    })

    return NextResponse.json({ groupedInvoice })
  } catch (error) {
    console.error('Failed to create grouped invoice:', error)
    return NextResponse.json({ error: 'Failed to create grouped invoice' }, { status: 500 })
  }
}
