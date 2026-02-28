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
      return NextResponse.json({ orders: [] })
    }

    const orders = await prisma.order.findMany({
      where: {
        companyId: session.companyId,
        customerId: effectiveCustomerId,
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        subtotal: true,
        totalAmount: true,
        currency: true,
        shippingAddress: true,
        notesEn: true,
        createdAt: true,
        customFields: true,
        lines: {
          select: {
            id: true,
            productId: true,
            quantity: true,
            unitPrice: true,
            lineTotal: true,
            productRef: true,
            productNameEn: true,
            product: {
              select: {
                id: true,
                ref: true,
                nameEn: true,
                photoUrl: true,
              }
            }
          }
        },
        history: {
          select: {
            changeType: true,
            createdAt: true,
            reason: true,
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const confirmedStatuses = ['CONFIRMED', 'PREPARING', 'READY', 'LOADING', 'SHIPPED', 'DELIVERED']
    const ordersWithSerials = orders.filter(o => confirmedStatuses.includes(o.status))
    const orderIdsWithSerials = new Set(ordersWithSerials.map(o => o.id))

    let serialsByOrder: Record<string, { orderLineId: string; serial: string }[]> = {}
    if (orderIdsWithSerials.size > 0) {
      const serialRecords = await prisma.serialNumber.findMany({
        where: { orderId: { in: Array.from(orderIdsWithSerials) } },
        select: { orderId: true, orderLineId: true, serial: true },
        orderBy: [{ orderLineId: 'asc' }, { generatedAt: 'asc' }],
      })
      for (const s of serialRecords) {
        if (!serialsByOrder[s.orderId]) serialsByOrder[s.orderId] = []
        serialsByOrder[s.orderId].push({ orderLineId: s.orderLineId, serial: s.serial })
      }
    }

    const formattedOrders = orders.map(order => {
      const customFields = order.customFields as Record<string, unknown> | null
      const orderSerials = serialsByOrder[order.id] || []

      return {
        id: order.id,
        number: order.orderNumber,
        status: order.status.toLowerCase(),
        poNumber: customFields?.poNumber as string || '',
        subtotal: Number(order.subtotal) || 0,
        shipping: 0,
        total: Number(order.totalAmount) || 0,
        currency: order.currency || 'EUR',
        shippingMethod: customFields?.shippingMethod as string || 'Sea Freight',
        shippingAddressId: null,
        billingAddressId: null,
        requestedDate: customFields?.requestedDeliveryDate as string || undefined,
        instructions: order.notesEn,
        createdAt: order.createdAt.toISOString(),
        items: order.lines.map(line => {
          const lineSerials = orderSerials.filter(s => s.orderLineId === line.id).map(s => s.serial)
          return {
            id: line.productId || line.id,
            orderLineId: line.id,
            ref: line.product?.ref || line.productRef || '',
            name: line.product?.nameEn || line.productNameEn || 'Unknown Product',
            quantity: line.quantity,
            price: Number(line.unitPrice) || 0,
            ...(lineSerials.length > 0 && { serials: lineSerials }),
          }
        }),
        statusHistory: order.history.length > 0 
          ? order.history.map(h => ({
              status: h.changeType.toLowerCase(),
              date: h.createdAt.toISOString(),
              note: h.reason,
            }))
          : [{
              status: order.status.toLowerCase(),
              date: order.createdAt.toISOString(),
            }],
      }
    })

    return NextResponse.json({ orders: formattedOrders })
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
