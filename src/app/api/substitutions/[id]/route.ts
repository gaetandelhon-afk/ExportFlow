import { NextRequest, NextResponse } from 'next/server'
import { getApiSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/auditLog'

async function getSessionWithRole() {
  const session = await getApiSession()
  if (!session?.companyId) return null
  return { ...session, role: session.role ?? 'ADMIN' }
}

// GET - Get single substitution request
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getApiSession()
    if (!session?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const substitution = await prisma.substitutionRequest.findFirst({
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
        originalProduct: true,
        substituteProduct: true
      }
    })

    if (!substitution) {
      return NextResponse.json({ error: 'Substitution not found' }, { status: 404 })
    }

    return NextResponse.json({ substitution })

  } catch (error) {
    console.error('Get substitution error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch substitution' },
      { status: 500 }
    )
  }
}

// PUT - Update substitution request (Admin approve/reject or Customer respond)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionWithRole()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // Find existing substitution
    const existing = await prisma.substitutionRequest.findFirst({
      where: {
        id,
        order: { companyId: session.companyId }
      },
      include: {
        order: true
      }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Substitution not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}

    // Admin can update status, substitute product, admin notes
    if (session.role === 'ADMIN' || session.role === 'COMMERCIAL') {
      if (body.status) updateData.status = body.status.toUpperCase()
      if (body.substituteProductId !== undefined) updateData.substituteProductId = body.substituteProductId
      if (body.substituteQty !== undefined) updateData.substituteQty = body.substituteQty
      if (body.adminNotes !== undefined) updateData.adminNotes = body.adminNotes
      if (body.reason !== undefined) updateData.reason = body.reason
    }

    // Distributor can respond to pending substitutions
    if (session.role === 'DISTRIBUTOR') {
      if (existing.status !== 'PENDING') {
        return NextResponse.json(
          { error: 'Can only respond to pending substitutions' },
          { status: 400 }
        )
      }

      if (body.customerResponse !== undefined) {
        updateData.customerResponse = body.customerResponse
        updateData.respondedAt = new Date()
        
        // If customer approves, mark as approved
        if (body.customerResponse === 'approved') {
          updateData.status = 'APPROVED'
        } else if (body.customerResponse === 'rejected') {
          updateData.status = 'REJECTED'
        }
      }
    }

    const substitution = await prisma.substitutionRequest.update({
      where: { id },
      data: updateData,
      include: {
        originalProduct: true,
        substituteProduct: true
      }
    })

    // If approved, update the order line
    if (substitution.status === 'APPROVED' && substitution.substituteProductId && substitution.orderLineId) {
      // Get substitute product pricing - verify it belongs to tenant
      const substituteProduct = await prisma.product.findFirst({
        where: { 
          id: substitution.substituteProductId,
          companyId: session.companyId
        }
      })

      if (substituteProduct) {
        const unitPrice = Number(substituteProduct.priceDistributor || substituteProduct.priceDirect || 0)
        const quantity = substitution.substituteQty || substitution.originalQty
        
        await prisma.orderLine.update({
          where: { id: substitution.orderLineId },
          data: {
            productId: substitution.substituteProductId,
            quantity,
            unitPrice,
            lineTotal: unitPrice * quantity
          }
        })

        // Recalculate order totals
        const lines = await prisma.orderLine.findMany({
          where: { orderId: existing.orderId }
        })
        const subtotal = lines.reduce((sum, l) => sum + Number(l.lineTotal), 0)

        const charges = await prisma.orderCharge.findMany({
          where: { orderId: existing.orderId }
        })
        const totalCharges = charges.reduce((sum, c) => sum + Number(c.amount), 0)

        await prisma.order.update({
          where: { id: existing.orderId },
          data: {
            subtotal,
            totalCharges,
            totalAmount: subtotal + totalCharges
          }
        })
      }
    }

    if (existing.status !== 'APPROVED' && substitution.status === 'APPROVED') {
      await createAuditLog({
        companyId: session.companyId,
        userId: session.userId,
        action: 'APPROVE',
        entityType: 'Substitution',
        entityId: id,
        metadata: { orderId: existing.orderId, reason: substitution.reason },
        request,
      })
    } else if (existing.status !== 'REJECTED' && substitution.status === 'REJECTED') {
      await createAuditLog({
        companyId: session.companyId,
        userId: session.userId,
        action: 'REJECT',
        entityType: 'Substitution',
        entityId: id,
        metadata: { orderId: existing.orderId, reason: substitution.reason },
        request,
      })
    }

    return NextResponse.json({ substitution })

  } catch (error) {
    console.error('Update substitution error:', error)
    return NextResponse.json(
      { error: 'Failed to update substitution' },
      { status: 500 }
    )
  }
}

// DELETE - Cancel substitution request
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionWithRole()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admin can delete
    if (session.role !== 'ADMIN' && session.role !== 'COMMERCIAL') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    const existing = await prisma.substitutionRequest.findFirst({
      where: {
        id,
        order: { companyId: session.companyId }
      }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Substitution not found' }, { status: 404 })
    }

    await prisma.substitutionRequest.update({
      where: { id },
      data: { status: 'CANCELLED' }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Delete substitution error:', error)
    return NextResponse.json(
      { error: 'Failed to delete substitution' },
      { status: 500 }
    )
  }
}
