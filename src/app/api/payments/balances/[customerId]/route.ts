import { NextRequest, NextResponse } from 'next/server'
import { getApiSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  try {
    const session = await getApiSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!session.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { customerId } = await params
    const companyId = session.companyId

    // Get customer details
    // Note: paymentAlertsMuted field may not exist if DB not migrated yet
    let customer: {
      id: string
      companyName: string
      contactName: string | null
      email: string
      country: string | null
      currency: string
      paymentAlertsMuted: boolean
    } | null = null

    try {
      customer = await prisma.customer.findFirst({
        where: { 
          id: customerId,
          companyId,
        },
        select: {
          id: true,
          companyName: true,
          contactName: true,
          email: true,
          country: true,
          currency: true,
          paymentAlertsMuted: true,
        },
      })
    } catch {
      // If paymentAlertsMuted doesn't exist, fetch without it
      const basicCustomer = await prisma.customer.findFirst({
        where: { 
          id: customerId,
          companyId,
        },
        select: {
          id: true,
          companyName: true,
          contactName: true,
          email: true,
          country: true,
          currency: true,
        },
      })
      if (basicCustomer) {
        customer = { ...basicCustomer, paymentAlertsMuted: false }
      }
    }

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Get overdue invoices for this customer
    const now = new Date()
    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        status: { in: ['sent', 'overdue'] },
        type: 'INVOICE',
        dueDate: { lt: now },
        order: { customerId, companyId },
      },
      select: {
        id: true,
        invoiceNumber: true,
        totalAmount: true,
        dueDate: true,
      },
    })

    const overdueInfo = {
      hasOverdue: overdueInvoices.length > 0 && !customer.paymentAlertsMuted,
      overdueCount: overdueInvoices.length,
      overdueAmount: overdueInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0),
      daysPastDue: overdueInvoices.length > 0 
        ? Math.max(...overdueInvoices.map(inv => 
            inv.dueDate ? Math.floor((now.getTime() - inv.dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0
          ))
        : 0,
      overdueInvoices: overdueInvoices.map(inv => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        amount: Number(inv.totalAmount),
        dueDate: inv.dueDate?.toISOString(),
        daysPastDue: inv.dueDate ? Math.floor((now.getTime() - inv.dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0,
      })),
    }

    // Get all ledger entries for this customer
    let entries: {
      id: string
      type: string
      date: Date
      description: string
      reference: string | null
      amount: number
      currency: string
      notes: string | null
      invoiceId: string | null
      createdAt: Date
    }[] = []

    try {
      const rawEntries = await prisma.customerLedgerEntry.findMany({
        where: {
          customerId,
          companyId,
        },
        orderBy: { date: 'asc' },
        select: {
          id: true,
          type: true,
          date: true,
          description: true,
          reference: true,
          amount: true,
          currency: true,
          notes: true,
          invoiceId: true,
          createdAt: true,
        },
      })

      entries = rawEntries.map(e => ({
        ...e,
        amount: Number(e.amount),
      }))
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') {
        console.warn('CustomerLedgerEntry table not yet created')
      } else {
        throw error
      }
    }

    // Calculate running balance for each entry
    let runningBalance = 0
    const entriesWithBalance = entries.map(entry => {
      runningBalance += entry.amount
      return {
        ...entry,
        date: entry.date.toISOString(),
        runningBalance,
      }
    })

    // Reverse to show most recent first, but keep running balance correct
    entriesWithBalance.reverse()

    return NextResponse.json({ 
      customer: {
        ...customer,
        alertsMuted: customer.paymentAlertsMuted,
        ...overdueInfo,
      },
      entries: entriesWithBalance,
    })
  } catch (error) {
    console.error('Error fetching customer ledger:', error)
    return NextResponse.json({ error: 'Failed to fetch ledger' }, { status: 500 })
  }
}
