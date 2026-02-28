import { NextRequest, NextResponse } from 'next/server'
import { getApiSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { softDelete } from '@/lib/trash'

// GET - Get a single template
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getApiSession()
    if (!session || !session.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Check if it's a suggested template
    if (id.startsWith('suggested-')) {
      // Suggested templates are handled client-side
      return NextResponse.json({ error: 'Suggested templates are built-in' }, { status: 400 })
    }

    const template = await prisma.documentTemplate.findFirst({
      where: {
        id,
        companyId: session.companyId,
      },
    })

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Error fetching template:', error)
    return NextResponse.json({ error: 'Failed to fetch template' }, { status: 500 })
  }
}

// PUT - Update a template
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getApiSession()
    if (!session || !session.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // Cannot update suggested templates
    if (id.startsWith('suggested-')) {
      return NextResponse.json({ error: 'Cannot modify suggested templates' }, { status: 400 })
    }

    // Verify template exists and belongs to company
    const existing = await prisma.documentTemplate.findFirst({
      where: {
        id,
        companyId: session.companyId,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    const { name, layoutElements, tableColumns, margins, displaySettings, isDefault } = body

    // If setting as default, unset other defaults for this document type
    if (isDefault && !existing.isDefault) {
      await prisma.documentTemplate.updateMany({
        where: {
          companyId: session.companyId,
          documentType: existing.documentType,
          isDefault: true,
        },
        data: { isDefault: false },
      })
    }

    const template = await prisma.documentTemplate.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(layoutElements !== undefined && { layoutElements }),
        ...(tableColumns !== undefined && { tableColumns }),
        ...(margins !== undefined && { margins }),
        ...(displaySettings !== undefined && { displaySettings }),
        ...(isDefault !== undefined && { isDefault }),
      },
    })

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Error updating template:', error)
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 })
  }
}

// DELETE - Delete a template
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getApiSession()
    if (!session || !session.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Cannot delete suggested templates
    if (id.startsWith('suggested-')) {
      return NextResponse.json({ error: 'Cannot delete suggested templates' }, { status: 400 })
    }

    let reason: string | undefined
    try {
      const body = await request.json()
      reason = body.reason
    } catch {
      // DELETE body is optional
    }

    const deleted = await softDelete('documentTemplate', id, session.userId, session.companyId!, reason)
    if (!deleted) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting template:', error)
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 })
  }
}
