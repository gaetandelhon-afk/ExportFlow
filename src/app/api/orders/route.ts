import { NextRequest, NextResponse } from 'next/server'
import { getApiSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { OrderStatus } from '@prisma/client'
import { checkLimitNotReached, handlePlanError, PlanError, LimitError } from '@/lib/check-plan-session'
import { createAuditLog } from '@/lib/auditLog'

export async function GET(request: NextRequest) {
  try {
    const session = await getApiSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!session.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')
    const status = searchParams.get('status')
    const limit = searchParams.get('limit')

    const where: {
      companyId: string
      customerId?: string
      status?: OrderStatus | { in: OrderStatus[] }
    } = {
      companyId: session.companyId
    }

    if (customerId) {
      where.customerId = customerId
    }

    if (status) {
      // Handle multiple status values separated by comma
      if (status.includes(',')) {
        where.status = { in: status.split(',').map(s => s.trim() as OrderStatus) }
      } else {
        where.status = status as OrderStatus
      }
    }

    const orders = await prisma.order.findMany({
      where,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        version: true,
        shippingAddress: true,
        notesEn: true,
        notesCn: true,
        createdAt: true,
        updatedAt: true,
        submittedAt: true,
        confirmedAt: true,
        shippedAt: true,
        modificationDeadline: true,
        loadingDate: true,
        subtotal: true,
        totalCharges: true,
        totalAmount: true,
        currency: true,
        incoterm: true,
        exchangeRate: true,
        customFields: true,
        companyId: true,
        customerId: true,
        customer: {
          select: {
            id: true,
            companyName: true,
            contactName: true,
            email: true,
            billingAddress: true,
            shippingAddress: true,
            vatNumber: true,
            country: true
          }
        },
        lines: {
          select: {
            id: true,
            quantity: true,
            unitPrice: true,
            lineTotal: true,
            productRef: true,
            productNameEn: true,
            productNameCn: true,
            productId: true,
            product: {
              select: {
                id: true,
                ref: true,
                nameEn: true,
                nameCn: true,
                hsCode: true,
                weightKg: true,
                photoUrl: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit) : 100
    })

    // Serialize Decimal fields
    const serializedOrders = orders.map(order => ({
      ...order,
      subtotal: order.subtotal?.toString() || '0',
      totalCharges: order.totalCharges?.toString() || '0',
      totalDiscounts: '0', // Column doesn't exist yet in DB
      totalAmount: order.totalAmount?.toString() || '0',
      exchangeRate: order.exchangeRate?.toString() || null,
      lines: order.lines.map(line => ({
        ...line,
        unitPrice: line.unitPrice?.toString() || '0',
        lineTotal: line.lineTotal?.toString() || '0',
        product: line.product ? {
          ...line.product,
          weightKg: line.product.weightKg ? Number(line.product.weightKg) : null
        } : null
      }))
    }))

    return NextResponse.json({ orders: serializedOrders })

  } catch (error) {
    console.error('Get orders error:', error)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getApiSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!session.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check monthly order limit before creation
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    
    const monthlyOrderCount = await prisma.order.count({
      where: {
        companyId: session.companyId,
        createdAt: { gte: startOfMonth }
      }
    })
    await checkLimitNotReached('orders_per_month', monthlyOrderCount)

    const body = await request.json()
    const { customerId, notes, items, currency } = body

    if (!customerId || !items || items.length === 0) {
      return NextResponse.json({ error: 'Customer and items are required' }, { status: 400 })
    }
    
    // Determine the currency for this order
    // Admin orders default to CNY since catalog prices are in CNY
    // Only use explicit currency if provided
    const orderCurrency = currency || 'CNY'

    // Generate order number
    const count = await prisma.order.count({ where: { companyId: session.companyId } })
    const orderNumber = `ORD-${String(count + 1).padStart(4, '0')}`

    // Calculate totals
    const subtotal = items.reduce((sum: number, item: { quantity: number; unitPrice: number }) => 
      sum + (item.quantity * item.unitPrice), 0
    )

    // Fetch product details for snapshot
    const productIds = items.map((item: { productId: string }) => item.productId)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, ref: true, nameEn: true, nameCn: true }
    })
    const productMap = new Map(products.map(p => [p.id, p]))

    const order = await prisma.order.create({
      data: {
        orderNumber,
        status: 'PENDING',
        customerId,
        companyId: session.companyId,
        notesEn: notes || null,
        subtotal,
        totalAmount: subtotal,
        currency: orderCurrency,
        lines: {
          create: items.map((item: { productId: string; quantity: number; unitPrice: number }) => {
            const product = productMap.get(item.productId)
            return {
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              lineTotal: item.quantity * item.unitPrice,
              // Store product snapshot for historical records
              productRef: product?.ref || null,
              productNameEn: product?.nameEn || null,
              productNameCn: product?.nameCn || null,
            }
          }),
        },
      },
      include: { lines: true },
    })

    await createAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      action: 'CREATE',
      entityType: 'Order',
      entityId: order.id,
      metadata: { orderNumber: order.orderNumber, customerId, itemCount: items.length, total: subtotal },
      request,
    })

    return NextResponse.json({ order })

  } catch (error) {
    if (error instanceof PlanError || error instanceof LimitError) {
      return handlePlanError(error)
    }
    console.error('Create order error:', error)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }
}