import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getApiSession } from '@/lib/auth'
import { clerkClient } from '@clerk/nextjs/server'

export async function GET(request: NextRequest) {
  try {
    const session = await getApiSession()
    if (!session?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const client = await clerkClient()
    const user = await client.users.getUser(session.userId)
    const metadata = user.publicMetadata as Record<string, unknown>
    const role = (metadata.role as string | undefined) ?? 'ADMIN'
    const customerIdFromMeta = metadata.customerId as string | undefined

    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')
    
    let effectiveCustomerId: string | null = null
    
    if (customerId && (role === 'ADMIN' || role === 'COMMERCIAL')) {
      effectiveCustomerId = customerId
    } else if (customerIdFromMeta) {
      effectiveCustomerId = customerIdFromMeta
    }
    
    if (!effectiveCustomerId) {
      return NextResponse.json({ packingLists: [] })
    }

    // Get orders for this customer first
    const customerOrders = await prisma.order.findMany({
      where: {
        companyId: session.companyId,
        customerId: effectiveCustomerId,
      },
      select: { id: true, orderNumber: true }
    })

    const orderIds = customerOrders.map(o => o.id)
    const orderMap = new Map(customerOrders.map(o => [o.id, o.orderNumber]))

    if (orderIds.length === 0) {
      return NextResponse.json({ packingLists: [] })
    }

    // Try to fetch packing lists - return empty array if table doesn't exist
    let packingLists: Array<{
      id: string
      packingListNumber: string
      type: string
      status: string
      createdAt: Date
      totalGrossWeight: number | null
      totalNetWeight: number | null
      totalCbm: number | null
      totalPackages: number | null
      orderId: string | null
      lines: Array<{ id: string; packages: number }>
    }> = []

    try {
      packingLists = await prisma.packingList.findMany({
        where: {
          orderId: { in: orderIds },
        },
        select: {
          id: true,
          packingListNumber: true,
          type: true,
          status: true,
          createdAt: true,
          totalGrossWeight: true,
          totalNetWeight: true,
          totalCbm: true,
          totalPackages: true,
          orderId: true,
          lines: {
            select: {
              id: true,
              packages: true,
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }) as typeof packingLists
    } catch (dbError) {
      // Table might not exist - return empty array
      console.log('Packing lists table not available:', dbError)
      return NextResponse.json({ packingLists: [] })
    }

    const formattedLists = packingLists.map(pl => {
      const totalItems = pl.lines.length
      const totalPackages = pl.totalPackages || pl.lines.reduce((sum, l) => sum + (l.packages || 0), 0) || 1
      
      return {
        id: pl.id,
        number: pl.packingListNumber,
        orderId: pl.orderId,
        orderNumber: pl.orderId ? orderMap.get(pl.orderId) || '' : '',
        type: pl.type.toLowerCase() as 'export' | 'factory',
        createdAt: pl.createdAt.toISOString(),
        status: pl.status.toLowerCase() as 'draft' | 'finalized',
        totalItems,
        totalPackages,
        grossWeight: Number(pl.totalGrossWeight) || 0,
        netWeight: Number(pl.totalNetWeight) || 0,
        volume: Number(pl.totalCbm) || 0,
        currency: 'EUR',
        totalValue: 0,
      }
    })

    return NextResponse.json({ packingLists: formattedLists })
  } catch (error) {
    console.error('Error fetching packing lists:', error)
    return NextResponse.json({ packingLists: [] })
  }
}
