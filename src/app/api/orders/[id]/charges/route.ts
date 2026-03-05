import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth, isErrorResponse } from '@/lib/tenantGuard'
import { prisma } from '@/lib/prisma'

// Check whether invoice_id column exists in order_charges (cached per process)
let invoiceIdColumnExists: boolean | null = null
async function hasInvoiceIdColumn(): Promise<boolean> {
  if (invoiceIdColumnExists !== null) return invoiceIdColumnExists
  try {
    const result = await (prisma as any).$queryRaw`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'order_charges' AND column_name = 'invoice_id'
      LIMIT 1
    `
    invoiceIdColumnExists = Array.isArray(result) && result.length > 0
  } catch {
    invoiceIdColumnExists = false
  }
  return invoiceIdColumnExists
}

// GET - Retrieve charges for an order, optionally filtered by invoiceId
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireTenantAuth()
  if (isErrorResponse(session)) return session

  const { id } = await params
  const { searchParams } = new URL(request.url)
  const invoiceId = searchParams.get('invoiceId')

  try {
    const order = await prisma.order.findFirst({
      where: { id, companyId: session.companyId },
      select: { id: true }
    })
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    let charges
    if (invoiceId && await hasInvoiceIdColumn()) {
      charges = await (prisma as any).$queryRaw`
        SELECT id, "orderId", description, amount, "isAutomatic", "createdAt"
        FROM order_charges
        WHERE "orderId" = ${id} AND invoice_id = ${invoiceId}
        ORDER BY "createdAt" ASC
      `
    } else {
      charges = await (prisma as any).$queryRaw`
        SELECT id, "orderId", description, amount, "isAutomatic", "createdAt"
        FROM order_charges
        WHERE "orderId" = ${id}
        ORDER BY "createdAt" ASC
      `
    }

    return NextResponse.json({ charges: charges || [] })
  } catch (error) {
    console.error('Error fetching charges:', error)
    return NextResponse.json({ error: 'Failed to fetch charges' }, { status: 500 })
  }
}

// PUT - Bulk replace charges for a specific document
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireTenantAuth()
  if (isErrorResponse(session)) return session

  const { id } = await params
  const body = await request.json()
  const { charges, invoiceId } = body

  if (!charges || !Array.isArray(charges)) {
    return NextResponse.json({ error: 'Charges array is required' }, { status: 400 })
  }

  try {
    const order = await prisma.order.findFirst({
      where: { id, companyId: session.companyId },
      select: { id: true, subtotal: true }
    })
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    const supportsInvoiceId = invoiceId && await hasInvoiceIdColumn()

    // Delete existing charges for this scope using raw SQL
    if (supportsInvoiceId) {
      await (prisma as any).$executeRaw`
        DELETE FROM order_charges WHERE "orderId" = ${id} AND invoice_id = ${invoiceId}
      `
    } else {
      await (prisma as any).$executeRaw`
        DELETE FROM order_charges WHERE "orderId" = ${id}
      `
    }

    // Create new charges using raw SQL (avoids Prisma including invoice_id in INSERT)
    const validCharges = charges.filter(
      (c: { description?: string; amount?: number }) => c.description && c.amount !== undefined
    )

    const newCharges = []
    for (const c of validCharges as { description: string; amount: number; isAutomatic?: boolean }[]) {
      let inserted
      if (supportsInvoiceId) {
        inserted = await (prisma as any).$queryRaw`
          INSERT INTO order_charges (id, "orderId", invoice_id, description, amount, "isAutomatic", "createdAt", "updatedAt")
          VALUES (gen_random_uuid()::text, ${id}, ${invoiceId}, ${c.description}, ${c.amount}::decimal, ${c.isAutomatic || false}, NOW(), NOW())
          RETURNING id, "orderId", invoice_id AS "invoiceId", description, amount, "isAutomatic", "createdAt"
        `
      } else {
        inserted = await (prisma as any).$queryRaw`
          INSERT INTO order_charges (id, "orderId", description, amount, "isAutomatic", "createdAt", "updatedAt")
          VALUES (gen_random_uuid()::text, ${id}, ${c.description}, ${c.amount}::decimal, ${c.isAutomatic || false}, NOW(), NOW())
          RETURNING id, "orderId", description, amount, "isAutomatic", "createdAt"
        `
      }
      if (Array.isArray(inserted) && inserted.length > 0) newCharges.push(inserted[0])
    }

    // Recalculate document total
    const chargesTotal = newCharges.reduce((sum: number, c: { amount: unknown }) => sum + Number(c.amount), 0)

    let discountsTotal = 0
    try {
      let discounts
      if (supportsInvoiceId) {
        discounts = await (prisma as any).$queryRaw`
          SELECT amount FROM order_discounts WHERE "orderId" = ${id} AND invoice_id = ${invoiceId}
        `
      } else {
        discounts = await (prisma as any).$queryRaw`
          SELECT amount FROM order_discounts WHERE "orderId" = ${id}
        `
      }
      discountsTotal = (discounts || []).reduce((sum: number, d: { amount: unknown }) => sum + Number(d.amount), 0)
    } catch { /* ignore */ }

    const newTotal = Number(order.subtotal) + chargesTotal - discountsTotal

    if (invoiceId) {
      await prisma.invoice.updateMany({
        where: { id: invoiceId, orderId: id },
        data: { totalAmount: newTotal },
      })
    }

    return NextResponse.json({ charges: newCharges })
  } catch (error) {
    console.error('Error updating charges:', error)
    return NextResponse.json({ error: 'Failed to update charges' }, { status: 500 })
  }
}

// DELETE - Remove a specific charge by chargeId
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireTenantAuth()
  if (isErrorResponse(session)) return session

  const { id } = await params
  const { searchParams } = new URL(request.url)
  const chargeId = searchParams.get('chargeId')

  if (!chargeId) {
    return NextResponse.json({ error: 'Charge ID is required' }, { status: 400 })
  }

  try {
    const order = await prisma.order.findFirst({
      where: { id, companyId: session.companyId },
      select: { id: true }
    })
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    await (prisma as any).$executeRaw`DELETE FROM order_charges WHERE id = ${chargeId}`
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting charge:', error)
    return NextResponse.json({ error: 'Failed to delete charge' }, { status: 500 })
  }
}
