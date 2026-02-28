import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth, isErrorResponse } from '@/lib/tenantGuard'
import { prisma } from '@/lib/prisma'
import { checkFeatureAccess, handlePlanError, PlanError, LimitError } from '@/lib/check-plan-session'
import { createAuditLog } from '@/lib/auditLog'

// Generate invoice number
function generateInvoiceNumber(prefix: string = 'INV'): string {
  const date = new Date()
  const year = date.getFullYear().toString().slice(-2)
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `${prefix}-${year}${month}-${random}`
}

// GET - List all invoices
export async function GET() {
  try {
    const session = await requireTenantAuth()
    if (isErrorResponse(session)) return session

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invoices = await (prisma.invoice.findMany as any)({
      where: {
        type: { not: 'QUOTE' }, // Exclude quotes - they have their own page
        order: {
          companyId: session.companyId
        }
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            customer: {
              select: { companyName: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })

    // Calculate stats
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    
    const stats = {
      totalOutstanding: 0,
      overdue: 0,
      paidThisMonth: 0,
      draft: 0
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    invoices.forEach((inv: any) => {
      const amount = Number(inv.totalAmount) || 0
      
      if (inv.status === 'draft') {
        stats.draft++
      } else if (inv.status === 'paid') {
        if (inv.updatedAt >= startOfMonth) {
          stats.paidThisMonth += amount
        }
      } else if (inv.status === 'sent' || inv.status === 'overdue') {
        stats.totalOutstanding += amount
        if (inv.dueDate && inv.dueDate < now) {
          stats.overdue += amount
        }
      }
    })

    return NextResponse.json({ 
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      invoices: invoices.map((inv: any) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        type: (inv as { type?: string }).type || 'INVOICE',
        customerName: inv.order.customer.companyName,
        orderId: inv.order.id,
        orderNumber: inv.order.orderNumber,
        totalAmount: Number(inv.totalAmount),
        subtotal: Number(inv.subtotal),
        currency: inv.currency,
        status: inv.status,
        issueDate: inv.issueDate,
        dueDate: inv.dueDate,
        validUntil: (inv as { validUntil?: Date | null }).validUntil,
        pdfUrl: inv.pdfUrl,
        createdAt: inv.createdAt,
      })),
      stats
    })

  } catch (error) {
    console.error('List invoices error:', error)
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 })
  }
}

// POST - Create invoice, quote, or proforma from order
export async function POST(request: NextRequest) {
  try {
    const session = await requireTenantAuth()
    if (isErrorResponse(session)) return session

    const body = await request.json()
    const { orderId, dueDate, validUntil, type = 'INVOICE' } = body

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
    }

    // Validate type
    const validTypes = ['INVOICE', 'QUOTE', 'PROFORMA']
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid document type' }, { status: 400 })
    }

    // Check feature access for proforma invoices
    if (type === 'PROFORMA') {
      await checkFeatureAccess('proforma_invoices')
    }

    // Get order with lines (using select to avoid missing columns)
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        companyId: session.companyId
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        subtotal: true,
        totalAmount: true,
        totalCharges: true,
        currency: true,
        customerId: true,
        companyId: true,
        lines: {
          select: {
            id: true,
            quantity: true,
            unitPrice: true,
            lineTotal: true,
            productId: true,
            product: {
              select: {
                id: true,
                ref: true,
                nameEn: true,
                nameCn: true,
              }
            }
          }
        },
        customer: {
          select: {
            id: true,
            companyName: true,
            contactName: true,
            email: true,
          }
        }
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Always create a new document — never reuse an existing one
    // Generate appropriate number prefix based on type
    const prefix = type === 'QUOTE' ? 'QUO' : type === 'PROFORMA' ? 'PRO' : 'INV'

    // Create document — use subtotal only (charges/discounts are per-document and start empty)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invoice = await (prisma.invoice.create as any)({
      data: {
        invoiceNumber: generateInvoiceNumber(prefix),
        type,
        orderId: order.id,
        subtotal: order.subtotal,
        totalAmount: order.subtotal, // ← start clean: no inherited charges
        currency: order.currency,
        status: 'draft',
        dueDate: dueDate ? new Date(dueDate) : null,
        validUntil: validUntil ? new Date(validUntil) : null,
      }
    })

    await createAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      action: 'CREATE',
      entityType: 'Invoice',
      entityId: invoice.id,
      metadata: {
        invoiceNumber: invoice.invoiceNumber,
        customerId: order.customerId,
        total: Number(invoice.totalAmount),
        type,
      },
      request,
    })

    return NextResponse.json({ invoice }, { status: 201 })

  } catch (error) {
    if (error instanceof PlanError || error instanceof LimitError) {
      return handlePlanError(error)
    }
    console.error('Create invoice error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ 
      error: 'Failed to create invoice', 
      details: errorMessage 
    }, { status: 500 })
  }
}
