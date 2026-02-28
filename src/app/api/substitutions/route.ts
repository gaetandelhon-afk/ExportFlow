import { NextRequest, NextResponse } from 'next/server'
import { getApiSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/auditLog'

async function getSessionWithRole() {
  const session = await getApiSession()
  if (!session?.companyId) return null
  return { ...session, role: session.role ?? 'ADMIN' }
}

// GET - List substitution requests
export async function GET(request: NextRequest) {
  try {
    const session = await getApiSession()
    if (!session?.companyId) {
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

    const substitutions = await prisma.substitutionRequest.findMany({
      where,
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
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
        originalProduct: {
          select: {
            id: true,
            ref: true,
            nameEn: true,
            photoUrl: true
          }
        },
        substituteProduct: {
          select: {
            id: true,
            ref: true,
            nameEn: true,
            photoUrl: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Calculate stats
    const stats = {
      pending: substitutions.filter(s => s.status === 'PENDING').length,
      approved: substitutions.filter(s => s.status === 'APPROVED').length,
      rejected: substitutions.filter(s => s.status === 'REJECTED').length,
      total: substitutions.length
    }

    return NextResponse.json({ substitutions, stats })

  } catch (error) {
    console.error('List substitutions error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch substitutions' },
      { status: 500 }
    )
  }
}

// POST - Create substitution request
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionWithRole()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admin/commercial can create substitutions
    if (session.role !== 'ADMIN' && session.role !== 'COMMERCIAL') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { orderId, orderLineId, originalProductId, substituteProductId, originalQty, substituteQty, reason } = body

    if (!orderId || !originalProductId || !originalQty) {
      return NextResponse.json(
        { error: 'Order ID, original product, and quantity are required' },
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

    // Create substitution request
    const substitution = await prisma.substitutionRequest.create({
      data: {
        orderId,
        orderLineId: orderLineId || null,
        originalProductId,
        substituteProductId: substituteProductId || null,
        originalQty,
        substituteQty: substituteQty || null,
        reason: reason || 'Out of stock',
        status: 'PENDING'
      },
      include: {
        originalProduct: true,
        substituteProduct: true
      }
    })

    return NextResponse.json({ substitution }, { status: 201 })

  } catch (error) {
    console.error('Create substitution error:', error)
    return NextResponse.json(
      { error: 'Failed to create substitution request' },
      { status: 500 }
    )
  }
}
