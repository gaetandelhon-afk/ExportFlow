import { NextRequest, NextResponse } from 'next/server'
import { getApiSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface BulkDeleteRequest {
  customerIds: string[]
}

// POST - Delete multiple customers
export async function POST(request: NextRequest) {
  try {
    const session = await getApiSession()
    if (!session?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: BulkDeleteRequest = await request.json()
    const { customerIds } = body

    if (!customerIds || customerIds.length === 0) {
      return NextResponse.json({ error: 'No customers to delete' }, { status: 400 })
    }

    const customers = await prisma.customer.findMany({
      where: {
        id: { in: customerIds },
        companyId: session.companyId,
        deletedAt: null
      },
      select: { id: true }
    })

    const validIds = customers.map(c => c.id)

    const result = await prisma.customer.updateMany({
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
      skipped: customerIds.length - validIds.length,
    })

  } catch (error) {
    console.error('Bulk delete customers error:', error)
    return NextResponse.json(
      { error: 'Failed to delete customers' },
      { status: 500 }
    )
  }
}
