import { NextRequest, NextResponse } from 'next/server'
import { getApiSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { softDelete } from '@/lib/trash'
import { createAuditLog, computeChanges } from '@/lib/auditLog'
import { TransportMethod } from '@prisma/client'

// GET /api/shipments/[id] - Get a single shipment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getApiSession()
  if (!session || !session.companyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    // First fetch shipment without packingLists (table might not exist)
    const shipment = await prisma.shipment.findFirst({
      where: { 
        id,
        companyId: session.companyId 
      },
      include: {
        orders: {
          include: {
            order: {
              include: {
                customer: true,
                lines: true
              }
            }
          }
        }
      }
    })

    if (!shipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 })
    }

    // Try to fetch packing lists separately (table might not exist yet)
    let packingLists: any[] = []
    try {
      const packingListsResult = await prisma.packingList.findMany({
        where: { shipmentId: id }
      })
      packingLists = packingListsResult
    } catch {
      // Table doesn't exist yet, return empty array
      packingLists = []
    }

    const transformed = {
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
      notes: shipment.notes,
      createdAt: shipment.createdAt,
      orders: shipment.orders.map(so => ({
        id: so.order.id,
        orderNumber: so.order.orderNumber,
        customerName: so.order.customer.companyName,
        totalAmount: Number(so.order.totalAmount),
        status: so.order.status,
        itemCount: so.order.lines.length,
        createdAt: so.order.createdAt
      })),
      packingLists: packingLists.map(pl => ({
        id: pl.id,
        packingListNumber: pl.packingListNumber,
        type: pl.type,
        status: pl.status,
        createdAt: pl.createdAt
      }))
    }

    return NextResponse.json({ shipment: transformed })
  } catch (error) {
    console.error('Failed to fetch shipment:', error)
    return NextResponse.json({ error: 'Failed to fetch shipment' }, { status: 500 })
  }
}

// PATCH /api/shipments/[id] - Update a shipment
export async function PATCH(
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
    const { 
      name,
      status,
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
      actualLoadingDate,
      estimatedArrivalDate,
      actualArrivalDate,
      archivedAt,
      notes 
    } = body

    const existing = await prisma.shipment.findFirst({
      where: { id, companyId: session.companyId }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 })
    }

    const shipment = await prisma.shipment.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(status !== undefined && { status }),
        ...(transportMethod !== undefined && { transportMethod: transportMethod as TransportMethod }),
        ...(carrierName !== undefined && { carrierName }),
        ...(trackingNumber !== undefined && { trackingNumber }),
        ...(originLocation !== undefined && { originLocation }),
        ...(destinationLocation !== undefined && { destinationLocation }),
        ...(transportDetails !== undefined && { transportDetails }),
        ...(containerNumber !== undefined && { containerNumber }),
        ...(blNumber !== undefined && { blNumber }),
        ...(vessel !== undefined && { vessel }),
        ...(portOfLoading !== undefined && { portOfLoading }),
        ...(portOfDischarge !== undefined && { portOfDischarge }),
        ...(estimatedLoadingDate !== undefined && { 
          estimatedLoadingDate: estimatedLoadingDate ? new Date(estimatedLoadingDate) : null 
        }),
        ...(actualLoadingDate !== undefined && { 
          actualLoadingDate: actualLoadingDate ? new Date(actualLoadingDate) : null 
        }),
        ...(estimatedArrivalDate !== undefined && { 
          estimatedArrivalDate: estimatedArrivalDate ? new Date(estimatedArrivalDate) : null 
        }),
        ...(actualArrivalDate !== undefined && { 
          actualArrivalDate: actualArrivalDate ? new Date(actualArrivalDate) : null 
        }),
        ...(archivedAt !== undefined && { 
          archivedAt: archivedAt ? new Date(archivedAt) : null 
        }),
        ...(notes !== undefined && { notes }),
      }
    })

    return NextResponse.json({ 
      shipment: {
        ...shipment,
        transportMethod: (shipment as any).transportMethod || 'SEA_FREIGHT',
        carrierName: (shipment as any).carrierName,
        trackingNumber: (shipment as any).trackingNumber,
        originLocation: (shipment as any).originLocation,
        destinationLocation: (shipment as any).destinationLocation,
        transportDetails: (shipment as any).transportDetails,
      }
    })
  } catch (error) {
    console.error('Failed to update shipment:', error)
    return NextResponse.json({ error: 'Failed to update shipment' }, { status: 500 })
  }
}

// DELETE /api/shipments/[id] - Delete a shipment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getApiSession()
  if (!session || !session.companyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    let reason: string | undefined
    try {
      const body = await request.json()
      reason = body.reason
    } catch {
      // DELETE body is optional
    }

    const deleted = await softDelete('shipment', id, session.userId, session.companyId!, reason)
    if (!deleted) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 })
    }

    await createAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      action: 'DELETE',
      entityType: 'Shipment',
      entityId: id,
      request,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete shipment:', error)
    return NextResponse.json({ error: 'Failed to delete shipment' }, { status: 500 })
  }
}
