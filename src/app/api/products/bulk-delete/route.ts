import { NextRequest, NextResponse } from 'next/server'
import { getApiSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface BulkDeleteRequest {
  productIds: string[]
}

// POST - Bulk delete products (soft delete to preserve order history)
export async function POST(request: NextRequest) {
  try {
    const session = await getApiSession()
    if (!session?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: BulkDeleteRequest = await request.json()
    const { productIds } = body

    if (!productIds || productIds.length === 0) {
      return NextResponse.json({ error: 'No products to delete' }, { status: 400 })
    }

    // Verify all products belong to this company
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        companyId: session.companyId
      },
      select: { id: true }
    })

    const validIds = products.map(p => p.id)

    if (validIds.length === 0) {
      return NextResponse.json({ error: 'No valid products found' }, { status: 404 })
    }

    const result = await prisma.product.updateMany({
      where: {
        id: { in: validIds },
        companyId: session.companyId,
        deletedAt: null
      },
      data: { deletedAt: new Date(), deletedBy: session.userId }
    })

    return NextResponse.json({
      success: true,
      deleted: result.count,
      message: `Successfully archived ${result.count} product(s)`
    })

  } catch (error) {
    console.error('Bulk delete products error:', error)
    return NextResponse.json(
      { error: 'Failed to delete products.' },
      { status: 500 }
    )
  }
}
