import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth, isErrorResponse } from '@/lib/tenantGuard'
import { prisma } from '@/lib/prisma'
import { softDelete } from '@/lib/trash'
import { createAuditLog, computeChanges } from '@/lib/auditLog'

// GET /api/packing-lists/[id] - Get a single packing list
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireTenantAuth()
  if (isErrorResponse(session)) return session

  const { id } = await params

  try {
    const packingList = await prisma.packingList.findFirst({
      where: { 
        id,
        companyId: session.companyId 
      },
      include: {
        shipment: {
          include: {
            orders: {
              include: {
                order: {
                  include: {
                    customer: true,
                    lines: {
                      include: {
                        product: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!packingList) {
      return NextResponse.json({ error: 'Packing list not found' }, { status: 404 })
    }

    // Load lines separately — fail-safe: returns [] if table/column mismatch
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let plLines: any[] = []
    try {
      plLines = await prisma.packingListLine.findMany({
        where: { packingListId: id },
        orderBy: { sortOrder: 'asc' },
      })
    } catch {
      // packing_list_lines table may have column naming inconsistency — try raw query
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        plLines = await (prisma as any).$queryRaw`
          SELECT 
            id,
            COALESCE("packingListId", packing_list_id) AS "packingListId",
            COALESCE("sortOrder", sort_order, 0) AS "sortOrder",
            COALESCE("productId", product_id) AS "productId",
            COALESCE("hsCode", hs_code) AS "hsCode",
            specification,
            unit,
            quantity,
            packages,
            COALESCE("packageNumber", package_number) AS "packageNumber",
            COALESCE("netWeight", net_weight) AS "netWeight",
            COALESCE("grossWeight", gross_weight) AS "grossWeight",
            cbm,
            COALESCE("groupedProductIds", grouped_product_ids) AS "groupedProductIds",
            COALESCE("isGrouped", is_grouped, false) AS "isGrouped",
            COALESCE("groupName", group_name) AS "groupName",
            COALESCE("lineNotes", line_notes) AS "lineNotes",
            COALESCE("createdAt", created_at) AS "createdAt",
            COALESCE("updatedAt", updated_at) AS "updatedAt"
          FROM packing_list_lines
          WHERE COALESCE("packingListId", packing_list_id) = ${id}
          ORDER BY COALESCE("sortOrder", sort_order, 0) ASC
        `
      } catch {
        plLines = []
      }
    }

    // Fetch direct order if orderId is set (PackingList has no order relation in schema)
    let directOrder: { id: string; orderNumber: string; customer: { companyName: string } } | null = null
    if (packingList.orderId) {
      directOrder = await prisma.order.findFirst({
        where: { id: packingList.orderId, companyId: session.companyId },
        select: { id: true, orderNumber: true, customer: { select: { companyName: true } } },
      })
    }

    // Collect order IDs (single order or from shipment)
    const orderIds: string[] = []
    if (packingList.orderId) {
      orderIds.push(packingList.orderId)
    } else if (packingList.shipment?.orders) {
      for (const so of packingList.shipment.orders) {
        if (so.order?.id) orderIds.push(so.order.id)
      }
    }

    // Fetch serial numbers for all orders
    // Wrapped in try-catch in case Prisma client hasn't been regenerated yet
    let serials: { orderLineId: string; serial: string }[] = []
    if (orderIds.length > 0) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        serials = await (prisma as any).serialNumber?.findMany({
          where: { orderId: { in: orderIds } },
          select: { orderLineId: true, serial: true },
          orderBy: [{ orderLineId: 'asc' }, { generatedAt: 'asc' }],
        }) ?? []
      } catch {
        // Serial number model not available yet — return empty
      }
    }

    // Enrich packing list with order info and lines for the frontend
    const enriched = {
      ...packingList,
      lines: plLines,
      orderNumber: directOrder?.orderNumber || null,
      customerName: directOrder?.customer?.companyName || null,
    }

    return NextResponse.json({ packingList: enriched, serials })
  } catch (error) {
    console.error('Failed to fetch packing list:', error)
    return NextResponse.json({ error: 'Failed to fetch packing list' }, { status: 500 })
  }
}

// DELETE /api/packing-lists/[id] - Delete a packing list
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

    // Verify ownership first
    const existing = await prisma.packingList.findFirst({
      where: { id, companyId: session.companyId },
      select: { id: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Packing list not found' }, { status: 404 })
    }

    // Try soft delete first; fall back to hard delete if deletedAt column doesn't exist yet
    let deleted = false
    try {
      deleted = await softDelete('packingList', id, session.userId, session.companyId!, reason)
    } catch {
      // deletedAt column may not exist in DB — fall back to hard delete
      deleted = false
    }

    if (!deleted) {
      // Hard delete as fallback (also handles missing deletedAt column)
      await prisma.packingList.delete({ where: { id } })
    }

    await createAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      action: 'DELETE',
      entityType: 'PackingList',
      entityId: id,
      request,
    }).catch(() => {}) // audit log is non-blocking

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete packing list:', error)
    return NextResponse.json({ error: 'Failed to delete packing list', details: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}

// PATCH /api/packing-lists/[id] - Update a packing list
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireTenantAuth()
  if (isErrorResponse(session)) return session

  const { id } = await params

  try {
    const body = await request.json()
    const {
      status, notes, language, totalCartons, totalWeight, totalCbm,
      // Full export PL fields
      shipper, shipperTaxId, consignee, invoiceNumber, invoiceDate,
      shippingPort, destinationPort, totalNetWeight, totalGrossWeight,
      totalPackages, groupByHsCode, headerText, footerText, customNotes,
      lines, // PackingListLine[]
      // Editable header fields
      packingListNumber, createdAt: packingListDate,
    } = body

    // Check ownership
    const existing = await prisma.packingList.findFirst({
      where: { id, companyId: session.companyId }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Packing list not found' }, { status: 404 })
    }

    // Build update data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {}
    if (status !== undefined) updateData.status = status
    if (notes !== undefined) updateData.notes = notes
    if (language !== undefined) updateData.language = language
    if (totalCartons !== undefined) updateData.totalCartons = totalCartons
    if (totalWeight !== undefined) updateData.totalWeight = totalWeight
    if (totalCbm !== undefined) updateData.totalCbm = totalCbm
    if (shipper !== undefined) updateData.shipper = shipper
    if (shipperTaxId !== undefined) updateData.shipperTaxId = shipperTaxId
    if (consignee !== undefined) updateData.consignee = consignee
    if (invoiceNumber !== undefined) updateData.invoiceNumber = invoiceNumber
    if (invoiceDate !== undefined) updateData.invoiceDate = invoiceDate ? new Date(invoiceDate) : null
    if (shippingPort !== undefined) updateData.shippingPort = shippingPort
    if (destinationPort !== undefined) updateData.destinationPort = destinationPort
    if (totalNetWeight !== undefined) updateData.totalNetWeight = totalNetWeight
    if (totalGrossWeight !== undefined) updateData.totalGrossWeight = totalGrossWeight
    if (totalPackages !== undefined) updateData.totalPackages = totalPackages
    if (groupByHsCode !== undefined) updateData.groupByHsCode = groupByHsCode
    if (headerText !== undefined) updateData.headerText = headerText
    if (footerText !== undefined) updateData.footerText = footerText
    if (customNotes !== undefined) updateData.customNotes = customNotes
    if (packingListNumber !== undefined) updateData.packingListNumber = packingListNumber
    if (packingListDate !== undefined) updateData.createdAt = new Date(packingListDate)

    // Save lines atomically: delete old, insert new
    if (lines !== undefined && Array.isArray(lines)) {
      await prisma.$transaction([
        prisma.packingListLine.deleteMany({ where: { packingListId: id } }),
        prisma.packingListLine.createMany({
          data: lines.map((l: {
            sortOrder?: number; productId?: string; hsCode?: string; specification: string;
            unit?: string; quantity?: number; packages?: number; packageNumber?: number;
            grossWeight?: number; netWeight?: number; cbm?: number;
            isGrouped?: boolean; groupedProductIds?: string; lineNotes?: string;
          }, idx: number) => ({
            packingListId: id,
            sortOrder: l.sortOrder ?? idx,
            productId: l.productId || null,
            hsCode: l.hsCode || null,
            specification: l.specification || '',
            unit: l.unit || 'PCS',
            quantity: l.quantity || 0,
            packages: l.packages || 1,
            packageNumber: l.packageNumber || null,
            grossWeight: l.grossWeight || 0,
            netWeight: l.netWeight || 0,
            cbm: l.cbm || 0,
            isGrouped: l.isGrouped || false,
            groupedProductIds: l.groupedProductIds || null,
            lineNotes: l.lineNotes || null,
          })),
        }),
      ])
    }

    const packingList = await prisma.packingList.update({
      where: { id },
      data: updateData,
      include: { lines: { orderBy: { sortOrder: 'asc' } } },
    })

    const oldData = { status: existing.status, notes: existing.notes }
    const newData = { status: packingList.status, notes: packingList.notes }
    const changes = computeChanges(
      oldData as Record<string, unknown>,
      newData as Record<string, unknown>,
      ['status', 'notes']
    )
    await createAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      action: 'UPDATE',
      entityType: 'PackingList',
      entityId: id,
      changes: changes ?? undefined,
      metadata: { packingListNumber: packingList.packingListNumber },
      request,
    })

    return NextResponse.json({ packingList })
  } catch (error) {
    console.error('Failed to update packing list:', error)
    return NextResponse.json({ error: 'Failed to update packing list' }, { status: 500 })
  }
}
