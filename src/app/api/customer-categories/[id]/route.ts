import { NextRequest, NextResponse } from 'next/server'
import { getApiSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { softDelete } from '@/lib/trash'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET - Get a single customer category
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getApiSession()
    if (!session?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const category = await prisma.customerCategory.findFirst({
      where: { id, companyId: session.companyId },
      include: {
        _count: { select: { customers: true } },
        parent: { select: { id: true, nameEn: true } },
        children: { select: { id: true, nameEn: true } }
      }
    })

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    return NextResponse.json({ category })
  } catch (error) {
    console.error('Get customer category error:', error)
    return NextResponse.json({ error: 'Failed to get category' }, { status: 500 })
  }
}

// PATCH - Update a customer category
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getApiSession()
    if (!session?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { nameEn, nameCn, parentId } = body

    // Verify category exists
    const existing = await prisma.customerCategory.findFirst({
      where: { id, companyId: session.companyId }
    })
    if (!existing) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    // Prevent setting self as parent
    if (parentId === id) {
      return NextResponse.json({ error: 'Category cannot be its own parent' }, { status: 400 })
    }

    // Prevent circular reference
    if (parentId) {
      const allCategories = await prisma.customerCategory.findMany({
        where: { companyId: session.companyId },
        select: { id: true, parentId: true }
      })
      const categoryMap = new Map(allCategories.map(c => [c.id, c.parentId]))
      let currentParent: string | null = parentId
      const visited = new Set<string>()
      while (currentParent) {
        if (currentParent === id || visited.has(currentParent)) {
          return NextResponse.json({ error: 'Circular reference detected' }, { status: 400 })
        }
        visited.add(currentParent)
        currentParent = categoryMap.get(currentParent) || null
      }
    }

    const updateData: Record<string, unknown> = {}
    if (nameEn !== undefined) updateData.nameEn = nameEn
    if (nameCn !== undefined) updateData.nameCn = nameCn
    if (parentId !== undefined) updateData.parentId = parentId

    const category = await prisma.customerCategory.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({ category })
  } catch (error) {
    console.error('Update customer category error:', error)
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 })
  }
}

// DELETE - Delete a customer category
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getApiSession()
    if (!session?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    let reason: string | undefined
    try {
      const body = await request.json()
      reason = body.reason
    } catch {
      // DELETE body is optional
    }

    // Verify category exists
    const category = await prisma.customerCategory.findFirst({
      where: { id, companyId: session.companyId },
      include: {
        _count: { select: { customers: true, children: true } }
      }
    })

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    // Move customers to uncategorized before soft-deleting the category
    if (category._count.customers > 0) {
      await prisma.customer.updateMany({
        where: { categoryId: id },
        data: { categoryId: null }
      })
    }

    // Move children categories to root level
    if (category._count.children > 0) {
      await prisma.customerCategory.updateMany({
        where: { parentId: id },
        data: { parentId: null }
      })
    }

    // Soft delete the category
    const deleted = await softDelete('customerCategory', id, session.userId, session.companyId, reason)
    if (!deleted) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete customer category error:', error)
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 })
  }
}
