import { NextRequest, NextResponse } from 'next/server'
import { getApiSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validateBody, isValidationError, createQuoteSchema } from '@/lib/validation'
import { createAuditLog } from '@/lib/auditLog'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')

    const session = await getApiSession()
    if (!session || !session.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const where: Record<string, unknown> = {
      type: 'QUOTE',
      order: { companyId: session.companyId }
    }

    if (status) {
      where.status = status
    }

    const quotes = await prisma.invoice.findMany({
      where,
      include: {
        order: {
          select: {
            orderNumber: true,
            customer: {
              select: { companyName: true }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 200,
    })

    const formattedQuotes = quotes.map(quote => ({
      id: quote.id,
      invoiceNumber: quote.invoiceNumber,
      type: quote.type,
      customerName: quote.order.customer.companyName,
      orderId: quote.orderId,
      orderNumber: quote.order.orderNumber,
      totalAmount: Number(quote.totalAmount),
      currency: quote.currency,
      status: quote.status,
      issueDate: quote.issueDate.toISOString(),
      validUntil: quote.validUntil?.toISOString() || null,
      createdAt: quote.createdAt.toISOString(),
    }))

    return NextResponse.json({ quotes: formattedQuotes })
  } catch (error) {
    console.error('Fetch quotes error:', error)
    return NextResponse.json({ error: 'Failed to fetch quotes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getApiSession()
    if (!session || !session.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await validateBody(request, createQuoteSchema)
    if (isValidationError(body)) return body
    const { customerId, lines, validityDays = 30, notes } = body

    // Calculate totals
    let subtotal = 0
    const orderLines = lines.map((line: { productId: string; productRef: string; productNameEn: string; quantity: number; unitPrice: number }) => {
      const lineTotal = line.quantity * line.unitPrice
      subtotal += lineTotal
      return {
        productId: line.productId,
        productRef: line.productRef,
        productNameEn: line.productNameEn,
        productNameCn: '',
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        lineTotal: lineTotal,
      }
    })

    const totalAmount = subtotal

    // Generate order number
    const orderCount = await prisma.order.count({ where: { companyId: session.companyId } })
    const orderNumber = `ORD-${String(orderCount + 1).padStart(5, '0')}`

    // Create order first (quote is linked to an order)
    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId,
        companyId: session.companyId,
        status: 'DRAFT',
        subtotal,
        totalAmount,
        currency: 'CNY',
        notesEn: notes || null,
        lines: {
          create: orderLines
        }
      },
      include: {
        customer: true
      }
    })

    // Generate quote number
    const quoteCount = await prisma.invoice.count({
      where: { type: 'QUOTE' }
    })
    const quoteNumber = `QUO-${String(quoteCount + 1).padStart(5, '0')}`

    // Calculate validity date
    const validUntil = new Date()
    validUntil.setDate(validUntil.getDate() + validityDays)

    // Create quote
    const quote = await prisma.invoice.create({
      data: {
        invoiceNumber: quoteNumber,
        type: 'QUOTE',
        orderId: order.id,
        subtotal,
        totalAmount,
        currency: 'CNY',
        status: 'draft',
        validUntil
      }
    })

    await createAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      action: 'CREATE',
      entityType: 'Quote',
      entityId: quote.id,
      metadata: { quoteNumber: quote.invoiceNumber, customerId },
      request,
    })

    return NextResponse.json({
      quote: {
        id: quote.id,
        invoiceNumber: quote.invoiceNumber,
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customer.companyName,
        totalAmount: Number(quote.totalAmount),
        status: quote.status,
        validUntil: quote.validUntil?.toISOString()
      }
    })
  } catch (error) {
    console.error('Create quote error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to create quote', details: errorMessage },
      { status: 500 }
    )
  }
}
