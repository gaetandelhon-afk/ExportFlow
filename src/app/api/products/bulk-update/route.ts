import { NextRequest, NextResponse } from 'next/server'
import { getApiSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface BulkUpdateRequest {
  productIds: string[]
  updates: {
    categoryId?: string | null
  }
}

// POST - Bulk update products
export async function POST(request: NextRequest) {
  try {
    const session = await getApiSession()
    if (!session?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: BulkUpdateRequest = await request.json()
    const { productIds, updates } = body

    if (!productIds || productIds.length === 0) {
      return NextResponse.json({ error: 'No products to update' }, { status: 400 })
    }

    if (!updates || Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 })
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

    // If categoryId is provided, verify it belongs to this company (or is null)
    if (updates.categoryId !== undefined && updates.categoryId !== null) {
      const category = await prisma.category.findFirst({
        where: {
          id: updates.categoryId,
          companyId: session.companyId
        }
      })
      
      if (!category) {
        return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
      }
    }

    // Update products
    const result = await prisma.product.updateMany({
      where: {
        id: { in: validIds },
        companyId: session.companyId
      },
      data: {
        categoryId: updates.categoryId === '' ? null : updates.categoryId
      }
    })

    return NextResponse.json({
      success: true,
      updated: result.count,
      message: `Successfully updated ${result.count} product(s)`
    })

  } catch (error) {
    console.error('Bulk update products error:', error)
    return NextResponse.json(
      { error: 'Failed to update products' },
      { status: 500 }
    )
  }
}
