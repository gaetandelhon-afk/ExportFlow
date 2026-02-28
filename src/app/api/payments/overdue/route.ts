import { NextResponse } from 'next/server'
import { getApiSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface OverdueInvoice {
  id: string
  invoiceNumber: string
  totalAmount: unknown
  currency: string
  dueDate: Date | null
  sentAt: Date | null
  order: {
    id: string
    orderNumber: string
    customerId: string
    customer: {
      id: string
      companyName: string
      contactName: string | null
      email: string
    }
  }
}

export async function GET() {
  try {
    const session = await getApiSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!session.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const companyId = session.companyId
    const now = new Date()

    const selectFields = {
      id: true,
      invoiceNumber: true,
      totalAmount: true,
      currency: true,
      dueDate: true,
      sentAt: true,
      order: {
        select: {
          id: true,
          orderNumber: true,
          customerId: true,
          customer: {
            select: {
              id: true,
              companyName: true,
              contactName: true,
              email: true,
            },
          },
        },
      },
    }

    let overdueInvoices: OverdueInvoice[] = []

    // Try with paymentAlertsMuted filter first, fallback without it
    try {
      overdueInvoices = await prisma.invoice.findMany({
        where: {
          status: { in: ['sent', 'overdue'] },
          type: 'INVOICE',
          dueDate: { lt: now },
          order: {
            companyId,
            customer: {
              paymentAlertsMuted: false,
            },
          },
        },
        select: selectFields,
        orderBy: { dueDate: 'asc' },
      }) as OverdueInvoice[]
    } catch {
      // If paymentAlertsMuted doesn't exist, fetch without filter
      overdueInvoices = await prisma.invoice.findMany({
        where: {
          status: { in: ['sent', 'overdue'] },
          type: 'INVOICE',
          dueDate: { lt: now },
          order: { companyId },
        },
        select: selectFields,
        orderBy: { dueDate: 'asc' },
      }) as OverdueInvoice[]
    }

    // Group by customer
    const customerOverdueMap = new Map<string, {
      customer: {
        id: string
        companyName: string
        contactName: string | null
        email: string
      }
      invoices: OverdueInvoice[]
      totalOverdue: number
      oldestDueDate: Date
    }>()

    for (const invoice of overdueInvoices) {
      const customerId = invoice.order.customerId
      const existing = customerOverdueMap.get(customerId)

      if (existing) {
        existing.invoices.push(invoice)
        existing.totalOverdue += Number(invoice.totalAmount)
        if (invoice.dueDate && invoice.dueDate < existing.oldestDueDate) {
          existing.oldestDueDate = invoice.dueDate
        }
      } else {
        customerOverdueMap.set(customerId, {
          customer: invoice.order.customer,
          invoices: [invoice],
          totalOverdue: Number(invoice.totalAmount),
          oldestDueDate: invoice.dueDate || now,
        })
      }
    }

    const overdueCustomers = Array.from(customerOverdueMap.values()).map(data => ({
      ...data.customer,
      invoiceCount: data.invoices.length,
      totalOverdue: data.totalOverdue,
      oldestDueDate: data.oldestDueDate.toISOString(),
      daysPastDue: Math.floor((now.getTime() - data.oldestDueDate.getTime()) / (1000 * 60 * 60 * 24)),
      invoices: data.invoices.map(inv => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        amount: Number(inv.totalAmount),
        currency: inv.currency,
        dueDate: inv.dueDate?.toISOString(),
        orderNumber: inv.order.orderNumber,
      })),
    }))

    // Sort by days past due (most overdue first)
    overdueCustomers.sort((a, b) => b.daysPastDue - a.daysPastDue)

    return NextResponse.json({
      overdueCount: overdueInvoices.length,
      overdueCustomerCount: overdueCustomers.length,
      totalOverdueAmount: overdueInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0),
      customers: overdueCustomers,
    })
  } catch (error) {
    console.error('Error fetching overdue payments:', error)
    return NextResponse.json({ error: 'Failed to fetch overdue payments' }, { status: 500 })
  }
}
