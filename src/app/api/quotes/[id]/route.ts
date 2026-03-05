import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth, isErrorResponse } from '@/lib/tenantGuard'
import { prisma } from '@/lib/prisma'
import { softDelete } from '@/lib/trash'
import { createAuditLog, computeChanges } from '@/lib/auditLog'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireTenantAuth()
    if (isErrorResponse(session)) return session

    const { id } = await params
    
    const quote = await prisma.invoice.findFirst({
      where: { 
        id,
        type: 'QUOTE',
        order: { companyId: session.companyId }
      },
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

    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    // Load charges/discounts via raw SQL to avoid Prisma selecting invoice_id
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let charges: any[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let discounts: any[] = []

    if (quote.orderId) {
      try {
        charges = await (prisma as any).$queryRaw`
          SELECT id, "orderId", description, amount, "isAutomatic", "createdAt"
          FROM order_charges
          WHERE "orderId" = ${quote.orderId}
            AND invoice_id = ${id}
          ORDER BY "createdAt" ASC
        `
      } catch {
        try {
          charges = await (prisma as any).$queryRaw`
            SELECT id, "orderId", description, amount, "isAutomatic", "createdAt"
            FROM order_charges
            WHERE "orderId" = ${quote.orderId}
            ORDER BY "createdAt" ASC
          `
        } catch { charges = [] }
      }

      try {
        discounts = await (prisma as any).$queryRaw`
          SELECT id, "orderId", description, type, value, amount, "createdAt"
          FROM order_discounts
          WHERE "orderId" = ${quote.orderId}
            AND invoice_id = ${id}
          ORDER BY "createdAt" ASC
        `
      } catch {
        try {
          discounts = await (prisma as any).$queryRaw`
            SELECT id, "orderId", description, type, value, amount, "createdAt"
            FROM order_discounts
            WHERE "orderId" = ${quote.orderId}
            ORDER BY "createdAt" ASC
          `
        } catch { discounts = [] }
      }
    }

    const formattedQuote = {
      id: quote.id,
      invoiceNumber: quote.invoiceNumber,
      type: quote.type,
      status: quote.status,
      issueDate: quote.issueDate.toISOString(),
      validUntil: quote.validUntil?.toISOString() || null,
      sentAt: quote.sentAt?.toISOString() || null,
      sentTo: quote.sentTo || null,
      subtotal: Number(quote.subtotal),
      totalAmount: Number(quote.totalAmount),
      currency: quote.currency,
      pdfUrl: quote.pdfUrl,
      order: {
        id: quote.order.id,
        orderNumber: quote.order.orderNumber,
        shippingAddress: quote.order.shippingAddress,
        customer: {
          companyName: quote.order.customer.companyName,
          contactName: quote.order.customer.contactName,
          email: quote.order.customer.email,
          billingAddress: quote.order.customer.billingAddress,
          vatNumber: quote.order.customer.vatNumber || null,
        },
        lines: quote.order.lines.map(line => ({
          id: line.id,
          quantity: line.quantity,
          unitPrice: Number(line.unitPrice),
          lineTotal: Number(line.lineTotal),
          productRef: line.productRef,
          productNameEn: line.productNameEn,
          product: line.product ? {
            id: line.product.id,
            ref: line.product.ref,
            nameEn: line.product.nameEn,
            nameCn: line.product.nameCn,
          } : null
        })),
        charges: charges.map((c: { id: string; description: string; amount: unknown }) => ({
          id: c.id,
          description: c.description,
          amount: Number(c.amount),
        })),
        discounts: discounts.map((d: { id: string; description: string; type: string; value: unknown; amount: unknown }) => ({
          id: d.id,
          description: d.description,
          type: d.type,
          value: Number(d.value),
          amount: Number(d.amount),
        }))
      }
    }

    return NextResponse.json({ quote: formattedQuote })
  } catch (error) {
    console.error('Get quote error:', error)
    return NextResponse.json({ error: 'Failed to get quote' }, { status: 500 })
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
    const { status, invoiceNumber, createdAt, validUntil, issueDate } = body

    // Validate quote exists and is of type QUOTE
    const existing = await prisma.invoice.findFirst({
      where: { id, type: 'QUOTE', order: { companyId: session.companyId } },
      include: { order: true }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    // Update quote
    const updated = await prisma.invoice.update({
      where: { id },
      data: { 
        ...(status !== undefined && { status }),
        ...(invoiceNumber !== undefined && { invoiceNumber }),
        ...(createdAt !== undefined && { createdAt: new Date(createdAt) }),
        ...(issueDate !== undefined && { issueDate: new Date(issueDate) }),
        ...(validUntil !== undefined && { validUntil: validUntil ? new Date(validUntil) : null }),
      }
    })

    const changes = computeChanges(
      existing as Record<string, unknown>,
      updated as Record<string, unknown>,
      ['status', 'totalAmount', 'invoiceNumber', 'validUntil']
    )
    await createAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      action: 'UPDATE',
      entityType: 'Quote',
      entityId: id,
      changes: changes ?? undefined,
      metadata: { quoteNumber: updated.invoiceNumber },
      request,
    })

    // When quote is accepted, confirm the associated order
    if (status === 'accepted' && existing.orderId) {
      await prisma.order.update({
        where: { id: existing.orderId },
        data: { 
          status: 'CONFIRMED',
          confirmedAt: new Date()
        }
      })
    }
    
    // When quote is rejected, optionally cancel the order if it was a draft
    if (status === 'rejected' && existing.orderId && existing.order.status === 'DRAFT') {
      await prisma.order.update({
        where: { id: existing.orderId },
        data: { status: 'CANCELLED' }
      })
    }

    return NextResponse.json({ 
      quote: {
        id: updated.id,
        status: updated.status,
        orderId: existing.orderId
      }
    })
  } catch (error) {
    console.error('Update quote error:', error)
    return NextResponse.json({ error: 'Failed to update quote' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireTenantAuth()
    if (isErrorResponse(session)) return session

    const { id } = await params

    let reason: string | undefined
    try {
      const body = await request.json()
      reason = body.reason
    } catch {
      // DELETE body is optional
    }

    const deleted = await softDelete('invoice', id, session.userId, session.companyId!, reason)
    if (!deleted) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    await createAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      action: 'DELETE',
      entityType: 'Quote',
      entityId: id,
      request,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete quote error:', error)
    return NextResponse.json({ error: 'Failed to delete quote' }, { status: 500 })
  }
}
