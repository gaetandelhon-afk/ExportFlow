import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth, isErrorResponse } from '@/lib/tenantGuard'
import { prisma } from '@/lib/prisma'

// Check whether invoice_id column exists in order_discounts (cached per process)
let invoiceIdColumnExists: boolean | null = null
async function hasInvoiceIdColumn(): Promise<boolean> {
  if (invoiceIdColumnExists !== null) return invoiceIdColumnExists
  try {
    const result = await (prisma as any).$queryRaw`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'order_discounts' AND column_name = 'invoice_id'
      LIMIT 1
    `
    invoiceIdColumnExists = Array.isArray(result) && result.length > 0
  } catch {
    invoiceIdColumnExists = false
  }
  return invoiceIdColumnExists
}

// PUT - Bulk replace discounts for a specific document
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireTenantAuth()
  if (isErrorResponse(session)) return session

  const { id } = await params
  const body = await request.json()
  const { discounts, invoiceId } = body

  if (!discounts || !Array.isArray(discounts)) {
    return NextResponse.json({ error: 'Discounts array is required' }, { status: 400 })
  }

  try {
    const order = await prisma.order.findFirst({
      where: { id, companyId: session.companyId },
      select: { id: true, subtotal: true }
    })
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    const supportsInvoiceId = invoiceId && await hasInvoiceIdColumn()
    const subtotal = Number(order.subtotal)

    // Get charges for percent_total calculation
    let chargesTotal = 0
    try {
      let charges
      if (supportsInvoiceId) {
        charges = await (prisma as any).$queryRaw`
          SELECT amount FROM order_charges WHERE order_id = ${id} AND invoice_id = ${invoiceId}
        `
      } else {
        charges = await (prisma as any).$queryRaw`
          SELECT amount FROM order_charges WHERE order_id = ${id}
        `
      }
      chargesTotal = (charges || []).reduce((sum: number, c: { amount: unknown }) => sum + Number(c.amount), 0)
    } catch { /* ignore */ }

    // Delete existing discounts using raw SQL
    if (supportsInvoiceId) {
      await (prisma as any).$executeRaw`
        DELETE FROM order_discounts WHERE order_id = ${id} AND invoice_id = ${invoiceId}
      `
    } else {
      await (prisma as any).$executeRaw`
        DELETE FROM order_discounts WHERE order_id = ${id}
      `
    }

    // Create new discounts using raw SQL
    const newDiscounts = []
    for (const d of (discounts as { description: string; type: string; value: number; amount?: number }[]).filter(d => d.value !== undefined && d.value > 0)) {
      let amount: number
      if (d.type === 'fixed') {
        amount = Number(d.value)
      } else if (typeof d.amount === 'number' && d.amount >= 0) {
        amount = d.amount
      } else if (d.type === 'percent_products') {
        amount = subtotal * (Number(d.value) / 100)
      } else if (d.type === 'percent_total') {
        amount = (subtotal + chargesTotal) * (Number(d.value) / 100)
      } else {
        amount = 0
      }

      const description = d.description?.trim() || 'Discount'
      let inserted
      if (supportsInvoiceId) {
        inserted = await (prisma as any).$queryRaw`
          INSERT INTO order_discounts (id, order_id, invoice_id, description, type, value, amount, created_at, updated_at)
          VALUES (gen_random_uuid()::text, ${id}, ${invoiceId}, ${description}, ${d.type}, ${Number(d.value)}::decimal, ${amount}::decimal, NOW(), NOW())
          RETURNING id, order_id AS "orderId", invoice_id AS "invoiceId", description, type, value, amount, created_at AS "createdAt"
        `
      } else {
        inserted = await (prisma as any).$queryRaw`
          INSERT INTO order_discounts (id, order_id, description, type, value, amount, created_at, updated_at)
          VALUES (gen_random_uuid()::text, ${id}, ${description}, ${d.type}, ${Number(d.value)}::decimal, ${amount}::decimal, NOW(), NOW())
          RETURNING id, order_id AS "orderId", description, type, value, amount, created_at AS "createdAt"
        `
      }
      if (Array.isArray(inserted) && inserted.length > 0) newDiscounts.push(inserted[0])
    }

    return NextResponse.json({ discounts: newDiscounts })
  } catch (error) {
    console.error('Error updating discounts:', error)
    return NextResponse.json({ error: 'Failed to update discounts' }, { status: 500 })
  }
}

// GET - Retrieve discounts for an order
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

    let discounts
    if (invoiceId && await hasInvoiceIdColumn()) {
      discounts = await (prisma as any).$queryRaw`
        SELECT id, order_id AS "orderId", description, type, value, amount, created_at AS "createdAt"
        FROM order_discounts
        WHERE order_id = ${id} AND invoice_id = ${invoiceId}
        ORDER BY created_at ASC
      `
    } else {
      discounts = await (prisma as any).$queryRaw`
        SELECT id, order_id AS "orderId", description, type, value, amount, created_at AS "createdAt"
        FROM order_discounts
        WHERE order_id = ${id}
        ORDER BY created_at ASC
      `
    }
    return NextResponse.json({ discounts: discounts || [] })
  } catch (error) {
    console.error('Error fetching discounts:', error)
    return NextResponse.json({ error: 'Failed to fetch discounts' }, { status: 500 })
  }
}

// DELETE - Remove discounts for a scope
export async function DELETE(
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

    if (invoiceId && await hasInvoiceIdColumn()) {
      await (prisma as any).$executeRaw`
        DELETE FROM order_discounts WHERE order_id = ${id} AND invoice_id = ${invoiceId}
      `
    } else {
      await (prisma as any).$executeRaw`
        DELETE FROM order_discounts WHERE order_id = ${id}
      `
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting discounts:', error)
    return NextResponse.json({ error: 'Failed to delete discounts' }, { status: 500 })
  }
}
