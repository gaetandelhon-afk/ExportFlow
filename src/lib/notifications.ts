import { sendNotificationEmail, sendOrderConfirmationEmail, sendShippingNotificationEmail } from './email'

interface NotificationSetting {
  id: string
  email: boolean
  inApp: boolean
}

interface NotificationSettings {
  emailEnabled: boolean
  emailFrom: string
  emailReplyTo: string
  notifications: NotificationSetting[]
}

const STORAGE_KEY = 'orderbridge_notification_settings'

function getNotificationSettings(): NotificationSettings | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch {
    // Ignore
  }
  return null
}

function isNotificationEnabled(notificationId: string, channel: 'email' | 'inApp'): boolean {
  const settings = getNotificationSettings()
  if (!settings) return true
  
  if (channel === 'email' && !settings.emailEnabled) return false
  
  const notification = settings.notifications.find(n => n.id === notificationId)
  if (!notification) return true
  
  return channel === 'email' ? notification.email : notification.inApp
}

export type NotificationType = 
  | 'new_order'
  | 'order_confirmed'
  | 'order_shipped'
  | 'payment_received'
  | 'payment_overdue'
  | 'low_stock'
  | 'new_customer'

interface SendNotificationParams {
  type: NotificationType
  to: string
  customerName?: string
  companyName?: string
  data: Record<string, string | number | undefined>
}

export async function sendNotification(params: SendNotificationParams): Promise<{ success: boolean; emailSent?: boolean }> {
  const { type, to, customerName, companyName, data } = params
  
  if (!isNotificationEnabled(type, 'email')) {
    return { success: true, emailSent: false }
  }
  
  try {
    switch (type) {
      case 'new_order':
        await sendNotificationEmail({
          to,
          subject: `New Order Received - ${data.orderNumber}`,
          title: 'New Order Received',
          message: `A new order ${data.orderNumber} has been placed by ${customerName || 'a customer'} for ${data.currency || '€'}${data.total || '0'}.`,
          actionUrl: data.orderUrl as string,
          actionText: 'View Order',
          companyName
        })
        break
        
      case 'order_confirmed':
        await sendOrderConfirmationEmail({
          to,
          customerName: customerName || 'Customer',
          orderNumber: data.orderNumber as string,
          orderDate: data.orderDate as string || new Date().toLocaleDateString(),
          items: (data.items as unknown as Array<{ name: string; quantity: number; price: string }>) || [],
          total: data.total as string || '0',
          currency: data.currency as string || 'EUR',
          companyName
        })
        break
        
      case 'order_shipped':
        await sendShippingNotificationEmail({
          to,
          customerName: customerName || 'Customer',
          orderNumber: data.orderNumber as string,
          trackingNumber: data.trackingNumber as string,
          carrier: data.carrier as string,
          estimatedDelivery: data.estimatedDelivery as string,
          companyName
        })
        break
        
      case 'payment_received':
        await sendNotificationEmail({
          to,
          subject: `Payment Received - ${data.invoiceNumber}`,
          title: 'Payment Received',
          message: `Payment of ${data.currency || '€'}${data.amount || '0'} has been received for invoice ${data.invoiceNumber}.`,
          actionUrl: data.invoiceUrl as string,
          actionText: 'View Invoice',
          companyName
        })
        break
        
      case 'payment_overdue':
        await sendNotificationEmail({
          to,
          subject: `Payment Overdue - ${data.invoiceNumber}`,
          title: 'Payment Reminder',
          message: `Invoice ${data.invoiceNumber} for ${data.currency || '€'}${data.amount || '0'} is now ${data.daysOverdue || '0'} days overdue. Please arrange payment at your earliest convenience.`,
          actionUrl: data.invoiceUrl as string,
          actionText: 'Pay Now',
          companyName
        })
        break
        
      case 'low_stock':
        await sendNotificationEmail({
          to,
          subject: `Low Stock Alert - ${data.productName}`,
          title: 'Low Stock Alert',
          message: `Product "${data.productName}" (${data.productRef}) is running low. Current stock: ${data.currentStock} units. Minimum threshold: ${data.minStock} units.`,
          actionUrl: data.productUrl as string,
          actionText: 'View Product',
          companyName
        })
        break
        
      case 'new_customer':
        await sendNotificationEmail({
          to,
          subject: `New Customer Registration - ${data.customerName}`,
          title: 'New Customer',
          message: `A new customer "${data.customerName}" has registered. Company: ${data.companyName || 'N/A'}. Email: ${data.customerEmail || 'N/A'}.`,
          actionUrl: data.customerUrl as string,
          actionText: 'View Customer',
          companyName
        })
        break
        
      default:
        console.warn(`Unknown notification type: ${type}`)
        return { success: false }
    }
    
    return { success: true, emailSent: true }
  } catch (error) {
    console.error(`Failed to send ${type} notification:`, error)
    return { success: false }
  }
}

export async function sendBulkNotifications(
  type: NotificationType,
  recipients: string[],
  data: Record<string, string | number | undefined>,
  companyName?: string
): Promise<{ success: boolean; sent: number; failed: number }> {
  let sent = 0
  let failed = 0
  
  for (const to of recipients) {
    const result = await sendNotification({
      type,
      to,
      companyName,
      data
    })
    
    if (result.success) {
      sent++
    } else {
      failed++
    }
  }
  
  return { success: failed === 0, sent, failed }
}
