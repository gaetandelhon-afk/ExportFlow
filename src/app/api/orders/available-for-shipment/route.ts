import { NextResponse } from 'next/server'
import { getApiSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { OrderStatus } from '@prisma/client'

// GET /api/orders/available-for-shipment - Get orders that can be added to a shipment
export async function GET() {
  const session = await getApiSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!session.companyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get orders that are CONFIRMED, PREPARING, or READY and not already in a shipment
    const orders = await prisma.order.findMany({
      where: {
        companyId: session.companyId,
        status: {
          in: [OrderStatus.CONFIRMED, OrderStatus.PREPARING, OrderStatus.READY]
        }
      },
      include: {
        customer: {
          select: {
            companyName: true
          }
        },
        lines: true
      },
      orderBy: { createdAt: 'desc' }
    })

    // Get order IDs that are already in a shipment
    let orderIdsInShipment = new Set<string>()
    try {
      const shipmentsOrders = await prisma.shipmentOrder.findMany({
        where: {
          shipment: {
            companyId: session.companyId
          }
        },
        select: {
          orderId: true
        }
      })
      orderIdsInShipment = new Set(shipmentsOrders.map(so => so.orderId))
    } catch (err: unknown) {
      // Table might not exist yet
      const error = err as { code?: string }
      if (error.code !== 'P2021') {
        throw err
      }
    }

    // Filter out orders already in a shipment
    const availableOrders = orders.filter(o => !orderIdsInShipment.has(o.id))

    const transformed = availableOrders.map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customer.companyName,
      totalAmount: Number(order.totalAmount),
      status: order.status,
      itemCount: order.lines.length,
      createdAt: order.createdAt
    }))

    return NextResponse.json({ orders: transformed })
  } catch (error) {
    console.error('Failed to fetch available orders:', error)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}
