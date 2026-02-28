import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getApiSession } from '@/lib/auth'
import { clerkClient } from '@clerk/nextjs/server'

export async function GET(request: NextRequest) {
  try {
    const session = await getApiSession()
    if (!session?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const client = await clerkClient()
    const user = await client.users.getUser(session.userId)
    const metadata = user.publicMetadata as Record<string, unknown>
    const role = (metadata.role as string | undefined) ?? 'ADMIN'
    const customerIdFromMeta = metadata.customerId as string | undefined

    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')
    
    let effectiveCustomerId: string | null = null
    
    if (customerId && (role === 'ADMIN' || role === 'COMMERCIAL')) {
      effectiveCustomerId = customerId
    } else if (customerIdFromMeta) {
      effectiveCustomerId = customerIdFromMeta
    }
    
    if (!effectiveCustomerId) {
      return NextResponse.json({ invoices: [] })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invoices = await (prisma.invoice.findMany as any)({
      where: {
        order: {
          companyId: session.companyId,
          customerId: effectiveCustomerId,
        },
        // Tous les types de documents sont visibles dès leur création
      },
      select: {
        id: true,
        invoiceNumber: true,
        type: true,
        issueDate: true,
        dueDate: true,
        validUntil: true,
        subtotal: true,
        totalAmount: true,
        currency: true,
        status: true,
        sentAt: true,
        pdfUrl: true,
        order: {
          select: {
            id: true,
            orderNumber: true,
            customer: {
              select: {
                companyName: true,
              }
            }
          }
        }
      },
      orderBy: {
        issueDate: 'desc'
      }
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formattedInvoices = invoices.map((invoice: any) => ({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      type: invoice.type,
      issueDate: invoice.issueDate.toISOString(),
      dueDate: invoice.dueDate?.toISOString() || invoice.validUntil?.toISOString() || null,
      subtotal: Number(invoice.subtotal) || 0,
      taxAmount: 0,
      shippingAmount: 0,
      totalAmount: Number(invoice.totalAmount) || 0,
      currency: invoice.currency,
      status: invoice.status,
      sentAt: invoice.sentAt?.toISOString() || null,
      pdfUrl: invoice.pdfUrl,
      orderId: invoice.order.id,
      orderNumber: invoice.order.orderNumber,
    }))

    return NextResponse.json({ invoices: formattedInvoices })
  } catch (error) {
    console.error('Error fetching invoices:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
