import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { sendInvoiceEmail } from '@/lib/email'
import { validateBody, isValidationError, sendInvoiceSchema } from '@/lib/validation'

// Helper to add invoice to customer ledger
async function addInvoiceToLedger(invoice: {
  id: string
  invoiceNumber: string
  totalAmount: number | { toNumber: () => number }
  currency: string
  order: {
    customerId: string
    companyId: string
  }
}) {
  try {
    // Check if ledger entry already exists for this invoice
    const existing = await prisma.customerLedgerEntry.findFirst({
      where: { invoiceId: invoice.id }
    })
    
    if (existing) return // Already added
    
    const amount = typeof invoice.totalAmount === 'object' && 'toNumber' in invoice.totalAmount
      ? invoice.totalAmount.toNumber()
      : Number(invoice.totalAmount)
    
    await prisma.customerLedgerEntry.create({
      data: {
        type: 'INVOICE',
        date: new Date(),
        description: `Invoice ${invoice.invoiceNumber}`,
        reference: invoice.invoiceNumber,
        amount: amount, // Positive = customer owes
        currency: invoice.currency,
        invoiceId: invoice.id,
        customerId: invoice.order.customerId,
        companyId: invoice.order.companyId,
      }
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') {
      console.warn('CustomerLedgerEntry table not yet created - skipping ledger entry')
    } else {
      console.error('Failed to add invoice to ledger:', error)
    }
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await validateBody(request, sendInvoiceSchema)
    if (isValidationError(body)) return body
    const { to, cc = [], subject, body: emailBody } = body

    // Normalize to array
    const toArray = Array.isArray(to) ? to : [to]
    const ccArray = Array.isArray(cc) ? cc : cc ? [cc] : []

    // Validate invoice exists
    const invoice = await prisma.invoice.findFirst({
      where: { 
        id,
        type: { in: ['INVOICE', 'PROFORMA'] }
      },
      include: {
        order: {
          select: {
            customerId: true,
            companyId: true,
            customer: true,
          }
        }
      }
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Format amount for email
    const amount = typeof invoice.totalAmount === 'object' && 'toNumber' in invoice.totalAmount
      ? invoice.totalAmount.toNumber()
      : Number(invoice.totalAmount)
    
    // Send email via Resend
    await sendInvoiceEmail({
      to: toArray.join(', '),
      customerName: invoice.order.customer?.companyName || 'Customer',
      invoiceNumber: invoice.invoiceNumber,
      amount: amount.toFixed(2),
      currency: invoice.currency,
      dueDate: invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'Upon receipt'
    })

    // Update invoice status to 'sent' with timestamp
    await prisma.invoice.update({
      where: { id },
      data: { 
        status: 'sent',
        sentAt: new Date(),
        sentTo: toArray.join(', ')
      }
    })

    // Add to customer ledger (for invoices only, not proforma)
    if (invoice.type === 'INVOICE') {
      await addInvoiceToLedger({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        totalAmount: invoice.totalAmount,
        currency: invoice.currency,
        order: {
          customerId: invoice.order.customerId,
          companyId: invoice.order.companyId,
        }
      })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Invoice sent successfully'
    })
  } catch (error) {
    console.error('Send invoice error:', error)
    return NextResponse.json(
      { error: 'Failed to send invoice' },
      { status: 500 }
    )
  }
}
