import { NextRequest, NextResponse } from 'next/server'
import { getApiSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { softDelete } from '@/lib/trash'

interface DeleteCategoryRequest {
  deleteProducts?: boolean
}

// GET - Get single category
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getApiSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!session.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const category = await prisma.category.findFirst({
      where: {
        id,
        companyId: session.companyId
      },
      include: {
        _count: {
          select: { products: true }
        },
        children: true,
        parent: true
      }
    })

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    return NextResponse.json(category)

  } catch (error) {
    console.error('Get category error:', error)
    return NextResponse.json(
      { error: 'Failed to get category' },
      { status: 500 }
    )
  }
}

// DELETE - Delete category
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getApiSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!session.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body: DeleteCategoryRequest & { reason?: string } = await request.json().catch(() => ({}))
    const deleteProducts = body.deleteProducts ?? false
    const reason = body.reason

    // Verify category exists and belongs to company
    const category = await prisma.category.findFirst({
      where: {
        id,
        companyId: session.companyId
      },
      include: {
        _count: {
          select: { products: true }
        },
        children: true
      }
    })

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    // Handle products
    if (deleteProducts) {
      // Soft delete (archive) all products in this category to preserve order history
      await prisma.product.updateMany({
        where: {
          categoryId: id,
          companyId: session.companyId
        },
        data: {
          isActive: false,
          categoryId: null
        }
      })
      
      // Also archive products in child categories
      if (category.children && category.children.length > 0) {
        const childIds = category.children.map(c => c.id)
        await prisma.product.updateMany({
          where: {
            categoryId: { in: childIds },
            companyId: session.companyId
          },
          data: {
            isActive: false,
            categoryId: null
          }
        })
      }
    } else {
      // Move products to uncategorized (set categoryId to null)
      await prisma.product.updateMany({
        where: {
          categoryId: id,
          companyId: session.companyId
        },
        data: {
          categoryId: null
        }
      })
      
      // Also move products from child categories
      if (category.children && category.children.length > 0) {
        const childIds = category.children.map(c => c.id)
        await prisma.product.updateMany({
          where: {
            categoryId: { in: childIds },
            companyId: session.companyId
          },
          data: {
            categoryId: null
          }
        })
      }
    }

    // Soft delete child categories first
    if (category.children && category.children.length > 0) {
      for (const child of category.children) {
        await softDelete('category', child.id, session.userId, session.companyId, reason)
      }
    }

    // Soft delete the category
    const deleted = await softDelete('category', id, session.userId, session.companyId, reason)
    if (!deleted) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: `Category "${category.nameEn}" deleted successfully`,
      productsAffected: category._count.products
    })

  } catch (error) {
    console.error('Delete category error:', error)
    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    )
  }
}

// PATCH - Update category
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getApiSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!session.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // Verify category exists and belongs to company
    const category = await prisma.category.findFirst({
      where: {
        id,
        companyId: session.companyId
      }
    })

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        nameEn: body.nameEn,
        nameCn: body.nameCn,
        parentId: body.parentId
      }
    })

    return NextResponse.json(updated)

  } catch (error) {
    console.error('Update category error:', error)
    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 }
    )
  }
}
