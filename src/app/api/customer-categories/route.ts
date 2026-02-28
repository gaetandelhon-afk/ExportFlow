import { NextRequest, NextResponse } from 'next/server'
import { getApiSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - List all customer categories
export async function GET() {
  try {
    const session = await getApiSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!session.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const categories = await prisma.customerCategory.findMany({
      where: { companyId: session.companyId },
      include: {
        _count: {
          select: { customers: true }
        },
        parent: {
          select: { id: true, nameEn: true }
        },
        children: {
          select: { id: true, nameEn: true }
        }
      },
      orderBy: [
        { parentId: 'asc' },
        { sortOrder: 'asc' },
        { nameEn: 'asc' }
      ]
    })

    // Add computed fields
    const categoriesWithMeta = categories.map(cat => ({
      ...cat,
      isParent: cat.parentId === null,
      hasChildren: cat.children.length > 0
    }))

    return NextResponse.json({ categories: categoriesWithMeta })
  } catch (error) {
    console.error('List customer categories error:', error)
    return NextResponse.json({ error: 'Failed to list categories' }, { status: 500 })
  }
}

// POST - Create a new customer category
export async function POST(request: NextRequest) {
  try {
    const session = await getApiSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!session.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { nameEn, nameCn, parentId } = body

    if (!nameEn) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
    }

    // Verify parent exists if provided
    if (parentId) {
      const parent = await prisma.customerCategory.findFirst({
        where: { id: parentId, companyId: session.companyId }
      })
      if (!parent) {
        return NextResponse.json({ error: 'Parent category not found' }, { status: 400 })
      }
    }

    const category = await prisma.customerCategory.create({
      data: {
        nameEn,
        nameCn: nameCn || null,
        parentId: parentId || null,
        companyId: session.companyId,
      },
    })

    return NextResponse.json({ category })
  } catch (error) {
    console.error('Create customer category error:', error)
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
  }
}
