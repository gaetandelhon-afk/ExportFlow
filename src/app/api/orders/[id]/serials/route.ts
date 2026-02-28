import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireTenantAuth, isErrorResponse } from '@/lib/tenantGuard'
import { checkSerialConflicts, generateUniqueSerial } from '@/lib/serialGenerator'
import { createAuditLog } from '@/lib/auditLog'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireTenantAuth()
    if (isErrorResponse(session)) return session

    const { id: orderId } = await params

    // Verify order belongs to company
    const order = await prisma.order.findFirst({
      where: { id: orderId, companyId: session.companyId },
      select: { id: true },
    })
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const serials = await prisma.serialNumber.findMany({
      where: { orderId },
      select: {
        id: true,
        serial: true,
        orderLineId: true,
        productId: true,
        generatedAt: true,
        generatedBy: true,
        product: { select: { nameEn: true, ref: true } },
      },
      orderBy: [{ orderLineId: 'asc' }, { generatedAt: 'asc' }],
    })

    return NextResponse.json({ serials })
  } catch (error) {
    console.error('Get serials error:', error)
    return NextResponse.json({ error: 'Failed to fetch serials' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireTenantAuth()
    if (isErrorResponse(session)) return session

    const { id: orderId } = await params
    const body = await request.json()
    const { serials } = body as {
      serials: { orderLineId: string; productId: string; serial: string }[]
    }

    if (!serials || !Array.isArray(serials) || serials.length === 0) {
      return NextResponse.json({ error: 'serials array is required' }, { status: 400 })
    }

    // Verify order belongs to company
    const order = await prisma.order.findFirst({
      where: { id: orderId, companyId: session.companyId },
      include: {
        lines: {
          include: {
            product: { select: { id: true, requiresSerial: true, nameEn: true, ref: true } },
          },
        },
      },
    })
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Validate all required lines have all serials provided
    const requiredLines = order.lines.filter(l => l.product?.requiresSerial)
    for (const line of requiredLines) {
      const lineSerials = serials.filter(s => s.orderLineId === line.id)
      if (lineSerials.length < line.quantity) {
        return NextResponse.json(
          {
            error: `Missing serials for "${line.product?.nameEn || line.productRef}": ${lineSerials.length}/${line.quantity} provided`,
          },
          { status: 400 }
        )
      }
    }

    // Validate no empty serials
    const emptySerial = serials.find(s => !s.serial || s.serial.trim() === '')
    if (emptySerial) {
      return NextResponse.json({ error: 'Serial cannot be empty' }, { status: 400 })
    }

    // Validate max length
    const tooLong = serials.find(s => s.serial.length > 100)
    if (tooLong) {
      return NextResponse.json(
        { error: `Serial "${tooLong.serial}" exceeds 100 characters` },
        { status: 400 }
      )
    }

    // Check uniqueness: serials in this batch must not have duplicates
    const serialValues = serials.map(s => s.serial.trim())
    const uniqueValues = new Set(serialValues)
    if (uniqueValues.size !== serialValues.length) {
      return NextResponse.json({ error: 'Duplicate serials in the submitted list' }, { status: 400 })
    }

    // Check conflicts against existing serials in DB (excluding already assigned to THIS order)
    const conflicts = await checkSerialConflicts(session.companyId, serialValues)
    // Remove serials that belong to this same order (re-saving is allowed)
    const existingForThisOrder = await prisma.serialNumber.findMany({
      where: { orderId },
      select: { serial: true },
    })
    const thisOrderSerials = new Set(existingForThisOrder.map(s => s.serial))

    const externalConflicts: Record<string, string> = {}
    for (const [serial, orderNumber] of conflicts) {
      if (!thisOrderSerials.has(serial)) {
        externalConflicts[serial] = orderNumber
      }
    }

    if (Object.keys(externalConflicts).length > 0) {
      return NextResponse.json(
        { error: 'Serial conflicts detected', conflicts: externalConflicts },
        { status: 409 }
      )
    }

    // Atomic transaction: delete old serials for this order then insert new ones
    const created = await prisma.$transaction(async (tx) => {
      await tx.serialNumber.deleteMany({ where: { orderId } })

      return tx.serialNumber.createMany({
        data: serials.map(s => ({
          serial: s.serial.trim(),
          orderLineId: s.orderLineId,
          productId: s.productId,
          companyId: session.companyId,
          orderId,
          generatedBy: session.userId,
        })),
      })
    })

    await createAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      action: 'CREATE',
      entityType: 'Order',
      entityId: orderId,
      metadata: {
        action: 'serial_assignment',
        orderNumber: order.orderNumber,
        serialCount: created.count,
      },
      request,
    })

    return NextResponse.json({ count: created.count }, { status: 201 })
  } catch (error) {
    console.error('Save serials error:', error)
    return NextResponse.json({ error: 'Failed to save serials' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireTenantAuth()
    if (isErrorResponse(session)) return session

    const { id: orderId } = await params

    const order = await prisma.order.findFirst({
      where: { id: orderId, companyId: session.companyId },
      select: { id: true, orderNumber: true },
    })
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const { count } = await prisma.serialNumber.deleteMany({
      where: { orderId },
    })

    await createAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      action: 'DELETE',
      entityType: 'Order',
      entityId: orderId,
      metadata: { action: 'serials_cleared', orderNumber: order.orderNumber, deletedCount: count },
      request,
    })

    return NextResponse.json({ count })
  } catch (error) {
    console.error('Delete serials error:', error)
    return NextResponse.json({ error: 'Failed to delete serials' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Generate serials server-side for one or more lines
  try {
    const session = await requireTenantAuth()
    if (isErrorResponse(session)) return session

    const { id: orderId } = await params
    const body = await request.json()
    const { lines } = body as {
      lines: { orderLineId: string; productId: string; quantity: number; prefix?: string | null }[]
    }

    if (!lines || lines.length === 0) {
      return NextResponse.json({ error: 'lines array is required' }, { status: 400 })
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, companyId: session.companyId },
      select: { id: true },
    })
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const generated: { orderLineId: string; productId: string; serial: string }[] = []

    for (const line of lines) {
      for (let i = 0; i < line.quantity; i++) {
        const serial = await generateUniqueSerial(session.companyId, line.prefix)
        generated.push({ orderLineId: line.orderLineId, productId: line.productId, serial })
      }
    }

    return NextResponse.json({ generated })
  } catch (error) {
    console.error('Generate serials error:', error)
    return NextResponse.json({ error: 'Failed to generate serials' }, { status: 500 })
  }
}
