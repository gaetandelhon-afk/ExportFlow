import { NextResponse } from 'next/server'
import { getApiSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getApiSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!session.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const products = await prisma.product.findMany({
      where: { companyId: session.companyId, isActive: true },
      select: { 
        id: true, 
        ref: true, 
        nameEn: true, 
        nameCn: true,
        priceDistributor: true,
        photoUrl: true,
        customFields: true,
        categoryId: true,
        category: {
          select: { id: true, nameEn: true, parentId: true }
        }
      },
      orderBy: { ref: 'asc' },
    })

    return NextResponse.json({ products })
  } catch (error) {
    console.error('List products error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}