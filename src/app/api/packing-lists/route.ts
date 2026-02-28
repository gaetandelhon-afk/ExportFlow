import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth, isErrorResponse } from '@/lib/tenantGuard'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/auditLog'

// GET /api/packing-lists - List all packing lists
export async function GET(request: NextRequest) {
  const session = await requireTenantAuth()
  if (isErrorResponse(session)) return session

  const { searchParams } = new URL(request.url)
  const typeFilter = searchParams.get('type') // 'EXPORT' or 'FACTORY'

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let packingLists: any[] = []
    
    try {
      packingLists = await prisma.packingList.findMany({
        where: { 
          companyId: session.companyId,
          ...(typeFilter && { type: typeFilter as 'EXPORT' | 'FACTORY' })
        },
        include: {
          shipment: {
            select: {
              shipmentNumber: true,
              orders: {
                include: {
                  order: {
                    select: {
                      customer: {
                        select: { companyName: true }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      })
    } catch (dbError: unknown) {
      // Handle case where table doesn't exist yet
      const error = dbError as { code?: string }
      if (error.code === 'P2021') {
        console.warn('PackingList table does not exist yet, returning empty list')
        return NextResponse.json({ packingLists: [] })
      }
      throw dbError
    }

    // Transform data
    const transformed = packingLists.map(pl => {
      // Get customer name from first order in shipment
      let customerName = ''
      if (pl.shipment && pl.shipment.orders.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const customers = [...new Set<string>(pl.shipment.orders.map((so: any) => String(so.order.customer.companyName)))]
        customerName = customers.length === 1 ? customers[0] : `${customers.length} customers`
      }

      return {
        id: pl.id,
        packingListNumber: pl.packingListNumber,
        type: pl.type,
        status: pl.status,
        orderId: pl.orderId,
        shipmentId: pl.shipmentId,
        shipmentNumber: pl.shipment?.shipmentNumber || null,
        customerName,
        totalWeight: pl.totalWeight ? Number(pl.totalWeight) : 0,
        totalCartons: pl.totalCartons,
        totalCbm: pl.totalCbm ? Number(pl.totalCbm) : null,
        pdfUrl: pl.pdfUrl,
        sentAt: pl.sentAt,
        sentTo: pl.sentTo,
        notes: pl.notes,
        createdAt: pl.createdAt,
        updatedAt: pl.updatedAt
      }
    })

    return NextResponse.json({ packingLists: transformed })
  } catch (error) {
    console.error('Failed to fetch packing lists:', error)
    return NextResponse.json({ error: 'Failed to fetch packing lists' }, { status: 500 })
  }
}

// POST /api/packing-lists - Create a new packing list
export async function POST(request: NextRequest) {
  const session = await requireTenantAuth()
  if (isErrorResponse(session)) return session

  try {
    const body = await request.json()
    const { type, orderId, shipmentId, language = 'en' } = body

    if (!type || !['EXPORT', 'FACTORY'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    if (!orderId && !shipmentId) {
      return NextResponse.json({ error: 'Order or shipment is required' }, { status: 400 })
    }

    // Generate packing list number
    const prefix = type === 'FACTORY' ? 'FPL' : 'EPL'
    const count = await prisma.packingList.count({
      where: { companyId: session.companyId, type }
    }).catch(() => 0)
    const packingListNumber = `${prefix}-${String(count + 1).padStart(5, '0')}`

    // Get order details if orderId provided
    let order = null
    if (orderId) {
      order = await prisma.order.findFirst({
        where: { id: orderId, companyId: session.companyId },
        include: {
          customer: true,
          lines: {
            include: { product: true }
          }
        }
      })

      if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 })
      }
    }

    // Create packing list (without lines first to avoid column mismatch)
    const packingList = await prisma.packingList.create({
      data: {
        packingListNumber,
        type,
        language,
        status: 'DRAFT',
        companyId: session.companyId,
        orderId: orderId || null,
        shipmentId: shipmentId || null,
        totalWeight: 0,
        totalCartons: 0,
      },
    })

    // Insert lines separately with fallback for column naming inconsistencies
    if (order && order.lines.length > 0) {
      const lineData = order.lines.map((line, index) => ({
        sortOrder: index,
        productId: line.productId,
        specification: line.product?.nameEn || 'Product',
        hsCode: line.product?.hsCode || null,
        quantity: line.quantity,
        unit: 'PCS',
        packages: 1,
      }))

      try {
        // Try Prisma ORM (works if columns are camelCase)
        await prisma.packingListLine.createMany({
          data: lineData.map(l => ({ ...l, packingListId: packingList.id })),
        })
      } catch {
        // Fall back to raw insert for snake_case column tables
        try {
          for (const l of lineData) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (prisma as any).$executeRaw`
              INSERT INTO packing_list_lines 
                (id, "packingListId", "sortOrder", "productId", "hsCode", specification, unit, quantity, packages, "isGrouped", "createdAt", "updatedAt")
              VALUES 
                (gen_random_uuid()::text, ${packingList.id}, ${l.sortOrder}, ${l.productId || null}, ${l.hsCode || null}, ${l.specification}, ${l.unit}, ${l.quantity}, ${l.packages}, false, NOW(), NOW())
              ON CONFLICT DO NOTHING
            `
          }
        } catch {
          // Try snake_case column names
          try {
            for (const l of lineData) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              await (prisma as any).$executeRaw`
                INSERT INTO packing_list_lines 
                  (id, packing_list_id, sort_order, product_id, hs_code, specification, unit, quantity, packages, is_grouped, created_at, updated_at)
                VALUES 
                  (gen_random_uuid()::text, ${packingList.id}, ${l.sortOrder}, ${l.productId || null}, ${l.hsCode || null}, ${l.specification}, ${l.unit}, ${l.quantity}, ${l.packages}, false, NOW(), NOW())
                ON CONFLICT DO NOTHING
              `
            }
          } catch (e) {
            console.error('[PackingList POST] Could not insert lines:', e)
          }
        }
      }
    }

    await createAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      action: 'CREATE',
      entityType: 'PackingList',
      entityId: packingList.id,
      metadata: { type, orderId: orderId || null, shipmentId: shipmentId || null },
      request,
    })

    return NextResponse.json({ packingList })
  } catch (error: unknown) {
    console.error('Failed to create packing list:', error)
    const err = error as { code?: string }
    if (err.code === 'P2021') {
      return NextResponse.json({ error: 'Packing list table not yet created. Please run database migration.' }, { status: 500 })
    }
    return NextResponse.json({ error: 'Failed to create packing list' }, { status: 500 })
  }
}
