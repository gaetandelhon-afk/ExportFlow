import { NextRequest, NextResponse } from 'next/server'
import { getApiSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Send payment reminder email
export async function POST(
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
    const body = await request.json()
    const { invoiceIds, customMessage } = body

    // Get customer info
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, companyId },
      select: {
        id: true,
        companyName: true,
        contactName: true,
        email: true,
      },
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Get company info for email
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true },
    })

    // Get overdue invoices
    const now = new Date()
    let invoices
    
    if (invoiceIds && invoiceIds.length > 0) {
      // Get specific invoices
      invoices = await prisma.invoice.findMany({
        where: {
          id: { in: invoiceIds },
          order: { customerId, companyId },
        },
        select: {
          id: true,
          invoiceNumber: true,
          totalAmount: true,
          currency: true,
          dueDate: true,
        },
      })
    } else {
      // Get all overdue invoices for this customer
      invoices = await prisma.invoice.findMany({
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
          currency: true,
          dueDate: true,
        },
      })
    }

    if (invoices.length === 0) {
      return NextResponse.json({ error: 'No invoices to remind about' }, { status: 400 })
    }

    // Calculate total
    const totalAmount = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0)
    const currency = invoices[0]?.currency || 'EUR'
    const currencySymbol = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : '¥'

    // Build email content
    const invoiceList = invoices.map(inv => {
      const daysPastDue = inv.dueDate 
        ? Math.floor((now.getTime() - inv.dueDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0
      return `- ${inv.invoiceNumber}: ${currencySymbol}${Number(inv.totalAmount).toLocaleString()} (${daysPastDue} days overdue)`
    }).join('\n')

    const emailSubject = `Payment Reminder - ${invoices.length} Outstanding Invoice${invoices.length > 1 ? 's' : ''}`
    const emailBody = `
Dear ${customer.contactName || customer.companyName},

This is a friendly reminder that the following invoice${invoices.length > 1 ? 's are' : ' is'} past due:

${invoiceList}

Total Outstanding: ${currencySymbol}${totalAmount.toLocaleString()}

${customMessage ? `\n${customMessage}\n` : ''}
Please arrange payment at your earliest convenience. If you have already made payment, please disregard this reminder.

If you have any questions, please don't hesitate to contact us.

Best regards,
${company?.name || 'The Team'}
    `.trim()

    // Mock email sending (in production, integrate with email service)
    console.log('Sending payment reminder email:', {
      to: customer.email,
      subject: emailSubject,
      body: emailBody,
    })

    // In production, you would:
    // await sendEmail({
    //   to: customer.email,
    //   subject: emailSubject,
    //   body: emailBody,
    // })

    return NextResponse.json({ 
      success: true,
      message: `Payment reminder sent to ${customer.email}`,
      invoiceCount: invoices.length,
      totalAmount,
    })
  } catch (error) {
    console.error('Error sending payment reminder:', error)
    return NextResponse.json({ error: 'Failed to send reminder' }, { status: 500 })
  }
}
