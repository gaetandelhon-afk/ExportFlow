import { NextRequest, NextResponse } from 'next/server'
import { getApiSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

// GET - Get the default template for a document type
export async function GET(request: NextRequest) {
  try {
    const session = await getApiSession()
    if (!session || !session.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const documentType = searchParams.get('documentType')

    if (!documentType) {
      return NextResponse.json({ error: 'Document type is required' }, { status: 400 })
    }

    const template = await prisma.documentTemplate.findFirst({
      where: {
        companyId: session.companyId,
        documentType,
        isDefault: true,
      },
    })

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Error fetching default template:', error)
    return NextResponse.json({ error: 'Failed to fetch default template' }, { status: 500 })
  }
}

// POST - Set a template as default
export async function POST(request: NextRequest) {
  try {
    const session = await getApiSession()
    if (!session || !session.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { templateId, documentType } = body

    if (!documentType) {
      return NextResponse.json({ error: 'Document type is required' }, { status: 400 })
    }

    // First, unset any existing default for this document type
    await prisma.documentTemplate.updateMany({
      where: {
        companyId: session.companyId,
        documentType,
        isDefault: true,
      },
      data: { isDefault: false },
    })

    // If templateId is null or empty, just clear the default
    if (!templateId) {
      return NextResponse.json({ success: true, message: 'Default cleared' })
    }

    // If templateId starts with 'suggested-', we need to create a copy of the suggested template
    if (templateId.startsWith('suggested-')) {
      const SUGGESTED_TEMPLATES: Record<string, {
        name: string
        documentType: string
        layoutElements: unknown[]
        tableColumns: unknown[]
        margins: { top: number; bottom: number; left: number; right: number }
      }> = {
        'suggested-invoice-classic': {
          name: 'Classic Invoice (Default)',
          documentType: 'invoice',
          layoutElements: [
            { id: 'logo', type: 'logo', zone: 'header-right', order: 0, visible: true },
            { id: 'companyInfo', type: 'companyInfo', zone: 'header-left', order: 0, visible: true },
            { id: 'documentTitle', type: 'documentTitle', zone: 'header-right', order: 1, visible: true },
            { id: 'documentInfo', type: 'documentInfo', zone: 'header-right', order: 2, visible: true },
            { id: 'billTo', type: 'billTo', zone: 'body-left', order: 0, visible: true },
            { id: 'bankDetails', type: 'bankDetails', zone: 'footer', order: 0, visible: true },
          ],
          tableColumns: [
            { id: 'col-row', label: '#', field: 'rowNumber', width: 5, visible: true, order: 0 },
            { id: 'col-ref', label: 'Reference', field: 'reference', width: 15, visible: true, order: 1 },
            { id: 'col-desc', label: 'Description', field: 'description', width: 35, visible: true, order: 2 },
            { id: 'col-qty', label: 'Qty', field: 'quantity', width: 10, visible: true, order: 3 },
            { id: 'col-price', label: 'Unit Price', field: 'unitPrice', width: 17, visible: true, order: 4 },
            { id: 'col-total', label: 'Total', field: 'total', width: 18, visible: true, order: 5 },
          ],
          margins: { top: 20, bottom: 20, left: 20, right: 20 },
        },
        'suggested-invoice-modern': {
          name: 'Modern Invoice (Default)',
          documentType: 'invoice',
          layoutElements: [
            { id: 'logo', type: 'logo', zone: 'header-left', order: 0, visible: true },
            { id: 'companyInfo', type: 'companyInfo', zone: 'header-left', order: 1, visible: true },
            { id: 'documentTitle', type: 'documentTitle', zone: 'header-center', order: 0, visible: true },
            { id: 'documentInfo', type: 'documentInfo', zone: 'header-right', order: 0, visible: true },
            { id: 'billTo', type: 'billTo', zone: 'header-right', order: 1, visible: true },
            { id: 'bankDetails', type: 'bankDetails', zone: 'footer', order: 0, visible: true },
          ],
          tableColumns: [
            { id: 'col-row', label: '#', field: 'rowNumber', width: 5, visible: true, order: 0 },
            { id: 'col-desc', label: 'Description', field: 'description', width: 45, visible: true, order: 1 },
            { id: 'col-qty', label: 'Qty', field: 'quantity', width: 10, visible: true, order: 2 },
            { id: 'col-price', label: 'Unit Price', field: 'unitPrice', width: 20, visible: true, order: 3 },
            { id: 'col-total', label: 'Total', field: 'total', width: 20, visible: true, order: 4 },
          ],
          margins: { top: 15, bottom: 15, left: 15, right: 15 },
        },
        'suggested-invoice-compact': {
          name: 'Compact Invoice (Default)',
          documentType: 'invoice',
          layoutElements: [
            { id: 'logo', type: 'logo', zone: 'header-left', order: 0, visible: true },
            { id: 'documentTitle', type: 'documentTitle', zone: 'header-right', order: 0, visible: true },
            { id: 'documentInfo', type: 'documentInfo', zone: 'header-right', order: 1, visible: true },
            { id: 'companyInfo', type: 'companyInfo', zone: 'header-left', order: 1, visible: false },
            { id: 'billTo', type: 'billTo', zone: 'header-left', order: 2, visible: true },
            { id: 'bankDetails', type: 'bankDetails', zone: 'header-right', order: 2, visible: true },
          ],
          tableColumns: [
            { id: 'col-desc', label: 'Item', field: 'description', width: 50, visible: true, order: 0 },
            { id: 'col-qty', label: 'Qty', field: 'quantity', width: 15, visible: true, order: 1 },
            { id: 'col-price', label: 'Price', field: 'unitPrice', width: 17, visible: true, order: 2 },
            { id: 'col-total', label: 'Total', field: 'total', width: 18, visible: true, order: 3 },
          ],
          margins: { top: 10, bottom: 10, left: 10, right: 10 },
        },
        'suggested-quote-standard': {
          name: 'Standard Quote (Default)',
          documentType: 'quote',
          layoutElements: [
            { id: 'logo', type: 'logo', zone: 'header-right', order: 0, visible: true },
            { id: 'companyInfo', type: 'companyInfo', zone: 'header-left', order: 0, visible: true },
            { id: 'documentTitle', type: 'documentTitle', zone: 'header-right', order: 1, visible: true },
            { id: 'documentInfo', type: 'documentInfo', zone: 'header-right', order: 2, visible: true },
            { id: 'billTo', type: 'billTo', zone: 'body-left', order: 0, visible: true },
            { id: 'bankDetails', type: 'bankDetails', zone: 'footer', order: 0, visible: false },
          ],
          tableColumns: [
            { id: 'col-row', label: '#', field: 'rowNumber', width: 5, visible: true, order: 0 },
            { id: 'col-ref', label: 'Reference', field: 'reference', width: 15, visible: true, order: 1 },
            { id: 'col-desc', label: 'Description', field: 'description', width: 35, visible: true, order: 2 },
            { id: 'col-qty', label: 'Qty', field: 'quantity', width: 10, visible: true, order: 3 },
            { id: 'col-price', label: 'Unit Price', field: 'unitPrice', width: 17, visible: true, order: 4 },
            { id: 'col-total', label: 'Total', field: 'total', width: 18, visible: true, order: 5 },
          ],
          margins: { top: 20, bottom: 20, left: 20, right: 20 },
        },
        'suggested-packinglist-export': {
          name: 'Export Packing List (Default)',
          documentType: 'packingListExport',
          layoutElements: [
            { id: 'logo', type: 'logo', zone: 'header-left', order: 0, visible: true },
            { id: 'companyInfo', type: 'companyInfo', zone: 'header-left', order: 1, visible: true },
            { id: 'documentTitle', type: 'documentTitle', zone: 'header-center', order: 0, visible: true },
            { id: 'documentInfo', type: 'documentInfo', zone: 'header-right', order: 0, visible: true },
            { id: 'billTo', type: 'billTo', zone: 'header-right', order: 1, visible: true },
          ],
          tableColumns: [
            { id: 'col-row', label: '#', field: 'rowNumber', width: 4, visible: true, order: 0 },
            { id: 'col-hs', label: 'HS Code', field: 'hsCode', width: 10, visible: true, order: 1 },
            { id: 'col-desc', label: 'Description', field: 'description', width: 25, visible: true, order: 2 },
            { id: 'col-unit', label: 'Unit', field: 'unit', width: 6, visible: true, order: 3 },
            { id: 'col-qty', label: 'Qty', field: 'quantity', width: 7, visible: true, order: 4 },
            { id: 'col-pkgs', label: 'Pkgs', field: 'packages', width: 7, visible: true, order: 5 },
            { id: 'col-gw', label: 'G.W. (Kgs)', field: 'weight', width: 12, visible: true, order: 6 },
            { id: 'col-nw', label: 'N.W. (Kgs)', field: 'netWeight', width: 12, visible: true, order: 7 },
            { id: 'col-cbm', label: 'CBM', field: 'cbm', width: 9, visible: true, order: 8 },
          ],
          margins: { top: 15, bottom: 15, left: 15, right: 15 },
        },
        'suggested-packinglist-factory': {
          name: 'Factory Packing List (Default)',
          documentType: 'packingListFactory',
          layoutElements: [
            { id: 'documentTitle', type: 'documentTitle', zone: 'header-center', order: 0, visible: true },
            { id: 'documentInfo', type: 'documentInfo', zone: 'header-right', order: 0, visible: true },
            { id: 'companyInfo', type: 'companyInfo', zone: 'header-left', order: 0, visible: false },
            { id: 'logo', type: 'logo', zone: 'header-left', order: 0, visible: false },
            { id: 'billTo', type: 'billTo', zone: 'header-left', order: 1, visible: true },
          ],
          tableColumns: [
            { id: 'col-row', label: '#', field: 'rowNumber', width: 5, visible: true, order: 0 },
            { id: 'col-ref', label: 'Ref', field: 'reference', width: 15, visible: true, order: 1 },
            { id: 'col-desc', label: 'Product', field: 'description', width: 35, visible: true, order: 2 },
            { id: 'col-qty', label: 'Qty', field: 'quantity', width: 10, visible: true, order: 3 },
            { id: 'col-pkgs', label: 'Cartons', field: 'packages', width: 10, visible: true, order: 4 },
            { id: 'col-gw', label: 'Weight', field: 'weight', width: 12, visible: true, order: 5 },
          ],
          margins: { top: 20, bottom: 20, left: 20, right: 20 },
        },
      }

      const suggestedTemplate = SUGGESTED_TEMPLATES[templateId]
      if (!suggestedTemplate) {
        return NextResponse.json({ error: 'Suggested template not found' }, { status: 404 })
      }

      const template = await prisma.documentTemplate.create({
        data: {
          name: suggestedTemplate.name,
          documentType: suggestedTemplate.documentType,
          companyId: session.companyId,
          layoutElements: suggestedTemplate.layoutElements as Prisma.InputJsonValue,
          tableColumns: suggestedTemplate.tableColumns as Prisma.InputJsonValue,
          margins: suggestedTemplate.margins as Prisma.InputJsonValue,
          isDefault: true,
          isSuggested: false,
        },
      })

      return NextResponse.json({ success: true, template })
    }

    // For user templates, just set isDefault to true
    const template = await prisma.documentTemplate.update({
      where: {
        id: templateId,
        companyId: session.companyId,
      },
      data: { isDefault: true },
    })

    return NextResponse.json({ success: true, template })
  } catch (error) {
    console.error('Error setting default template:', error)
    return NextResponse.json({ error: 'Failed to set default template' }, { status: 500 })
  }
}

// DELETE - Clear default template for a document type
export async function DELETE(request: NextRequest) {
  try {
    const session = await getApiSession()
    if (!session || !session.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const documentType = searchParams.get('documentType')

    if (!documentType) {
      return NextResponse.json({ error: 'Document type is required' }, { status: 400 })
    }

    await prisma.documentTemplate.updateMany({
      where: {
        companyId: session.companyId,
        documentType,
        isDefault: true,
      },
      data: { isDefault: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error clearing default template:', error)
    return NextResponse.json({ error: 'Failed to clear default template' }, { status: 500 })
  }
}
