import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendQuoteEmail } from '@/lib/email'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { to, cc = [], subject, body: emailBody } = body

    if (!to || (Array.isArray(to) && to.length === 0) || !subject) {
      return NextResponse.json(
        { error: 'Email recipient and subject are required' },
        { status: 400 }
      )
    }

    // Normalize to array
    const toArray = Array.isArray(to) ? to : [to]
    const ccArray = Array.isArray(cc) ? cc : cc ? [cc] : []

    // Validate quote exists
    const quote = await prisma.invoice.findFirst({
      where: { 
        id,
        type: 'QUOTE'
      },
      include: {
        order: {
          include: {
            customer: true
          }
        }
      }
    })

    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    // Format amount for email
    const amount = typeof quote.totalAmount === 'object' && 'toNumber' in quote.totalAmount
      ? quote.totalAmount.toNumber()
      : Number(quote.totalAmount)
    
    // Send email via Resend
    await sendQuoteEmail({
      to: toArray.join(', '),
      customerName: quote.order.customer?.companyName || 'Customer',
      quoteNumber: quote.invoiceNumber,
      amount: amount.toFixed(2),
      currency: quote.currency,
      validUntil: quote.validUntil ? new Date(quote.validUntil).toLocaleDateString() : '30 days'
    })

    // Update quote status to 'sent' with timestamp
    await prisma.invoice.update({
      where: { id },
      data: { 
        status: 'sent',
        sentAt: new Date(),
        sentTo: toArray.join(', ')
      }
    })

    return NextResponse.json({ 
      success: true,
      message: 'Quote sent successfully'
    })
  } catch (error) {
    console.error('Send quote error:', error)
    return NextResponse.json(
      { error: 'Failed to send quote' },
      { status: 500 }
    )
  }
}
