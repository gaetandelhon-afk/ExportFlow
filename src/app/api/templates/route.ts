import { NextRequest, NextResponse } from 'next/server'
import { getApiSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Suggested templates that are always available
const SUGGESTED_TEMPLATES = [
  {
    id: 'suggested-invoice-classic',
    name: 'Classic Invoice',
    documentType: 'invoice',
    isSuggested: true,
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
  {
    id: 'suggested-invoice-modern',
    name: 'Modern Invoice',
    documentType: 'invoice',
    isSuggested: true,
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
  {
    id: 'suggested-invoice-compact',
    name: 'Compact Invoice',
    documentType: 'invoice',
    isSuggested: true,
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
  {
    id: 'suggested-quote-standard',
    name: 'Standard Quote',
    documentType: 'quote',
    isSuggested: true,
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
  {
    id: 'suggested-packinglist-export',
    name: 'Export Packing List',
    documentType: 'packingListExport',
    isSuggested: true,
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
  {
    id: 'suggested-packinglist-factory',
    name: 'Factory Packing List',
    documentType: 'packingListFactory',
    isSuggested: true,
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
]

// GET - List all templates for the company
export async function GET(request: NextRequest) {
  try {
    const session = await getApiSession()
    if (!session || !session.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const documentType = searchParams.get('documentType')

    // Get templates from database
    const dbTemplates = await prisma.documentTemplate.findMany({
      where: {
        companyId: session.companyId,
        ...(documentType ? { documentType } : {}),
      },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
      take: 200,
    })

    // Filter suggested templates by document type if specified
    const filteredSuggested = documentType
      ? SUGGESTED_TEMPLATES.filter(t => t.documentType === documentType)
      : SUGGESTED_TEMPLATES

    // Combine suggested and user templates
    const templates = [
      ...filteredSuggested.map(t => ({
        ...t,
        companyId: session.companyId,
        isDefault: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })),
      ...dbTemplates.map(t => ({
        ...t,
        layoutElements: t.layoutElements,
        tableColumns: t.tableColumns,
        margins: t.margins,
        displaySettings: t.displaySettings,
      })),
    ]

    return NextResponse.json({ templates })
  } catch (error) {
    console.error('Error fetching templates:', error)
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 })
  }
}

// POST - Create a new template
export async function POST(request: NextRequest) {
  try {
    const session = await getApiSession()
    if (!session || !session.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, documentType, layoutElements, tableColumns, margins, displaySettings, isDefault } = body

    if (!name || !documentType) {
      return NextResponse.json({ error: 'Name and document type are required' }, { status: 400 })
    }

    // If setting as default, unset other defaults for this document type
    if (isDefault) {
      await prisma.documentTemplate.updateMany({
        where: {
          companyId: session.companyId,
          documentType,
          isDefault: true,
        },
        data: { isDefault: false },
      })
    }

    const template = await prisma.documentTemplate.create({
      data: {
        name,
        documentType,
        companyId: session.companyId,
        layoutElements: layoutElements || null,
        tableColumns: tableColumns || null,
        margins: margins || null,
        displaySettings: displaySettings || null,
        isDefault: isDefault || false,
        isSuggested: false,
      },
    })

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Error creating template:', error)
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 })
  }
}
