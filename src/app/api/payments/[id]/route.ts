import { NextRequest, NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { getApiSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Get single payment tracking
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getApiSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!session.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const payment = await prisma.orderPayment.findFirst({
      where: {
        id,
        order: { companyId: session.companyId }
      },
      include: {
        order: {
          include: {
            customer: true,
            lines: {
              include: { product: true }
            }
          }
        },
        payments: {
          orderBy: { paidAt: 'desc' }
        }
      }
    })

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    return NextResponse.json({ payment })

  } catch (error) {
    console.error('Get payment error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payment' },
      { status: 500 }
    )
  }
}

// PUT - Update payment tracking
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params
    const body = await request.json()

    const existing = await prisma.orderPayment.findFirst({
      where: {
        id,
        order: { companyId: session.companyId }
      }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}

    if (body.depositRequired !== undefined) updateData.depositRequired = body.depositRequired
    if (body.depositDueDate !== undefined) updateData.depositDueDate = body.depositDueDate ? new Date(body.depositDueDate) : null
    if (body.balanceRequired !== undefined) updateData.balanceRequired = body.balanceRequired
    if (body.balanceDueDate !== undefined) updateData.balanceDueDate = body.balanceDueDate ? new Date(body.balanceDueDate) : null
    if (body.status !== undefined) updateData.status = body.status

    const payment = await prisma.orderPayment.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({ payment })

  } catch (error) {
    console.error('Update payment error:', error)
    return NextResponse.json(
      { error: 'Failed to update payment' },
      { status: 500 }
    )
  }
}
