import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth, isErrorResponse } from '@/lib/tenantGuard'
import { prisma } from '@/lib/prisma'

// POST /api/shipments/[id]/packing-list - Generate a packing list for a shipment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireTenantAuth()
  if (isErrorResponse(session)) return session

  const { id } = await params

  try {
    const body = await request.json()
    const { type } = body // 'EXPORT' or 'FACTORY'

    if (!type || !['EXPORT', 'FACTORY'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    // Check ownership
    const shipment = await prisma.shipment.findFirst({
      where: { id, companyId: session.companyId },
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
    })

    if (!shipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 })
    }

    // Generate packing list number
    const count = await prisma.packingList.count({
      where: { companyId: session.companyId }
    })
    const prefix = type === 'EXPORT' ? 'PL-EXP' : 'PL-FAC'
    const packingListNumber = `${prefix}-${String(count + 1).padStart(5, '0')}`

    // Get language setting for factory packing list
    let language = 'en'
    if (type === 'FACTORY') {
      // Could read from settings here
      language = 'zh'
    }

    // Collect all order lines across all orders in this shipment
    const allLines: {
      productId: string | null
      specification: string
      hsCode: string | null
      unit: string
      quantity: number
      netWeight: number
      grossWeight: number
      cbm: number
      packages: number
      sortOrder: number
    }[] = []

    let totalWeight = 0
    let sortIndex = 0

    shipment.orders.forEach(so => {
      so.order.lines.forEach(line => {
        const weight = line.product?.weightKg ? Number(line.product.weightKg) : 0
        const lineWeight = weight * line.quantity
        totalWeight += lineWeight

        const specification = line.product?.nameEn || line.product?.ref || 'Unknown Product'
        const hsCode = (line.product as { hsCode?: string })?.hsCode || null

        allLines.push({
          productId: line.product?.id || null,
          specification,
          hsCode,
          unit: 'PCS',
          quantity: line.quantity,
          netWeight: lineWeight,
          grossWeight: lineWeight * 1.05, // ~5% packaging weight
          cbm: 0,
          packages: 1,
          sortOrder: sortIndex++,
        })
      })
    })

    // Create packing list with lines in one transaction
    const packingList = await prisma.packingList.create({
      data: {
        packingListNumber,
        type,
        status: 'GENERATED',
        language,
        shipmentId: id,
        companyId: session.companyId,
        totalWeight,
        lines: {
          create: allLines,
        },
      },
    })

    return NextResponse.json({ 
      packingList: {
        id: packingList.id,
        packingListNumber: packingList.packingListNumber,
        type: packingList.type,
        status: packingList.status,
        createdAt: packingList.createdAt
      }
    })
  } catch (error) {
    console.error('Failed to generate packing list:', error)
    return NextResponse.json({ error: 'Failed to generate packing list' }, { status: 500 })
  }
}
