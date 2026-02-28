import { NextRequest, NextResponse } from 'next/server'
import { getApiSession } from '@/lib/auth'
import { 
  sendInvoiceEmail, 
  sendQuoteEmail, 
  sendOrderConfirmationEmail,
  sendShippingNotificationEmail,
  sendNotificationEmail,
  sendExportPackingListEmail,
  sendFactoryPackingListEmail
} from '@/lib/email'
import { validateBody, isValidationError, sendEmailSchema } from '@/lib/validation'

export async function POST(request: NextRequest) {
  try {
    const session = await getApiSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const validated = await validateBody(request, sendEmailSchema)
    if (isValidationError(validated)) return validated
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = validated as any
    const type: string = data.type
    const toStr: string = Array.isArray(data.to) ? data.to.join(', ') : data.to
    const params = data

    let result

    switch (type) {
      case 'invoice':
        if (!params.to || !params.invoiceNumber || !params.amount) {
          return NextResponse.json({ error: 'Missing required fields for invoice email' }, { status: 400 })
        }
        result = await sendInvoiceEmail({
          to: toStr,
          customerName: params.customerName || 'Customer',
          invoiceNumber: params.invoiceNumber,
          amount: params.amount,
          currency: params.currency || 'EUR',
          dueDate: params.dueDate || 'Upon receipt',
          pdfBuffer: params.pdfBase64 ? Buffer.from(params.pdfBase64, 'base64') : undefined,
          companyName: params.companyName
        })
        break

      case 'quote':
        if (!params.to || !params.quoteNumber || !params.amount) {
          return NextResponse.json({ error: 'Missing required fields for quote email' }, { status: 400 })
        }
        result = await sendQuoteEmail({
          to: toStr,
          customerName: params.customerName || 'Customer',
          quoteNumber: params.quoteNumber,
          amount: params.amount,
          currency: params.currency || 'EUR',
          validUntil: params.validUntil || '30 days',
          pdfBuffer: params.pdfBase64 ? Buffer.from(params.pdfBase64, 'base64') : undefined,
          companyName: params.companyName
        })
        break

      case 'order_confirmation':
        if (!params.to || !params.orderNumber) {
          return NextResponse.json({ error: 'Missing required fields for order confirmation email' }, { status: 400 })
        }
        result = await sendOrderConfirmationEmail({
          to: toStr,
          customerName: params.customerName || 'Customer',
          orderNumber: params.orderNumber,
          orderDate: params.orderDate || new Date().toLocaleDateString(),
          items: params.items || [],
          total: params.total || '0',
          currency: params.currency || 'EUR',
          companyName: params.companyName
        })
        break

      case 'shipping':
        if (!params.to || !params.orderNumber) {
          return NextResponse.json({ error: 'Missing required fields for shipping email' }, { status: 400 })
        }
        result = await sendShippingNotificationEmail({
          to: toStr,
          customerName: params.customerName || 'Customer',
          orderNumber: params.orderNumber,
          trackingNumber: params.trackingNumber,
          carrier: params.carrier,
          estimatedDelivery: params.estimatedDelivery,
          companyName: params.companyName
        })
        break

      case 'notification':
        if (!params.to || !params.subject || !params.message) {
          return NextResponse.json({ error: 'Missing required fields for notification email' }, { status: 400 })
        }
        result = await sendNotificationEmail({
          to: toStr,
          subject: params.subject,
          title: params.title || params.subject,
          message: params.message,
          actionUrl: params.actionUrl,
          actionText: params.actionText,
          companyName: params.companyName
        })
        break

      case 'packing_list_export':
        if (!params.to || !params.packingListNumber) {
          return NextResponse.json({ error: 'Missing required fields for export packing list email' }, { status: 400 })
        }
        result = await sendExportPackingListEmail({
          to: toStr,
          customerName: params.customerName || 'Customer',
          packingListNumber: params.packingListNumber,
          orderReference: params.orderReference,
          totalPackages: params.totalPackages || 0,
          totalWeight: params.totalWeight,
          shipmentDate: params.shipmentDate,
          pdfBuffer: params.pdfBase64 ? Buffer.from(params.pdfBase64, 'base64') : undefined,
          companyName: params.companyName
        })
        break

      case 'packing_list_factory':
        if (!params.to || !params.packingListNumber) {
          return NextResponse.json({ error: 'Missing required fields for factory packing list email' }, { status: 400 })
        }
        result = await sendFactoryPackingListEmail({
          to: toStr,
          factoryName: params.factoryName || 'Factory',
          packingListNumber: params.packingListNumber,
          orderReference: params.orderReference,
          totalItems: params.totalItems || 0,
          productionDate: params.productionDate,
          pdfBuffer: params.pdfBase64 ? Buffer.from(params.pdfBase64, 'base64') : undefined,
          companyName: params.companyName
        })
        break

      default:
        return NextResponse.json({ error: `Unknown email type: ${type}` }, { status: 400 })
    }

    return NextResponse.json({ ...result, success: true })
  } catch (error) {
    console.error('Email API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send email' },
      { status: 500 }
    )
  }
}
