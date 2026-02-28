import { NextRequest, NextResponse } from 'next/server'
import { getApiSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/auditLog'

// GET /api/shipments - List all shipments
export async function GET(request: NextRequest) {
  const session = await getApiSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!session.companyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const showArchived = searchParams.get('archived') === 'true'

  try {
    const shipments = await prisma.shipment.findMany({
      where: { 
        companyId: session.companyId,
        archivedAt: showArchived ? { not: null } : null
      },
      include: {
        orders: {
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                totalAmount: true,
                status: true,
                createdAt: true,
                customer: {
                  select: {
                    id: true,
                    companyName: true,
                    country: true,
                  }
                }
              }
            }
          }
        }
      },
      orderBy: showArchived ? { archivedAt: 'desc' } : { createdAt: 'desc' },
      take: 200,
    })

    const transformed = shipments.map(shipment => {
      const customers = Array.from(new Set(shipment.orders.map(so => ({
        id: so.order.customer.id,
        name: so.order.customer.companyName,
        country: so.order.customer.country || null,
        city: ((so.order.customer as any).city as string | undefined) || null
      }))))
      const uniqueCustomers = customers.filter((c, i, arr) => 
        arr.findIndex(x => x.id === c.id) === i
      )
      
      return {
        id: shipment.id,
        shipmentNumber: shipment.shipmentNumber,
        name: shipment.name,
        status: shipment.status,
        transportMethod: (shipment as any).transportMethod || 'SEA_FREIGHT',
        carrierName: (shipment as any).carrierName || null,
        trackingNumber: (shipment as any).trackingNumber || null,
        originLocation: (shipment as any).originLocation || null,
        destinationLocation: (shipment as any).destinationLocation || null,
        transportDetails: (shipment as any).transportDetails || null,
        containerNumber: shipment.containerNumber,
        blNumber: shipment.blNumber,
        vessel: shipment.vessel,
        portOfLoading: shipment.portOfLoading,
        portOfDischarge: shipment.portOfDischarge,
        estimatedLoadingDate: shipment.estimatedLoadingDate,
        actualLoadingDate: shipment.actualLoadingDate,
        estimatedArrivalDate: shipment.estimatedArrivalDate,
        actualArrivalDate: shipment.actualArrivalDate,
        archivedAt: (shipment as any).archivedAt || null,
        notes: shipment.notes,
        createdAt: shipment.createdAt,
        customers: uniqueCustomers,
        orders: shipment.orders.map(so => ({
          id: so.order.id,
          orderNumber: so.order.orderNumber,
          customerName: so.order.customer.companyName,
          customerId: so.order.customer.id,
          customerCountry: so.order.customer.country || null,
          totalAmount: Number(so.order.totalAmount),
          status: so.order.status,
          createdAt: so.order.createdAt
        }))
      }
    })

    return NextResponse.json({ shipments: transformed })
  } catch (error) {
    console.error('Failed to fetch shipments:', error)
    return NextResponse.json({ error: 'Failed to fetch shipments' }, { status: 500 })
  }
}

// POST /api/shipments - Create a new shipment
export async function POST(request: NextRequest) {
  const session = await getApiSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!session.companyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { 
      name, 
      orderIds,
      transportMethod,
      carrierName,
      trackingNumber,
      originLocation,
      destinationLocation,
      transportDetails,
      containerNumber, 
      blNumber,
      vessel,
      portOfLoading,
      portOfDischarge,
      estimatedLoadingDate,
      estimatedArrivalDate,
      notes 
    } = body

    const count = await prisma.shipment.count({
      where: { companyId: session.companyId }
    })
    const shipmentNumber = `SHP-${String(count + 1).padStart(5, '0')}`

    // Try with new fields first, fallback to legacy fields only
    let shipment
    try {
      shipment = await prisma.shipment.create({
        data: {
          shipmentNumber,
          name: name || null,
          companyId: session.companyId,
          transportMethod: transportMethod || 'SEA_FREIGHT',
          carrierName: carrierName || null,
          trackingNumber: trackingNumber || null,
          originLocation: originLocation || null,
          destinationLocation: destinationLocation || null,
          transportDetails: transportDetails || null,
          containerNumber: containerNumber || null,
          blNumber: blNumber || null,
          vessel: vessel || null,
          portOfLoading: portOfLoading || null,
          portOfDischarge: portOfDischarge || null,
          estimatedLoadingDate: estimatedLoadingDate ? new Date(estimatedLoadingDate) : null,
          estimatedArrivalDate: estimatedArrivalDate ? new Date(estimatedArrivalDate) : null,
          notes: notes || null,
          orders: {
            create: (orderIds || []).map((orderId: string) => ({
              orderId
            }))
          }
        } as any,
        include: {
          orders: {
            include: {
              order: {
                include: {
                  customer: true
                }
              }
            }
          }
        }
      })
    } catch (newFieldsError: any) {
      // If new fields don't exist yet, fallback to legacy fields only
      if (newFieldsError?.code === 'P2009' || newFieldsError?.message?.includes('Unknown field')) {
        console.log('New transport fields not available yet, using legacy fields only')
        shipment = await prisma.shipment.create({
          data: {
            shipmentNumber,
            name: name || null,
            companyId: session.companyId,
            containerNumber: containerNumber || null,
            blNumber: blNumber || null,
            vessel: vessel || null,
            portOfLoading: portOfLoading || originLocation || null,
            portOfDischarge: portOfDischarge || destinationLocation || null,
            estimatedLoadingDate: estimatedLoadingDate ? new Date(estimatedLoadingDate) : null,
            estimatedArrivalDate: estimatedArrivalDate ? new Date(estimatedArrivalDate) : null,
            notes: notes || null,
            orders: {
              create: (orderIds || []).map((orderId: string) => ({
                orderId
              }))
            }
          },
          include: {
            orders: {
              include: {
                order: {
                  include: {
                    customer: true
                  }
                }
              }
            }
          }
        })
      } else {
        throw newFieldsError
      }
    }

    await createAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      action: 'CREATE',
      entityType: 'Shipment',
      entityId: shipment.id,
      metadata: { shipmentNumber: shipment.shipmentNumber, orderIds: orderIds || [] },
      request,
    })

    return NextResponse.json({ 
      shipment: {
        id: shipment.id,
        shipmentNumber: shipment.shipmentNumber,
        name: shipment.name,
        status: shipment.status,
        transportMethod: (shipment as any).transportMethod || 'SEA_FREIGHT',
        carrierName: (shipment as any).carrierName || null,
        trackingNumber: (shipment as any).trackingNumber || null,
        originLocation: (shipment as any).originLocation || null,
        destinationLocation: (shipment as any).destinationLocation || null,
        transportDetails: (shipment as any).transportDetails || null,
        containerNumber: shipment.containerNumber,
        blNumber: shipment.blNumber,
        vessel: shipment.vessel,
        portOfLoading: shipment.portOfLoading,
        portOfDischarge: shipment.portOfDischarge,
        estimatedLoadingDate: shipment.estimatedLoadingDate,
        estimatedArrivalDate: shipment.estimatedArrivalDate,
        notes: shipment.notes,
        createdAt: shipment.createdAt,
        orders: shipment.orders.map(so => ({
          id: so.order.id,
          orderNumber: so.order.orderNumber,
          customerName: so.order.customer.companyName,
          totalAmount: Number(so.order.totalAmount),
          status: so.order.status
        }))
      }
    })
  } catch (error) {
    console.error('Failed to create shipment:', error)
    return NextResponse.json({ error: 'Failed to create shipment' }, { status: 500 })
  }
}
