import { NextRequest, NextResponse } from 'next/server'
import { getApiSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/shipments/[id]/packing-list - Generate a packing list for a shipment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getApiSession()
  if (!session || !session.companyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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

    // Calculate totals
    let totalWeight = 0
    shipment.orders.forEach(so => {
      so.order.lines.forEach(line => {
        const weight = line.product?.weightKg ? Number(line.product.weightKg) : 0
        totalWeight += weight * line.quantity
      })
    })

    // Create packing list
    const packingList = await prisma.packingList.create({
      data: {
        packingListNumber,
        type,
        status: 'GENERATED',
        language,
        shipmentId: id,
        companyId: session.companyId,
        totalWeight,
        // TODO: Generate PDF and store URL
      }
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
