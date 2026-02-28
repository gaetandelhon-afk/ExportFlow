import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  from?: string
  replyTo?: string
  attachments?: Array<{
    filename: string
    content: Buffer | string
    contentType?: string
  }>
}

export async function sendEmail(options: EmailOptions) {
  const fromEmail = options.from || process.env.EMAIL_FROM || 'OrderBridge <noreply@yourdomain.com>'
  
  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
      replyTo: options.replyTo,
      attachments: options.attachments,
    })

    if (error) {
      console.error('Email send error:', error)
      throw new Error(error.message)
    }

    return { success: true, id: data?.id }
  } catch (error) {
    console.error('Failed to send email:', error)
    throw error
  }
}

// Invoice email
export async function sendInvoiceEmail(params: {
  to: string
  customerName: string
  invoiceNumber: string
  amount: string
  currency: string
  dueDate: string
  pdfBuffer?: Buffer
  companyName?: string
}) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1d1d1f; }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #0071e3; }
        .card { background: #f5f5f7; border-radius: 12px; padding: 24px; margin: 20px 0; }
        .amount { font-size: 32px; font-weight: bold; color: #1d1d1f; }
        .label { font-size: 14px; color: #86868b; margin-bottom: 4px; }
        .value { font-size: 16px; color: #1d1d1f; font-weight: 500; }
        .button { display: inline-block; background: #0071e3; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; }
        .footer { text-align: center; margin-top: 40px; color: #86868b; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">${params.companyName || 'OrderBridge'}</div>
        </div>
        
        <h2>Invoice ${params.invoiceNumber}</h2>
        <p>Hello ${params.customerName},</p>
        <p>Please find attached your invoice for the following amount:</p>
        
        <div class="card">
          <div class="label">Amount Due</div>
          <div class="amount">${params.currency} ${params.amount}</div>
          <div style="margin-top: 16px;">
            <div class="label">Due Date</div>
            <div class="value">${params.dueDate}</div>
          </div>
        </div>
        
        <p>If you have any questions about this invoice, please don't hesitate to contact us.</p>
        
        <div class="footer">
          <p>This email was sent by ${params.companyName || 'OrderBridge'}</p>
        </div>
      </div>
    </body>
    </html>
  `

  const attachments = params.pdfBuffer ? [{
    filename: `Invoice-${params.invoiceNumber}.pdf`,
    content: params.pdfBuffer,
    contentType: 'application/pdf'
  }] : undefined

  return sendEmail({
    to: params.to,
    subject: `Invoice ${params.invoiceNumber} - ${params.currency} ${params.amount}`,
    html,
    attachments
  })
}

// Quote email
export async function sendQuoteEmail(params: {
  to: string
  customerName: string
  quoteNumber: string
  amount: string
  currency: string
  validUntil: string
  pdfBuffer?: Buffer
  companyName?: string
}) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1d1d1f; }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #0071e3; }
        .card { background: #f5f5f7; border-radius: 12px; padding: 24px; margin: 20px 0; }
        .amount { font-size: 32px; font-weight: bold; color: #1d1d1f; }
        .label { font-size: 14px; color: #86868b; margin-bottom: 4px; }
        .value { font-size: 16px; color: #1d1d1f; font-weight: 500; }
        .button { display: inline-block; background: #34c759; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; }
        .footer { text-align: center; margin-top: 40px; color: #86868b; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">${params.companyName || 'OrderBridge'}</div>
        </div>
        
        <h2>Quote ${params.quoteNumber}</h2>
        <p>Hello ${params.customerName},</p>
        <p>Thank you for your interest! Please find your quote details below:</p>
        
        <div class="card">
          <div class="label">Quote Total</div>
          <div class="amount">${params.currency} ${params.amount}</div>
          <div style="margin-top: 16px;">
            <div class="label">Valid Until</div>
            <div class="value">${params.validUntil}</div>
          </div>
        </div>
        
        <p>This quote is valid until the date shown above. To proceed, please contact us or reply to this email.</p>
        
        <div class="footer">
          <p>This email was sent by ${params.companyName || 'OrderBridge'}</p>
        </div>
      </div>
    </body>
    </html>
  `

  const attachments = params.pdfBuffer ? [{
    filename: `Quote-${params.quoteNumber}.pdf`,
    content: params.pdfBuffer,
    contentType: 'application/pdf'
  }] : undefined

  return sendEmail({
    to: params.to,
    subject: `Quote ${params.quoteNumber} - ${params.currency} ${params.amount}`,
    html,
    attachments
  })
}

// Order confirmation email
export async function sendOrderConfirmationEmail(params: {
  to: string
  customerName: string
  orderNumber: string
  orderDate: string
  items: Array<{ name: string; quantity: number; price: string }>
  total: string
  currency: string
  companyName?: string
}) {
  const itemsHtml = params.items.map(item => `
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px solid #e5e5e5;">${item.name}</td>
      <td style="padding: 8px 0; border-bottom: 1px solid #e5e5e5; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px 0; border-bottom: 1px solid #e5e5e5; text-align: right;">${params.currency} ${item.price}</td>
    </tr>
  `).join('')

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1d1d1f; }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #0071e3; }
        .card { background: #f5f5f7; border-radius: 12px; padding: 24px; margin: 20px 0; }
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; padding: 8px 0; border-bottom: 2px solid #1d1d1f; font-size: 12px; color: #86868b; text-transform: uppercase; }
        .total { font-size: 20px; font-weight: bold; }
        .footer { text-align: center; margin-top: 40px; color: #86868b; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">${params.companyName || 'OrderBridge'}</div>
        </div>
        
        <h2>Order Confirmation</h2>
        <p>Hello ${params.customerName},</p>
        <p>Thank you for your order! Here are the details:</p>
        
        <div class="card">
          <p><strong>Order:</strong> ${params.orderNumber}</p>
          <p><strong>Date:</strong> ${params.orderDate}</p>
          
          <table style="margin-top: 16px;">
            <thead>
              <tr>
                <th>Item</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          
          <div style="text-align: right; margin-top: 16px;">
            <span class="total">${params.currency} ${params.total}</span>
          </div>
        </div>
        
        <p>We'll notify you when your order ships.</p>
        
        <div class="footer">
          <p>This email was sent by ${params.companyName || 'OrderBridge'}</p>
        </div>
      </div>
    </body>
    </html>
  `

  return sendEmail({
    to: params.to,
    subject: `Order Confirmation - ${params.orderNumber}`,
    html
  })
}

// Shipping notification email
export async function sendShippingNotificationEmail(params: {
  to: string
  customerName: string
  orderNumber: string
  trackingNumber?: string
  carrier?: string
  estimatedDelivery?: string
  companyName?: string
}) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1d1d1f; }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #0071e3; }
        .card { background: #f5f5f7; border-radius: 12px; padding: 24px; margin: 20px 0; }
        .label { font-size: 14px; color: #86868b; margin-bottom: 4px; }
        .value { font-size: 16px; color: #1d1d1f; font-weight: 500; }
        .tracking { font-size: 20px; font-weight: bold; color: #0071e3; letter-spacing: 1px; }
        .footer { text-align: center; margin-top: 40px; color: #86868b; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">${params.companyName || 'OrderBridge'}</div>
        </div>
        
        <h2>🚚 Your Order Has Shipped!</h2>
        <p>Hello ${params.customerName},</p>
        <p>Great news! Your order <strong>${params.orderNumber}</strong> is on its way.</p>
        
        <div class="card">
          ${params.trackingNumber ? `
            <div class="label">Tracking Number</div>
            <div class="tracking">${params.trackingNumber}</div>
          ` : ''}
          ${params.carrier ? `
            <div style="margin-top: 16px;">
              <div class="label">Carrier</div>
              <div class="value">${params.carrier}</div>
            </div>
          ` : ''}
          ${params.estimatedDelivery ? `
            <div style="margin-top: 16px;">
              <div class="label">Estimated Delivery</div>
              <div class="value">${params.estimatedDelivery}</div>
            </div>
          ` : ''}
        </div>
        
        <div class="footer">
          <p>This email was sent by ${params.companyName || 'OrderBridge'}</p>
        </div>
      </div>
    </body>
    </html>
  `

  return sendEmail({
    to: params.to,
    subject: `Your Order ${params.orderNumber} Has Shipped!`,
    html
  })
}

// Generic notification email
export async function sendNotificationEmail(params: {
  to: string
  subject: string
  title: string
  message: string
  actionUrl?: string
  actionText?: string
  companyName?: string
}) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1d1d1f; }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #0071e3; }
        .card { background: #f5f5f7; border-radius: 12px; padding: 24px; margin: 20px 0; }
        .button { display: inline-block; background: #0071e3; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; }
        .footer { text-align: center; margin-top: 40px; color: #86868b; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">${params.companyName || 'OrderBridge'}</div>
        </div>
        
        <h2>${params.title}</h2>
        
        <div class="card">
          <p>${params.message}</p>
          ${params.actionUrl ? `
            <div style="text-align: center; margin-top: 20px;">
              <a href="${params.actionUrl}" class="button">${params.actionText || 'View Details'}</a>
            </div>
          ` : ''}
        </div>
        
        <div class="footer">
          <p>This email was sent by ${params.companyName || 'OrderBridge'}</p>
        </div>
      </div>
    </body>
    </html>
  `

  return sendEmail({
    to: params.to,
    subject: params.subject,
    html
  })
}

// Export Packing List email
export async function sendExportPackingListEmail(params: {
  to: string
  customerName: string
  packingListNumber: string
  orderReference?: string
  totalPackages: number
  totalWeight?: string
  shipmentDate?: string
  pdfBuffer?: Buffer
  companyName?: string
}) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1d1d1f; }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #0071e3; }
        .card { background: #f5f5f7; border-radius: 12px; padding: 24px; margin: 20px 0; }
        .stat { display: inline-block; margin-right: 30px; }
        .stat-value { font-size: 24px; font-weight: bold; color: #1d1d1f; }
        .stat-label { font-size: 12px; color: #86868b; text-transform: uppercase; }
        .label { font-size: 14px; color: #86868b; margin-bottom: 4px; }
        .value { font-size: 16px; color: #1d1d1f; font-weight: 500; }
        .footer { text-align: center; margin-top: 40px; color: #86868b; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">${params.companyName || 'OrderBridge'}</div>
        </div>
        
        <h2>📦 Export Packing List</h2>
        <p>Hello ${params.customerName},</p>
        <p>Please find attached the packing list for your shipment.</p>
        
        <div class="card">
          <div class="label">Packing List</div>
          <div class="value" style="font-size: 20px; font-weight: bold;">${params.packingListNumber}</div>
          
          ${params.orderReference ? `
            <div style="margin-top: 16px;">
              <div class="label">Order Reference</div>
              <div class="value">${params.orderReference}</div>
            </div>
          ` : ''}
          
          <div style="margin-top: 20px; display: flex; gap: 30px;">
            <div class="stat">
              <div class="stat-value">${params.totalPackages}</div>
              <div class="stat-label">Packages</div>
            </div>
            ${params.totalWeight ? `
              <div class="stat">
                <div class="stat-value">${params.totalWeight}</div>
                <div class="stat-label">Total Weight</div>
              </div>
            ` : ''}
          </div>
          
          ${params.shipmentDate ? `
            <div style="margin-top: 16px;">
              <div class="label">Shipment Date</div>
              <div class="value">${params.shipmentDate}</div>
            </div>
          ` : ''}
        </div>
        
        <p>Please review the attached document and contact us if you have any questions.</p>
        
        <div class="footer">
          <p>This email was sent by ${params.companyName || 'OrderBridge'}</p>
        </div>
      </div>
    </body>
    </html>
  `

  const attachments = params.pdfBuffer ? [{
    filename: `PackingList-${params.packingListNumber}.pdf`,
    content: params.pdfBuffer,
    contentType: 'application/pdf'
  }] : undefined

  return sendEmail({
    to: params.to,
    subject: `Export Packing List - ${params.packingListNumber}`,
    html,
    attachments
  })
}

// Factory Packing List email
export async function sendFactoryPackingListEmail(params: {
  to: string
  factoryName: string
  packingListNumber: string
  orderReference?: string
  totalItems: number
  productionDate?: string
  pdfBuffer?: Buffer
  companyName?: string
}) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1d1d1f; }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #0071e3; }
        .card { background: #fff3e0; border-radius: 12px; padding: 24px; margin: 20px 0; border: 1px solid #ff9500; }
        .stat { display: inline-block; margin-right: 30px; }
        .stat-value { font-size: 24px; font-weight: bold; color: #1d1d1f; }
        .stat-label { font-size: 12px; color: #86868b; text-transform: uppercase; }
        .label { font-size: 14px; color: #86868b; margin-bottom: 4px; }
        .value { font-size: 16px; color: #1d1d1f; font-weight: 500; }
        .footer { text-align: center; margin-top: 40px; color: #86868b; font-size: 12px; }
        .badge { display: inline-block; background: #ff9500; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">${params.companyName || 'OrderBridge'}</div>
        </div>
        
        <h2>🏭 Factory Packing List</h2>
        <p>Hello ${params.factoryName},</p>
        <p>Please find attached the packing list for production.</p>
        
        <div class="card">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div class="label">Packing List</div>
              <div class="value" style="font-size: 20px; font-weight: bold;">${params.packingListNumber}</div>
            </div>
            <div class="badge">FOR FACTORY</div>
          </div>
          
          ${params.orderReference ? `
            <div style="margin-top: 16px;">
              <div class="label">Order Reference</div>
              <div class="value">${params.orderReference}</div>
            </div>
          ` : ''}
          
          <div style="margin-top: 20px;">
            <div class="stat">
              <div class="stat-value">${params.totalItems}</div>
              <div class="stat-label">Total Items</div>
            </div>
          </div>
          
          ${params.productionDate ? `
            <div style="margin-top: 16px;">
              <div class="label">Production Date</div>
              <div class="value">${params.productionDate}</div>
            </div>
          ` : ''}
        </div>
        
        <p>Please review the attached document and confirm receipt.</p>
        
        <div class="footer">
          <p>This email was sent by ${params.companyName || 'OrderBridge'}</p>
        </div>
      </div>
    </body>
    </html>
  `

  const attachments = params.pdfBuffer ? [{
    filename: `FactoryPackingList-${params.packingListNumber}.pdf`,
    content: params.pdfBuffer,
    contentType: 'application/pdf'
  }] : undefined

  return sendEmail({
    to: params.to,
    subject: `Factory Packing List - ${params.packingListNumber}`,
    html,
    attachments
  })
}
