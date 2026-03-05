import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth, isErrorResponse } from '@/lib/tenantGuard'
import { prisma } from '@/lib/prisma'
import { softDelete } from '@/lib/trash'
import { createAuditLog, computeChanges } from '@/lib/auditLog'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireTenantAuth()
  if (isErrorResponse(session)) return session

  const { id } = await params

  try {
    // Load invoice without charges first (charges filter may fail if invoice_id column not yet in DB)
    const invoice = await prisma.invoice.findFirst({
      where: { id },
      include: {
        order: {
          include: {
            customer: true,
            lines: {
              include: { product: true }
            },
          }
        }
      }
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    if (invoice.order.companyId !== session.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Load charges/discounts via raw SQL to avoid Prisma selecting invoice_id
    // (column may not exist in DB if migration hasn't been run yet)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let charges: any[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let discounts: any[] = []

    if (invoice.orderId) {
      try {
        charges = await (prisma as any).$queryRaw`
          SELECT id, "orderId", description, amount, "isAutomatic", "createdAt"
          FROM order_charges
          WHERE "orderId" = ${invoice.orderId}
            AND invoice_id = ${id}
          ORDER BY "createdAt" ASC
        `
      } catch {
        try {
          charges = await (prisma as any).$queryRaw`
            SELECT id, "orderId", description, amount, "isAutomatic", "createdAt"
            FROM order_charges
            WHERE "orderId" = ${invoice.orderId}
            ORDER BY "createdAt" ASC
          `
        } catch { charges = [] }
      }

      try {
        discounts = await (prisma as any).$queryRaw`
          SELECT id, "orderId", description, type, value, amount, "createdAt"
          FROM order_discounts
          WHERE "orderId" = ${invoice.orderId}
            AND invoice_id = ${id}
          ORDER BY "createdAt" ASC
        `
      } catch {
        try {
          discounts = await (prisma as any).$queryRaw`
            SELECT id, "orderId", description, type, value, amount, "createdAt"
            FROM order_discounts
            WHERE "orderId" = ${invoice.orderId}
            ORDER BY "createdAt" ASC
          `
        } catch { discounts = [] }
      }
    }

    // Merge charges/discounts back into the order object for frontend compatibility
    const invoiceWithCharges = {
      ...invoice,
      order: {
        ...invoice.order,
        charges,
        discounts,
      }
    }

    // Fetch serial numbers — wrapped in try-catch
    let serials: { orderLineId: string; serial: string }[] = []
    if (invoice.orderId) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const serialRecords = await (prisma as any).serialNumber?.findMany({
          where: { orderId: invoice.orderId },
          select: { orderLineId: true, serial: true },
          orderBy: [{ orderLineId: 'asc' }, { generatedAt: 'asc' }],
        }) ?? []
        serials = serialRecords
      } catch {
        // Serial number model not available yet
      }
    }

    return NextResponse.json({ invoice: invoiceWithCharges, serials })
  } catch (error) {
    console.error('Failed to fetch invoice:', error)
    return NextResponse.json({ error: 'Failed to fetch invoice' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireTenantAuth()
  if (isErrorResponse(session)) return session

  const { id } = await params

  try {
    const body = await request.json()
    const { invoiceNumber, createdAt, validUntil, dueDate } = body

    const existing = await prisma.invoice.findFirst({
      where: { id },
      include: { order: true }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    if (existing.order.companyId !== session.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        ...(invoiceNumber !== undefined && { invoiceNumber }),
        ...(createdAt !== undefined && { createdAt: new Date(createdAt) }),
        ...(validUntil !== undefined && { validUntil: validUntil ? new Date(validUntil) : null }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      }
    })

    const changes = computeChanges(
      existing as Record<string, unknown>,
      invoice as Record<string, unknown>,
      ['invoiceNumber', 'validUntil', 'dueDate']
    )
    await createAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      action: 'UPDATE',
      entityType: 'Invoice',
      entityId: id,
      changes: changes ?? undefined,
      metadata: { invoiceNumber: invoice.invoiceNumber },
      request,
    })

    return NextResponse.json({ invoice })
  } catch (error) {
    console.error('Failed to update invoice:', error)
    return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireTenantAuth()
  if (isErrorResponse(session)) return session

  const { id } = await params

  try {
    let reason: string | undefined
    try {
      const body = await request.json()
      reason = body.reason
    } catch {
      // DELETE body is optional
    }

    // Verify ownership via order relation
    const existing = await prisma.invoice.findFirst({
      where: { id, order: { companyId: session.companyId } },
      select: { id: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Try soft delete; fall back to hard delete if deletedAt column doesn't exist yet
    let deleted = false
    try {
      deleted = await softDelete('invoice', id, session.userId, session.companyId!, reason)
    } catch {
      deleted = false
    }

    if (!deleted) {
      await prisma.invoice.delete({ where: { id } })
    }

    await createAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      action: 'DELETE',
      entityType: 'Invoice',
      entityId: id,
      request,
    }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete invoice:', error)
    return NextResponse.json({ error: 'Failed to delete invoice' }, { status: 500 })
  }
}
