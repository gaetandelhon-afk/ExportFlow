import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireTenantAuth, isErrorResponse } from '@/lib/tenantGuard'
import { createAuditLog, computeChanges } from '@/lib/auditLog'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireTenantAuth()
    if (isErrorResponse(session)) return session

    const { id } = await params

    const baseWhere = { id, companyId: session.companyId }

    // Try with serial fields first (requires prisma generate after schema update)
    let order = null
    try {
      order = await (prisma.order.findFirst as (args: object) => Promise<unknown>)({
        where: baseWhere,
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
            select: { id: true, companyName: true, contactName: true, email: true, country: true, shippingAddress: true },
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
                select: { id: true, ref: true, nameEn: true, nameCn: true, photoUrl: true, requiresSerial: true, serialPrefix: true },
              },
            },
          },
        },
      })
    } catch {
      // Fallback: query without serial fields (Prisma client not yet regenerated)
      order = await prisma.order.findFirst({
        where: baseWhere,
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
            select: { id: true, companyName: true, contactName: true, email: true, country: true, shippingAddress: true },
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
                select: { id: true, ref: true, nameEn: true, nameCn: true, photoUrl: true },
              },
            },
          },
        },
      })
    }

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Fetch order history from audit logs (safe: no FK issues, already captured in PUT)
    let history: { id: string; action: string; userEmail: string | null; changes: unknown; metadata: unknown; timestamp: Date }[] = []
    try {
      history = await prisma.auditLog.findMany({
        where: { companyId: session.companyId, entityType: 'Order', entityId: id },
        orderBy: { timestamp: 'asc' },
        take: 100,
        select: { id: true, action: true, userEmail: true, changes: true, metadata: true, timestamp: true },
      })
    } catch {
      // audit_logs table might not exist yet
    }

    return NextResponse.json({ order, history })

  } catch (error) {
    console.error('Get order error:', error)
    return NextResponse.json({ error: 'Failed to get order', details: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireTenantAuth()
    if (isErrorResponse(session)) return session

    const { id } = await params
    const body = await request.json()
    const { status, lines, notesEn, modificationReason } = body

    // Verify order belongs to this tenant BEFORE any mutation
    const verifiedOrder = await prisma.order.findFirst({
      where: { id, companyId: session.companyId },
      select: { id: true },
    })
    if (!verifiedOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // If only updating status
    if (status && !lines) {
      const oldStatus = (await prisma.order.findUnique({ where: { id: verifiedOrder.id }, select: { status: true } }))?.status
      const order = await prisma.order.update({
        where: { id: verifiedOrder.id },
        data: { status },
        select: { id: true, orderNumber: true, status: true, subtotal: true, totalAmount: true, currency: true, updatedAt: true },
      })
      await createAuditLog({
        companyId: session.companyId,
        userId: session.userId,
        action: 'UPDATE',
        entityType: 'Order',
        entityId: id,
        changes: oldStatus !== status ? { status: { old: oldStatus, new: status } } : undefined,
        metadata: { orderNumber: order.orderNumber },
        request,
      })
      return NextResponse.json({ order })
    }

    // If updating lines (editing order)
    if (lines && Array.isArray(lines)) {
      const existingOrder = await prisma.order.findFirst({
        where: { id: verifiedOrder.id, companyId: session.companyId },
        include: { lines: true }
      })

      if (!existingOrder) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 })
      }

      const existingLineIds = existingOrder.lines.map(l => l.id)
      const linesToUpdate = lines.filter((l: { id: string }) => !l.id.startsWith('new_') && existingLineIds.includes(l.id))
      const linesToAdd = lines.filter((l: { id: string }) => l.id.startsWith('new_'))
      const lineIdsInUpdate = lines.map((l: { id: string }) => l.id).filter((lineId: string) => !lineId.startsWith('new_'))
      const lineIdsToDelete = existingLineIds.filter(lineId => !lineIdsInUpdate.includes(lineId))

      let subtotal = 0
      for (const line of lines) {
        const qty = line.quantity || 0
        const price = line.unitPrice || 0
        subtotal += qty * price
      }

      if (lineIdsToDelete.length > 0) {
        await prisma.orderLine.deleteMany({
          where: { id: { in: lineIdsToDelete }, orderId: verifiedOrder.id }
        })
      }

      await prisma.$transaction([
        ...linesToUpdate.map((line: { id: string; quantity: number; unitPrice: number }) =>
          prisma.orderLine.update({
            where: { id: line.id },
            data: {
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              lineTotal: line.quantity * line.unitPrice,
            }
          })
        ),
        ...linesToAdd.map((line: { productId?: string; product?: { id?: string; ref?: string; nameEn?: string }; productRef?: string; productNameEn?: string; productNameCn?: string; quantity: number; unitPrice: number }) =>
          prisma.orderLine.create({
            data: {
              orderId: verifiedOrder.id,
              productId: line.productId || line.product?.id,
              productRef: line.productRef || line.product?.ref || '',
              productNameEn: line.productNameEn || line.product?.nameEn || '',
              productNameCn: line.productNameCn || '',
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              lineTotal: line.quantity * line.unitPrice,
            }
          })
        ),
      ])

      // Use select to avoid failures when new DB columns aren't yet synced (deletedAt, requiresSerial, etc.)
      const order = await prisma.order.update({
        where: { id: verifiedOrder.id },
        data: {
          subtotal,
          totalAmount: subtotal,
          notesEn: notesEn !== undefined ? notesEn : undefined,
        },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          subtotal: true,
          totalAmount: true,
          currency: true,
          notesEn: true,
          createdAt: true,
          updatedAt: true,
          customer: {
            select: { id: true, companyName: true, contactName: true, email: true }
          },
          lines: {
            select: {
              id: true,
              quantity: true,
              unitPrice: true,
              lineTotal: true,
              productRef: true,
              productNameEn: true,
              product: {
                select: { id: true, ref: true, nameEn: true, nameCn: true, photoUrl: true }
              }
            }
          }
        }
      })

      const changes = computeChanges(
        { subtotal: existingOrder.subtotal, notesEn: existingOrder.notesEn, lineCount: existingOrder.lines.length } as Record<string, unknown>,
        { subtotal: order.subtotal, notesEn: order.notesEn, lineCount: order.lines.length } as Record<string, unknown>,
        ['subtotal', 'notesEn', 'lineCount']
      )
      await createAuditLog({
        companyId: session.companyId,
        userId: session.userId,
        action: 'UPDATE',
        entityType: 'Order',
        entityId: id,
        changes: changes ?? undefined,
        metadata: {
          orderNumber: order.orderNumber,
          modificationReason: modificationReason || undefined,
          linesAdded: linesToAdd.length,
          linesUpdated: linesToUpdate.length,
          linesDeleted: lineIdsToDelete.length,
        },
        request,
      })

      return NextResponse.json({ order })
    }

    // Default: update provided fields (status/notes only, no lines change)
    // No audit log here — this path is only reached for minor field updates
    // not triggered by the standard "Modify Order" flow (which always sends lines)
    const order = await prisma.order.update({
      where: { id: verifiedOrder.id },
      data: {
        status: status || undefined,
        notesEn: notesEn !== undefined ? notesEn : undefined,
      },
      select: { id: true, orderNumber: true, status: true, subtotal: true, totalAmount: true, currency: true, updatedAt: true },
    })

    return NextResponse.json({ order })

  } catch (error) {
    console.error('Update order error:', error)
    return NextResponse.json({
      error: 'Failed to update order',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}