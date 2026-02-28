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

    const categories = await prisma.category.findMany({
      where: { companyId: session.companyId },
      include: {
        _count: {
          select: { products: true }
        },
        parent: {
          select: { id: true, nameEn: true }
        },
        children: {
          select: { id: true, nameEn: true }
        }
      },
      orderBy: [{ sortOrder: 'asc' }, { nameEn: 'asc' }],
    })

    // Transform to include parentId and hierarchy info
    const transformedCategories = categories.map(cat => ({
      id: cat.id,
      nameEn: cat.nameEn,
      nameCn: cat.nameCn,
      parentId: cat.parentId,
      sortOrder: cat.sortOrder,
      parent: cat.parent,
      children: cat.children,
      _count: cat._count,
      isParent: !cat.parentId,
      hasChildren: cat.children.length > 0
    }))

    return NextResponse.json({ categories: transformedCategories })
  } catch (error) {
    console.error('Failed to fetch categories:', error)
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
  }
}
