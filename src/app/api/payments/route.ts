import { NextRequest, NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { getApiSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/auditLog'

// GET - List order payments with stats
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
    const status = searchParams.get('status')
    const orderId = searchParams.get('orderId')

    const where: Record<string, unknown> = {
      order: { companyId: session.companyId }
    }

    if (status && status !== 'all') {
      where.status = status.toUpperCase()
    }

    if (orderId) {
      where.orderId = orderId
    }

    const payments = await prisma.orderPayment.findMany({
      where,
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            customer: {
              select: {
                id: true,
                companyName: true,
                contactName: true,
                email: true
              }
            }
          }
        },
        payments: {
          orderBy: { paidAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Calculate stats
    const now = new Date()
    const totalOutstanding = payments
      .filter(p => p.status !== 'PAID')
      .reduce((sum, p) => sum + Number(p.totalAmount) - Number(p.depositPaid) - Number(p.balancePaid), 0)

    const overduePayments = payments.filter(p => {
      if (p.status === 'PAID') return false
      const depositDue = p.depositDueDate && new Date(p.depositDueDate) < now && Number(p.depositPaid) < Number(p.depositRequired || 0)
      const balanceDue = p.balanceDueDate && new Date(p.balanceDueDate) < now && Number(p.balancePaid) < Number(p.balanceRequired || 0)
      return depositDue || balanceDue
    })

    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const paidThisMonth = payments
      .filter(p => p.status === 'PAID' && new Date(p.updatedAt) >= thisMonth)
      .reduce((sum, p) => sum + Number(p.totalAmount), 0)

    const stats = {
      totalOutstanding,
      overdueCount: overduePayments.length,
      overdueAmount: overduePayments.reduce((sum, p) => {
        const remaining = Number(p.totalAmount) - Number(p.depositPaid) - Number(p.balancePaid)
        return sum + remaining
      }, 0),
      paidThisMonth,
      pending: payments.filter(p => p.status === 'PENDING').length,
      partial: payments.filter(p => p.status === 'PARTIAL').length,
      paid: payments.filter(p => p.status === 'PAID').length
    }

    return NextResponse.json({ payments, stats })

  } catch (error) {
    console.error('List payments error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    )
  }
}

// POST - Create payment tracking for an order
export async function POST(request: NextRequest) {
  try {
    const session = await getApiSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!session.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = session.role ?? 'ADMIN'
    if (role !== 'ADMIN' && role !== 'COMMERCIAL') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { 
      orderId, 
      totalAmount, 
      depositRequired, 
      depositDueDate,
      balanceRequired,
      balanceDueDate,
      currency 
    } = body

    if (!orderId || !totalAmount) {
      return NextResponse.json(
        { error: 'Order ID and total amount are required' },
        { status: 400 }
      )
    }

    // Verify order belongs to company
    const order = await prisma.order.findFirst({
      where: { id: orderId, companyId: session.companyId }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Check if payment tracking already exists
    const existing = await prisma.orderPayment.findUnique({
      where: { orderId }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Payment tracking already exists for this order', paymentId: existing.id },
        { status: 400 }
      )
    }

    // Create payment tracking
    const payment = await prisma.orderPayment.create({
      data: {
        orderId,
        totalAmount,
        depositRequired: depositRequired || null,
        depositDueDate: depositDueDate ? new Date(depositDueDate) : null,
        balanceRequired: balanceRequired || null,
        balanceDueDate: balanceDueDate ? new Date(balanceDueDate) : null,
        currency: currency || 'EUR',
        status: 'PENDING'
      }
    })

    await createAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      action: 'CREATE',
      entityType: 'Payment',
      entityId: payment.id,
      metadata: {
        orderId,
        orderNumber: order.orderNumber,
        totalAmount,
        currency: currency || 'EUR',
      },
      request,
    })

    return NextResponse.json({ payment }, { status: 201 })

  } catch (error) {
    console.error('Create payment error:', error)
    return NextResponse.json(
      { error: 'Failed to create payment tracking' },
      { status: 500 }
    )
  }
}
