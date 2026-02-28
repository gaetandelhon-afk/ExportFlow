import { NextResponse } from 'next/server'
import { getApiSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

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

    // Get all customers for this company
    // Note: paymentAlertsMuted field may not exist if DB not migrated yet
    let customers: {
      id: string
      companyName: string
      contactName: string | null
      email: string
      country: string | null
      currency: string
      paymentAlertsMuted: boolean
    }[] = []
    
    try {
      customers = await prisma.customer.findMany({
        where: { companyId },
        select: {
          id: true,
          companyName: true,
          contactName: true,
          email: true,
          country: true,
          currency: true,
          paymentAlertsMuted: true,
        },
        orderBy: { companyName: 'asc' },
      })
    } catch {
      // If paymentAlertsMuted doesn't exist, fetch without it
      const basicCustomers = await prisma.customer.findMany({
        where: { companyId },
        select: {
          id: true,
          companyName: true,
          contactName: true,
          email: true,
          country: true,
          currency: true,
        },
        orderBy: { companyName: 'asc' },
      })
      customers = basicCustomers.map(c => ({ ...c, paymentAlertsMuted: false }))
    }

    // Get overdue invoices per customer
    const now = new Date()
    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        status: { in: ['sent', 'overdue'] },
        type: 'INVOICE',
        dueDate: { lt: now },
        order: { companyId },
      },
      select: {
        id: true,
        totalAmount: true,
        dueDate: true,
        order: {
          select: { customerId: true },
        },
      },
    })

    // Group overdue by customer
    const overdueMap = new Map<string, { count: number; amount: number; oldestDueDate: Date }>()
    for (const inv of overdueInvoices) {
      const customerId = inv.order.customerId
      const existing = overdueMap.get(customerId)
      const amount = Number(inv.totalAmount)
      if (existing) {
        existing.count++
        existing.amount += amount
        if (inv.dueDate && inv.dueDate < existing.oldestDueDate) {
          existing.oldestDueDate = inv.dueDate
        }
      } else {
        overdueMap.set(customerId, {
          count: 1,
          amount,
          oldestDueDate: inv.dueDate || now,
        })
      }
    }

    // Try to get ledger entries, handle if table doesn't exist
    let ledgerData: { customerId: string; _sum: { amount: Prisma.Decimal | null }; _max: { date: Date | null }; _count: { type: number } }[] = []
    let invoiceCounts: { customerId: string; _count: { type: number } }[] = []
    let paymentCounts: { customerId: string; _count: { type: number } }[] = []

    try {
      // Get balance summary for each customer
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ledgerData = await (prisma.customerLedgerEntry.groupBy as any)({
        by: ['customerId'],
        where: { companyId },
        _sum: { amount: true },
        _max: { date: true },
        _count: { type: true },
      })

      // Get invoice count per customer
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      invoiceCounts = await (prisma.customerLedgerEntry.groupBy as any)({
        by: ['customerId'],
        where: { 
          companyId,
          type: 'INVOICE',
        },
        _count: { type: true },
      })

      // Get payment count per customer
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      paymentCounts = await (prisma.customerLedgerEntry.groupBy as any)({
        by: ['customerId'],
        where: { 
          companyId,
          type: 'PAYMENT',
        },
        _count: { type: true },
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') {
        console.warn('CustomerLedgerEntry table not yet created')
      } else {
        throw error
      }
    }

    // Create maps for quick lookup
    const balanceMap = new Map(ledgerData.map(d => [d.customerId, {
      balance: d._sum.amount ? Number(d._sum.amount) : 0,
      lastActivity: d._max.date,
    }]))
    const invoiceCountMap = new Map(invoiceCounts.map(d => [d.customerId, d._count.type]))
    const paymentCountMap = new Map(paymentCounts.map(d => [d.customerId, d._count.type]))

    // Combine customer data with balance info
    const customersWithBalances = customers.map(customer => {
      const overdue = overdueMap.get(customer.id)
      const daysPastDue = overdue 
        ? Math.floor((now.getTime() - overdue.oldestDueDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0
      
      return {
        id: customer.id,
        companyName: customer.companyName,
        contactName: customer.contactName,
        email: customer.email,
        country: customer.country,
        currency: customer.currency,
        balance: balanceMap.get(customer.id)?.balance || 0,
        lastActivityDate: balanceMap.get(customer.id)?.lastActivity?.toISOString() || null,
        invoiceCount: invoiceCountMap.get(customer.id) || 0,
        paymentCount: paymentCountMap.get(customer.id) || 0,
        // Overdue info
        hasOverdue: !!overdue && !customer.paymentAlertsMuted,
        overdueCount: overdue?.count || 0,
        overdueAmount: overdue?.amount || 0,
        daysPastDue,
        alertsMuted: customer.paymentAlertsMuted,
      }
    })

    // Sort by balance (highest owing first)
    customersWithBalances.sort((a, b) => b.balance - a.balance)

    return NextResponse.json({ customers: customersWithBalances })
  } catch (error) {
    console.error('Error fetching customer balances:', error)
    return NextResponse.json({ error: 'Failed to fetch balances' }, { status: 500 })
  }
}
