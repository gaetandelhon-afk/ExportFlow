import jsPDF from 'jspdf'
import { CartItem, DistributorUser, Address } from '@/contexts/DistributorContext'
import { getCompanyInfo, getDocumentSettings, CompanyInfo, DocumentSettings } from '@/config/features'
import { hexToRgb, BrandingConfig } from '@/lib/branding'

// Branding colors for PDF
interface PdfBranding {
  primaryColor: [number, number, number]
  secondaryColor: [number, number, number]
  accentColor: [number, number, number]
}

// Default PDF colors (Apple blue)
const DEFAULT_PDF_BRANDING: PdfBranding = {
  primaryColor: [0, 113, 227],
  secondaryColor: [52, 199, 89],
  accentColor: [255, 149, 0]
}

// Get branding from localStorage
function getBrandingFromStorage(): BrandingConfig | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem('orderbridge_branding')
    if (stored) {
      return JSON.parse(stored)
    }
  } catch {
    // Ignore errors
  }
  return null
}

// Convert branding config to PDF colors
function brandingToPdfColors(branding?: BrandingConfig): PdfBranding {
  // If no branding passed, try to get from localStorage
  const effectiveBranding = branding || getBrandingFromStorage()
  if (!effectiveBranding) return DEFAULT_PDF_BRANDING
  return {
    primaryColor: hexToRgb(effectiveBranding.primaryColor),
    secondaryColor: hexToRgb(effectiveBranding.secondaryColor),
    accentColor: hexToRgb(effectiveBranding.accentColor)
  }
}

// ============================================
// TYPES
// ============================================

// Document display settings (from Settings > Documents)
interface DocumentDisplaySettings {
  showCompanyAddress: boolean
  showVAT: boolean
  showRegistrationNumber: boolean
  showPhone: boolean
  showEmail: boolean
  showWebsite: boolean
  showBankDetails: boolean
  headerText: string
  termsAndConditions: string
  notes: string
  footerText: string
  customFields: Array<{
    id: string
    label: string
    type: 'text' | 'select'
    defaultValue: string
    showOnInvoice: boolean
    showOnPackingList: boolean
    showOnQuote: boolean
    position?: 'header' | 'body-top' | 'body-bottom' | 'footer'
  }>
}

// Layout element configuration
interface DocumentElement {
  id: string
  type: 'logo' | 'companyInfo' | 'documentTitle' | 'documentInfo' | 'billTo' | 'bankDetails' | 'table' | 'totals' | 'termsNotes'
  zone: 'header-left' | 'header-center' | 'header-right' | 'body-left' | 'body-right' | 'footer'
  order: number
  visible: boolean
}

// Table column configuration
interface TableColumn {
  id: string
  label: string
  field: 'rowNumber' | 'hsCode' | 'reference' | 'description' | 'quantity' | 'unit' | 'unitPrice' | 'total' | 'weight' | 'netWeight' | 'packages' | 'cbm' | 'custom'
  width: number
  visible: boolean
  order: number
  customFieldId?: string
}

// Page margins configuration
interface PageMargins {
  top: number
  bottom: number
  left: number
  right: number
}

// Document layout configuration
interface DocumentLayoutConfig {
  elements: DocumentElement[]
  tableColumns: TableColumn[]
  margins: PageMargins
}

// Default layout elements
const DEFAULT_LAYOUT_ELEMENTS: DocumentElement[] = [
  { id: 'logo', type: 'logo', zone: 'header-right', order: 0, visible: true },
  { id: 'companyInfo', type: 'companyInfo', zone: 'header-left', order: 0, visible: true },
  { id: 'documentTitle', type: 'documentTitle', zone: 'header-right', order: 1, visible: true },
  { id: 'documentInfo', type: 'documentInfo', zone: 'header-right', order: 2, visible: true },
  { id: 'billTo', type: 'billTo', zone: 'body-left', order: 0, visible: true },
  { id: 'bankDetails', type: 'bankDetails', zone: 'footer', order: 0, visible: true },
  { id: 'table', type: 'table', zone: 'body-left', order: 1, visible: true },
  { id: 'totals', type: 'totals', zone: 'footer', order: 1, visible: true },
  { id: 'termsNotes', type: 'termsNotes', zone: 'footer', order: 2, visible: true },
]

// Default table columns for invoices
const DEFAULT_INVOICE_COLUMNS: TableColumn[] = [
  { id: 'col-row', label: '#', field: 'rowNumber', width: 5, visible: true, order: 0 },
  { id: 'col-desc', label: 'Description', field: 'description', width: 45, visible: true, order: 1 },
  { id: 'col-qty', label: 'Qty', field: 'quantity', width: 10, visible: true, order: 2 },
  { id: 'col-price', label: 'Unit Price', field: 'unitPrice', width: 20, visible: true, order: 3 },
  { id: 'col-total', label: 'Total', field: 'total', width: 20, visible: true, order: 4 },
]

// Default table columns for packing lists
const DEFAULT_PACKING_LIST_COLUMNS: TableColumn[] = [
  { id: 'col-row', label: '#', field: 'rowNumber', width: 4, visible: true, order: 0 },
  { id: 'col-hs', label: 'HS Code', field: 'hsCode', width: 10, visible: true, order: 1 },
  { id: 'col-desc', label: 'Description', field: 'description', width: 25, visible: true, order: 2 },
  { id: 'col-unit', label: 'Unit', field: 'unit', width: 6, visible: true, order: 3 },
  { id: 'col-qty', label: 'Qty', field: 'quantity', width: 7, visible: true, order: 4 },
  { id: 'col-pkgs', label: 'Pkgs', field: 'packages', width: 7, visible: true, order: 5 },
  { id: 'col-gw', label: 'G.W. (Kgs)', field: 'weight', width: 12, visible: true, order: 6 },
  { id: 'col-nw', label: 'N.W. (Kgs)', field: 'netWeight', width: 12, visible: true, order: 7 },
  { id: 'col-cbm', label: 'CBM', field: 'cbm', width: 9, visible: true, order: 8 },
]

// Default margins
const DEFAULT_MARGINS: PageMargins = {
  top: 20,
  bottom: 20,
  left: 20,
  right: 20
}

// Get layout configuration from localStorage
function getLayoutConfig(documentType: 'invoice' | 'quote' | 'packingListExport' | 'packingListFactory'): DocumentLayoutConfig {
  const defaultConfig: DocumentLayoutConfig = {
    elements: DEFAULT_LAYOUT_ELEMENTS,
    tableColumns: documentType.includes('packing') ? DEFAULT_PACKING_LIST_COLUMNS : DEFAULT_INVOICE_COLUMNS,
    margins: DEFAULT_MARGINS
  }
  
  if (typeof window === 'undefined') return defaultConfig
  
  try {
    const stored = localStorage.getItem('orderbridge_document_settings')
    if (stored) {
      const settings = JSON.parse(stored)
      const layoutKey = `${documentType}Layout` as keyof typeof settings
      const columnsKey = `${documentType}TableColumns` as keyof typeof settings
      
      // Get margins from settings
      const margins: PageMargins = {
        top: settings.marginTop ?? DEFAULT_MARGINS.top,
        bottom: settings.marginBottom ?? DEFAULT_MARGINS.bottom,
        left: settings.marginLeft ?? DEFAULT_MARGINS.left,
        right: settings.marginRight ?? DEFAULT_MARGINS.right
      }
      
      return {
        elements: settings[layoutKey]?.length > 0 ? settings[layoutKey] : defaultConfig.elements,
        tableColumns: settings[columnsKey]?.length > 0 ? settings[columnsKey] : defaultConfig.tableColumns,
        margins
      }
    }
  } catch {
    // Return defaults on error
  }
  
  return defaultConfig
}

// Get elements in a specific zone, sorted by order
function getZoneElements(elements: DocumentElement[], zone: DocumentElement['zone']): DocumentElement[] {
  return elements
    .filter(el => el.zone === zone && el.visible)
    .sort((a, b) => a.order - b.order)
}

// Get visible columns sorted by order
function getVisibleColumns(columns: TableColumn[]): TableColumn[] {
  return columns
    .filter(col => col.visible)
    .sort((a, b) => a.order - b.order)
}

// Calculate column X positions based on widths
function calculateColumnPositions(columns: TableColumn[], startX: number, totalWidth: number): Array<{ column: TableColumn, x: number, width: number }> {
  const visibleCols = getVisibleColumns(columns)
  const totalPercent = visibleCols.reduce((sum, col) => sum + col.width, 0)
  
  let currentX = startX
  return visibleCols.map(col => {
    const width = (col.width / totalPercent) * totalWidth
    const result = { column: col, x: currentX, width }
    currentX += width
    return result
  })
}

// Helper to render custom fields at a specific position with dynamic height
function renderCustomFields(
  doc: jsPDF,
  fields: DocumentDisplaySettings['customFields'],
  position: 'header' | 'body-top' | 'body-bottom' | 'footer',
  documentType: 'invoice' | 'quote' | 'packingList',
  startY: number,
  pageWidth: number
): number {
  // Filter fields by position and document type
  const fieldsAtPosition = fields.filter(f => {
    const correctPosition = (f.position || 'body-top') === position
    const showOnDoc = documentType === 'invoice' ? f.showOnInvoice :
                      documentType === 'quote' ? f.showOnQuote :
                      f.showOnPackingList
    return correctPosition && showOnDoc
  })
  
  if (fieldsAtPosition.length === 0) return startY
  
  let y = startY
  const colWidth = (pageWidth - 40) / 3
  const lineHeight = 4
  
  // Calculate height needed for each field (considering text wrapping)
  doc.setFontSize(8)
  const fieldHeights: number[] = []
  const wrappedValues: string[][] = []
  
  fieldsAtPosition.forEach(field => {
    const value = field.defaultValue || 'N/A'
    const wrappedLines = doc.splitTextToSize(value, colWidth - 10)
    wrappedValues.push(wrappedLines)
    // Label (5) + value lines + padding
    const fieldHeight = 5 + wrappedLines.length * lineHeight + 5
    fieldHeights.push(fieldHeight)
  })
  
  // Calculate total height needed (3 columns layout)
  const numRows = Math.ceil(fieldsAtPosition.length / 3)
  let totalHeight = 10 // padding
  
  for (let row = 0; row < numRows; row++) {
    // Get max height in this row
    let maxRowHeight = 15 // minimum row height
    for (let col = 0; col < 3; col++) {
      const idx = row * 3 + col
      if (idx < fieldHeights.length) {
        maxRowHeight = Math.max(maxRowHeight, fieldHeights[idx])
      }
    }
    totalHeight += maxRowHeight
  }
  
  // Draw background with calculated height
  doc.setFillColor(248, 248, 250)
  doc.rect(20, y - 5, pageWidth - 40, totalHeight, 'F')
  
  y += 3
  
  // Render fields
  let currentRowY = y
  for (let row = 0; row < numRows; row++) {
    let maxRowHeight = 15
    
    // First pass: render fields and calculate row height
    for (let col = 0; col < 3; col++) {
      const idx = row * 3 + col
      if (idx >= fieldsAtPosition.length) continue
      
      const field = fieldsAtPosition[idx]
      const x = 25 + col * colWidth
      
      // Label
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 100, 100)
      doc.text(field.label.toUpperCase(), x, currentRowY)
      
      // Value (wrapped)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      let valueY = currentRowY + 5
      wrappedValues[idx].forEach((line: string) => {
        doc.text(line, x, valueY)
        valueY += lineHeight
      })
      
      maxRowHeight = Math.max(maxRowHeight, fieldHeights[idx])
    }
    
    currentRowY += maxRowHeight
  }
  
  return y + totalHeight + 5
}

// Helper to render footer content (terms, notes, footer text)
function renderFooterContent(
  doc: jsPDF,
  settings: DocumentDisplaySettings,
  startY: number,
  pageWidth: number
): number {
  let y = startY
  const maxY = 280 // Leave small space for page footer at 285
  
  const termsText = (settings.termsAndConditions || '').trim()
  const notesText = (settings.notes || '').trim()
  const footerTextContent = (settings.footerText || '').trim()
  
  // Terms & Conditions
  if (termsText.length > 0) {
    y += 5
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(40, 40, 40)
    doc.text('Terms & Conditions:', 20, y)
    y += 4
    
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(60, 60, 60)
    
    const textLines = doc.splitTextToSize(termsText, pageWidth - 40)
    for (let i = 0; i < textLines.length && y < maxY; i++) {
      doc.text(textLines[i], 20, y)
      y += 3.5
    }
    y += 2
  }
  
  // Notes
  if (notesText.length > 0) {
    y += 3
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(40, 40, 40)
    doc.text('Notes:', 20, y)
    y += 4
    
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(60, 60, 60)
    
    const textLines = doc.splitTextToSize(notesText, pageWidth - 40)
    for (let i = 0; i < textLines.length && y < maxY; i++) {
      doc.text(textLines[i], 20, y)
      y += 3.5
    }
    y += 2
  }
  
  // Footer Text
  if (footerTextContent.length > 0) {
    y += 3
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(80, 80, 80)
    
    const textLines = doc.splitTextToSize(footerTextContent, pageWidth - 40)
    for (let i = 0; i < textLines.length && y < maxY; i++) {
      doc.text(textLines[i], 20, y)
      y += 3.5
    }
  }
  
  return y
}

// Interface for table row data
interface TableRowData {
  rowNumber: number
  hsCode?: string
  reference?: string
  description: string
  quantity: number
  unit?: string
  unitPrice: number
  total: number
  weight?: number  // gross weight
  netWeight?: number
  packages?: number
  cbm?: number
  customFields?: Record<string, string>
  serials?: string[]
}

// Helper to render a configurable table with word wrap support
function renderConfigurableTable(
  doc: jsPDF,
  columns: TableColumn[],
  rows: TableRowData[],
  startY: number,
  pageWidth: number,
  pdfBranding: { primaryColor: [number, number, number] },
  currencySymbol: string = '€',
  marginLeft: number = 20,
  marginRight: number = 20
): { y: number, subtotal: number } {
  const startX = marginLeft
  const tableWidth = pageWidth - marginLeft - marginRight
  const visibleCols = getVisibleColumns(columns)
  const colPositions = calculateColumnPositions(columns, startX, tableWidth)
  
  let y = startY
  
  // Calculate header height based on wrapped column names
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  let maxHeaderLines = 1
  const headerWrappedTexts: { column: TableColumn, x: number, width: number, lines: string[] }[] = []
  
  colPositions.forEach(({ column, x, width }) => {
    // Wrap column header text
    const wrappedLines = doc.splitTextToSize(column.label, width - 4)
    headerWrappedTexts.push({ column, x, width, lines: wrappedLines })
    if (wrappedLines.length > maxHeaderLines) {
      maxHeaderLines = wrappedLines.length
    }
  })
  
  const headerHeight = Math.max(10, maxHeaderLines * 4 + 6)
  
  // Table Header background
  doc.setFillColor(pdfBranding.primaryColor[0], pdfBranding.primaryColor[1], pdfBranding.primaryColor[2])
  doc.rect(startX, y, tableWidth, headerHeight, 'F')
  
  // Render wrapped column headers
  doc.setTextColor(255, 255, 255)
  headerWrappedTexts.forEach(({ column, x, width, lines }) => {
    const align = ['quantity', 'unitPrice', 'total', 'weight', 'netWeight', 'packages', 'cbm', 'rowNumber'].includes(column.field) 
      ? 'right' 
      : 'left'
    const textX = align === 'right' ? x + width - 2 : x + 2
    
    let lineY = y + 5
    lines.forEach((line: string) => {
      doc.text(line, textX, lineY, { align } as { align: 'left' | 'center' | 'right' | 'justify' })
      lineY += 4
    })
  })
  
  y += headerHeight + 3
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'normal')
  
  // Render rows with word wrap for descriptions
  let subtotal = 0
  rows.forEach((row, idx) => {
    // First, calculate row height based on description wrap
    let rowHeight = 10 // minimum row height
    let descriptionLines: string[] = []
    
    // Check if description needs wrapping
    const descCol = colPositions.find(c => c.column.field === 'description')
    if (descCol) {
      doc.setFontSize(8)
      descriptionLines = doc.splitTextToSize(row.description, descCol.width - 4)
      let neededHeight = descriptionLines.length * 4 + 6
      if (row.serials && row.serials.length > 0) {
        neededHeight += 6
      }
      rowHeight = Math.max(rowHeight, neededHeight)
    }
    
    // Alternating background
    if (idx % 2 === 0) {
      doc.setFillColor(248, 248, 250)
      doc.rect(startX, y - 4, tableWidth, rowHeight, 'F')
    }
    
    subtotal += row.total
    
    doc.setFontSize(8)
    colPositions.forEach(({ column, x, width }) => {
      let value = ''
      const align = ['quantity', 'unitPrice', 'total', 'weight', 'cbm', 'rowNumber'].includes(column.field) 
        ? 'right' 
        : 'left'
      
      switch (column.field) {
        case 'rowNumber':
          value = String(row.rowNumber)
          break
        case 'hsCode':
          value = row.hsCode || ''
          break
        case 'reference':
          value = row.reference || ''
          break
        case 'description':
          // Use wrapped lines for description
          const textX = x + 2
          let lineY = y
          descriptionLines.forEach((line: string) => {
            doc.text(line, textX, lineY)
            lineY += 4
          })
          if (row.serials && row.serials.length > 0) {
            doc.setFontSize(7)
            doc.setTextColor(100, 100, 100)
            doc.text(`S/N: ${row.serials.join(', ')}`, textX, lineY)
            doc.setFontSize(8)
            doc.setTextColor(0, 0, 0)
          }
          return // Skip normal rendering for description
        case 'quantity':
          value = String(row.quantity)
          break
        case 'unit':
          value = row.unit || 'PCS'
          break
        case 'unitPrice':
          value = currencySymbol ? `${currencySymbol}${row.unitPrice.toFixed(2)}` : row.unitPrice.toFixed(2)
          break
        case 'total':
          doc.setFont('helvetica', 'bold')
          value = currencySymbol ? `${currencySymbol}${row.total.toFixed(2)}` : row.total.toFixed(2)
          break
        case 'weight':
          value = row.weight ? row.weight.toFixed(2) : ''
          break
        case 'netWeight':
          value = row.netWeight ? row.netWeight.toFixed(2) : ''
          break
        case 'packages':
          value = row.packages ? String(row.packages) : ''
          break
        case 'cbm':
          value = row.cbm ? row.cbm.toFixed(3) : ''
          break
        case 'custom':
          value = row.customFields?.[column.id] || ''
          break
      }
      
      const textX = align === 'right' ? x + width - 2 : x + 2
      doc.text(value, textX, y, { align } as { align: 'left' | 'center' | 'right' | 'justify' })
      
      if (column.field === 'total') {
        doc.setFont('helvetica', 'normal')
      }
    })
    
    y += rowHeight
  })
  
  return { y, subtotal }
}

// Get document settings from localStorage
function getDocumentDisplaySettings(): DocumentDisplaySettings {
  const defaults: DocumentDisplaySettings = {
    showCompanyAddress: true,
    showVAT: true,
    showRegistrationNumber: true,
    showPhone: true,
    showEmail: false,
    showWebsite: true,
    showBankDetails: false,
    headerText: '',
    termsAndConditions: '',
    notes: '',
    footerText: '',
    customFields: []
  }
  
  if (typeof window === 'undefined') return defaults
  
  try {
    const stored = localStorage.getItem('orderbridge_document_settings')
    if (stored) {
      const settings = JSON.parse(stored)
      return {
        showCompanyAddress: settings.invoiceShowCompanyAddress ?? defaults.showCompanyAddress,
        showVAT: settings.invoiceShowVAT ?? defaults.showVAT,
        showRegistrationNumber: settings.invoiceShowRegistrationNumber ?? defaults.showRegistrationNumber,
        showPhone: settings.invoiceShowPhone ?? defaults.showPhone,
        showEmail: settings.invoiceShowEmail ?? defaults.showEmail,
        showWebsite: settings.invoiceShowWebsite ?? defaults.showWebsite,
        showBankDetails: settings.invoiceShowBankDetails ?? defaults.showBankDetails,
        headerText: settings.invoiceHeader || '',
        termsAndConditions: settings.invoiceTermsAndConditions || '',
        notes: settings.invoiceNotes || '',
        footerText: settings.invoiceFooter || '',
        customFields: settings.customFields || []
      }
    }
  } catch {
    // Return defaults on error
  }
  
  return defaults
}

interface QuoteData {
  items: CartItem[]
  user: DistributorUser
  shippingAddress: Address | null
  billingAddress: Address | null
  shippingMethod: string
  poNumber?: string
  requestedDate?: string
  instructions?: string
  getDisplayPrice: (product: any) => number
  getInvoicePrice: (product: any) => number
  displayCurrencySymbol: string
  invoiceCurrencySymbol: string
}

interface InvoiceData {
  order: any
  user: DistributorUser
  invoiceCurrencySymbol: string
}

interface PackingListParams {
  order: {
    id: string
    number: string
    items: { id: string; ref: string; name: string; quantity: number; price: number; serials?: string[] }[]
    shippingMethod: string
    createdAt: string
  }
  user: {
    company: string
    name: string
  }
  shippingAddress: {
    company: string
    contactName: string
    street: string
    city: string
    postalCode: string
    country: string
    phone?: string
  } | null
}

// ============================================
// HELPER: Add company header to PDF
// ============================================

function addCompanyHeader(
  doc: jsPDF, 
  company: CompanyInfo, 
  startY: number,
  pdfBranding: PdfBranding = DEFAULT_PDF_BRANDING,
  displaySettings?: DocumentDisplaySettings
): number {
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = startY
  
  // Get display settings (either passed or from localStorage)
  const settings = displaySettings || getDocumentDisplaySettings()
  
  // Get branding from storage to check for logo and company name override
  const storedBranding = getBrandingFromStorage()
  const displayCompanyName = storedBranding?.companyName || company.name
  const displayLegalName = storedBranding?.companyLegalName || company.legalName

  // Company name (large, bold) with branding color
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(pdfBranding.primaryColor[0], pdfBranding.primaryColor[1], pdfBranding.primaryColor[2])
  doc.text(displayCompanyName, 20, y)
  
  // Logo (right side) - try branding logo first, then company logo
  const logoUrl = storedBranding?.logoUrl || company.logo
  if (logoUrl) {
    // If logo is base64 or URL, add it
    try {
      doc.addImage(logoUrl, 'PNG', pageWidth - 60, y - 10, 40, 20)
    } catch {
      // Logo failed, try as JPEG
      try {
        doc.addImage(logoUrl, 'JPEG', pageWidth - 60, y - 10, 40, 20)
      } catch {
        // Logo failed completely, skip
      }
    }
  } else {
    // Placeholder box for logo
    doc.setDrawColor(200, 200, 200)
    doc.setFillColor(245, 245, 245)
    doc.rect(pageWidth - 60, y - 12, 40, 20, 'FD')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(150, 150, 150)
    doc.text('LOGO', pageWidth - 40, y, { align: 'center' })
  }
  
  y += 6

  // Legal name
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text(displayLegalName, 20, y)
  y += 5

  // Address (conditional)
  if (settings.showCompanyAddress) {
    doc.text(company.address.street, 20, y)
    y += 4
    doc.text(`${company.address.city}, ${company.address.postalCode}`, 20, y)
    y += 4
    doc.text(company.address.country, 20, y)
    y += 5
  }

  // Contact info (conditional)
  if (settings.showPhone && company.phone) {
    doc.text(`Tel: ${company.phone}`, 20, y)
    y += 4
  }
  if (settings.showEmail && company.email) {
    doc.text(`Email: ${company.email}`, 20, y)
    y += 4
  }
  if (settings.showWebsite && company.website) {
    doc.text(`Web: ${company.website}`, 20, y)
    y += 4
  }

  // VAT / Registration (conditional, aligned vertically)
  doc.setFontSize(8)
  if (settings.showVAT && company.vatNumber) {
    y += 2
    doc.text(`VAT: ${company.vatNumber}`, 20, y)
    y += 4
  }
  if (settings.showRegistrationNumber && company.registrationNumber) {
    if (!settings.showVAT || !company.vatNumber) y += 2
    doc.text(`Reg: ${company.registrationNumber}`, 20, y)
    y += 4
  }

  return y + 6
}

// ============================================
// HELPER: Add bank info
// ============================================

function addBankInfo(
  doc: jsPDF, 
  company: CompanyInfo, 
  startY: number,
  marginLeft: number = 20,
  marginRight: number = 20,
  position: 'left' | 'right' | 'full' = 'full'
): number {
  if (!company.bankInfo) return startY

  const pageWidth = doc.internal.pageSize.getWidth()
  let y = startY
  
  // Calculate box position and width based on position
  let boxX: number
  let boxWidth: number
  let textX: number
  
  if (position === 'right') {
    boxWidth = (pageWidth - marginLeft - marginRight) / 2 - 5
    boxX = pageWidth - marginRight - boxWidth
    textX = boxX + 5
  } else if (position === 'left') {
    boxWidth = (pageWidth - marginLeft - marginRight) / 2 - 5
    boxX = marginLeft
    textX = marginLeft + 5
  } else {
    // full width
    boxX = marginLeft
    boxWidth = pageWidth - marginLeft - marginRight
    textX = marginLeft + 5
  }

  doc.setFillColor(248, 248, 248)
  doc.rect(boxX, y - 4, boxWidth, 35, 'F')

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('Bank Details', textX, y + 2)
  y += 8

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Bank: ${company.bankInfo.bankName}`, textX, y)
  y += 5
  doc.text(`Account Name: ${company.bankInfo.accountName}`, textX, y)
  y += 5
  doc.text(`Account Number: ${company.bankInfo.accountNumber}`, textX, y)
  y += 5
  
  if (company.bankInfo.swiftCode) {
    doc.text(`SWIFT: ${company.bankInfo.swiftCode}`, textX, y)
    if (company.bankInfo.iban) {
      doc.text(`IBAN: ${company.bankInfo.iban}`, textX + 60, y)
    }
    y += 5
  }

  return y + 10
}

// ============================================
// GENERATE QUOTE PDF
// ============================================

export function generateQuotePdf(data: QuoteData): void {
  const {
    items,
    user,
    shippingAddress,
    shippingMethod,
    poNumber,
    requestedDate,
    instructions,
    getDisplayPrice,
    getInvoicePrice,
    displayCurrencySymbol,
    invoiceCurrencySymbol
  } = data

  const company = getCompanyInfo()
  const docSettings = getDocumentSettings()
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  
  // Get branding colors
  const pdfBranding = brandingToPdfColors()
  
  // Start with company header
  let y = addCompanyHeader(doc, company, 20, pdfBranding)

  // Separator line
  doc.setDrawColor(pdfBranding.primaryColor[0], pdfBranding.primaryColor[1], pdfBranding.primaryColor[2])
  doc.setLineWidth(0.5)
  doc.line(20, y, pageWidth - 20, y)
  y += 10

  // QUOTATION title
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(pdfBranding.primaryColor[0], pdfBranding.primaryColor[1], pdfBranding.primaryColor[2])
  doc.text('QUOTATION', pageWidth / 2, y, { align: 'center' })
  y += 12

  // Quote info
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)
  const quoteNumber = `Q-${Date.now().toString().slice(-8)}`
  const quoteDate = new Date().toLocaleDateString('en-GB')
  
  doc.text(`Quote #: ${quoteNumber}`, 20, y)
  doc.text(`Date: ${quoteDate}`, pageWidth - 20, y, { align: 'right' })
  y += 6
  doc.text(`Valid for: ${docSettings.quote.validityDays} days`, 20, y)
  y += 8

  if (poNumber) {
    doc.text(`PO Reference: ${poNumber}`, 20, y)
    y += 6
  }
  if (requestedDate) {
    doc.text(`Requested Date: ${requestedDate}`, 20, y)
    y += 6
  }
  y += 8

  // Two columns: Customer and Ship To
  const colWidth = (pageWidth - 60) / 2

  // Customer info (left)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('Bill To:', 20, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(user.company, 20, y)
  y += 4
  doc.text(user.name, 20, y)
  y += 4
  doc.text(user.email, 20, y)
  y += 4
  if (user.paymentTerms) {
    doc.text(`Payment Terms: ${user.paymentTerms}`, 20, y)
  }

  // Ship To (right) - reset y position
  let shipY = y - 18
  if (shippingAddress) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('Ship To:', 20 + colWidth + 20, shipY)
    shipY += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(shippingAddress.company, 20 + colWidth + 20, shipY)
    shipY += 4
    doc.text(shippingAddress.street, 20 + colWidth + 20, shipY)
    shipY += 4
    doc.text(`${shippingAddress.postalCode} ${shippingAddress.city}`, 20 + colWidth + 20, shipY)
    shipY += 4
    doc.text(shippingAddress.country, 20 + colWidth + 20, shipY)
  }

  y += 12

  // Shipping method
  doc.text(`Shipping Method: ${shippingMethod}`, 20, y)
  y += 12

  // Table header
  doc.setFillColor(0, 113, 227)
  doc.rect(20, y - 4, pageWidth - 40, 8, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(255, 255, 255)
  doc.text('Ref', 22, y)
  doc.text('Description', 45, y)
  doc.text('Qty', 115, y, { align: 'right' })
  doc.text(`Unit (${user.displayCurrency})`, 145, y, { align: 'right' })
  doc.text(`Total (${user.displayCurrency})`, pageWidth - 22, y, { align: 'right' })
  y += 8

  // Table rows
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)
  let subtotalDisplay = 0
  let subtotalInvoice = 0
  let rowCount = 0

  items.forEach((item) => {
    const displayPrice = getDisplayPrice(item.product)
    const invoicePrice = getInvoicePrice(item.product)
    const lineTotal = displayPrice * item.quantity
    subtotalDisplay += lineTotal
    subtotalInvoice += invoicePrice * item.quantity

    // Alternating row background
    if (rowCount % 2 === 0) {
      doc.setFillColor(248, 248, 248)
      doc.rect(20, y - 4, pageWidth - 40, 7, 'F')
    }

    doc.text(item.product.ref, 22, y)
    
    const maxNameLength = 35
    const name = item.product.nameEn.length > maxNameLength 
      ? item.product.nameEn.substring(0, maxNameLength) + '...'
      : item.product.nameEn
    doc.text(name, 45, y)
    
    doc.text(item.quantity.toString(), 115, y, { align: 'right' })
    doc.text(displayPrice.toLocaleString(), 145, y, { align: 'right' })
    doc.text(lineTotal.toLocaleString(), pageWidth - 22, y, { align: 'right' })
    y += 7
    rowCount++

    if (y > 250) {
      doc.addPage()
      y = 20
    }
  })

  // Totals
  y += 5
  doc.setDrawColor(200, 200, 200)
  doc.line(100, y, pageWidth - 20, y)
  y += 8

  doc.setFont('helvetica', 'bold')
  doc.text(`Subtotal (${user.displayCurrency}):`, 140, y, { align: 'right' })
  doc.text(`${displayCurrencySymbol}${subtotalDisplay.toLocaleString()}`, pageWidth - 22, y, { align: 'right' })
  y += 7

  if (user.displayCurrency !== user.invoiceCurrency) {
    doc.setTextColor(0, 113, 227)
    doc.text(`Invoice Amount (${user.invoiceCurrency}):`, 140, y, { align: 'right' })
    doc.text(`${invoiceCurrencySymbol}${subtotalInvoice.toLocaleString()}`, pageWidth - 22, y, { align: 'right' })
    y += 7
    doc.setTextColor(0, 0, 0)
  }

  doc.setFont('helvetica', 'normal')
  doc.text('Shipping:', 140, y, { align: 'right' })
  doc.text('To be calculated', pageWidth - 22, y, { align: 'right' })
  y += 12

  // Instructions
  if (instructions) {
    doc.setFont('helvetica', 'bold')
    doc.text('Special Instructions:', 20, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    const splitInstructions = doc.splitTextToSize(instructions, pageWidth - 40)
    doc.text(splitInstructions, 20, y)
    y += splitInstructions.length * 5 + 5
  }

  // Bank info if enabled
  if (docSettings.quote.showBankInfo && company.bankInfo) {
    y = addBankInfo(doc, company, y + 5)
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 20
  doc.setFontSize(8)
  doc.setTextColor(128, 128, 128)
  doc.text(docSettings.quote.footer, pageWidth / 2, footerY, { align: 'center' })

  // Save
  doc.save(`Quote-${quoteNumber}.pdf`)
}

// ============================================
// GENERATE INVOICE PDF
// ============================================

export function generateInvoicePdf(data: InvoiceData): void {
  const { order, user, invoiceCurrencySymbol } = data

  const company = getCompanyInfo()
  const docSettings = getDocumentSettings()
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  
  // Get branding colors
  const pdfBranding = brandingToPdfColors()
  
  // Company header
  let y = addCompanyHeader(doc, company, 20, pdfBranding)

  // Separator line
  doc.setDrawColor(pdfBranding.primaryColor[0], pdfBranding.primaryColor[1], pdfBranding.primaryColor[2])
  doc.setLineWidth(0.5)
  doc.line(20, y, pageWidth - 20, y)
  y += 10

  // INVOICE title
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(pdfBranding.primaryColor[0], pdfBranding.primaryColor[1], pdfBranding.primaryColor[2])
  doc.text('INVOICE', pageWidth / 2, y, { align: 'center' })
  y += 12

  // Invoice info
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)
  const invoiceNumber = `${docSettings.invoice.prefix}-${order.id.toUpperCase()}`
  
  doc.text(`Invoice #: ${invoiceNumber}`, 20, y)
  doc.text(`Date: ${new Date(order.date).toLocaleDateString('en-GB')}`, pageWidth - 20, y, { align: 'right' })
  y += 8

  if (order.poNumber) {
    doc.text(`PO Reference: ${order.poNumber}`, 20, y)
    y += 6
  }
  y += 8

  // Customer info
  doc.setFont('helvetica', 'bold')
  doc.text('Bill To:', 20, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(user.company, 20, y)
  y += 4
  doc.text(user.name, 20, y)
  y += 4
  doc.text(user.email, 20, y)
  y += 4
  if (user.paymentTerms) {
    doc.text(`Payment Terms: ${user.paymentTerms}`, 20, y)
  }
  y += 12

  // Table header
  doc.setFillColor(0, 113, 227)
  doc.rect(20, y - 4, pageWidth - 40, 8, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(255, 255, 255)
  doc.text('Description', 22, y)
  doc.text('Qty', 110, y, { align: 'right' })
  doc.text('Unit Price', 145, y, { align: 'right' })
  doc.text('Total', pageWidth - 22, y, { align: 'right' })
  y += 8

  // Table rows
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)
  let subtotal = 0
  let rowCount = 0

  order.items.forEach((item: any) => {
    const lineTotal = item.price * item.quantity
    subtotal += lineTotal

    if (rowCount % 2 === 0) {
      doc.setFillColor(248, 248, 248)
      doc.rect(20, y - 4, pageWidth - 40, 7, 'F')
    }

    const maxNameLength = 50
    const name = item.name.length > maxNameLength 
      ? item.name.substring(0, maxNameLength) + '...'
      : item.name
    doc.text(name, 22, y)
    doc.text(item.quantity.toString(), 110, y, { align: 'right' })
    doc.text(`${invoiceCurrencySymbol}${item.price.toFixed(2)}`, 145, y, { align: 'right' })
    doc.text(`${invoiceCurrencySymbol}${lineTotal.toFixed(2)}`, pageWidth - 22, y, { align: 'right' })
    y += 7
    rowCount++

    if (y > 250) {
      doc.addPage()
      y = 20
    }
  })

  // Totals
  y += 5
  doc.setDrawColor(200, 200, 200)
  doc.line(100, y, pageWidth - 20, y)
  y += 8

  doc.setFont('helvetica', 'bold')
  doc.text('Subtotal:', 145, y, { align: 'right' })
  doc.text(`${invoiceCurrencySymbol}${subtotal.toFixed(2)}`, pageWidth - 22, y, { align: 'right' })
  y += 7

  if (order.shipping) {
    doc.text('Shipping:', 145, y, { align: 'right' })
    doc.text(`${invoiceCurrencySymbol}${order.shipping.toFixed(2)}`, pageWidth - 22, y, { align: 'right' })
    y += 7
  }

  doc.setFontSize(12)
  doc.setTextColor(0, 113, 227)
  doc.text('TOTAL DUE:', 145, y, { align: 'right' })
  doc.text(`${invoiceCurrencySymbol}${order.total.toFixed(2)}`, pageWidth - 22, y, { align: 'right' })
  y += 15

  // Payment instructions
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  const paymentText = doc.splitTextToSize(docSettings.invoice.paymentInstructions, pageWidth - 40)
  doc.text(paymentText, 20, y)
  y += paymentText.length * 4 + 10

  // Bank info
  if (docSettings.invoice.showBankInfo && company.bankInfo) {
    y = addBankInfo(doc, company, y)
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 20
  doc.setFontSize(8)
  doc.setTextColor(128, 128, 128)
  doc.text(docSettings.invoice.footer, pageWidth / 2, footerY, { align: 'center' })

  // Save
  doc.save(`Invoice-${invoiceNumber}.pdf`)
}

// ============================================
// GENERATE ORDER SUMMARY PDF (customer-facing, all statuses)
// ============================================

interface OrderSummaryParams {
  order: {
    id: string
    number: string
    status: string
    createdAt: string
    poNumber?: string
    currency: string
    subtotal: number
    shipping: number
    total: number
    shippingMethod: string
    requestedDate?: string
    trackingNumber?: string
    instructions?: string
    items: Array<{
      id: string
      ref?: string
      name: string
      quantity: number
      price: number
      selectedOptions?: Array<{ groupName: string; optionName: string }>
    }>
  }
  user: {
    company: string
    name: string
    email?: string
  }
  currencySymbol: string
  shippingAddress?: {
    company: string
    contactName: string
    street: string
    city: string
    postalCode: string
    country: string
    phone?: string
  } | null
}

export function generateOrderSummaryPdf({ order, user, currencySymbol, shippingAddress }: OrderSummaryParams): void {
  const company = getCompanyInfo()
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pdfBranding = brandingToPdfColors()

  const statusLabels: Record<string, string> = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    preparing: 'Preparing',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  }

  // Header
  let y = addCompanyHeader(doc, company, 20, pdfBranding)

  // Separator
  doc.setDrawColor(pdfBranding.primaryColor[0], pdfBranding.primaryColor[1], pdfBranding.primaryColor[2])
  doc.setLineWidth(0.5)
  doc.line(20, y, pageWidth - 20, y)
  y += 10

  // Title
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(pdfBranding.primaryColor[0], pdfBranding.primaryColor[1], pdfBranding.primaryColor[2])
  doc.text('ORDER SUMMARY', pageWidth / 2, y, { align: 'center' })
  y += 12

  // Order info (left) + Customer info (right)
  const colMid = pageWidth / 2 - 5
  const colRight = pageWidth / 2 + 5

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(100, 100, 100)
  doc.text('ORDER DETAILS', 20, y)
  doc.text('CUSTOMER', colRight, y)
  y += 5

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)

  // Left column
  let ly = y
  doc.setFont('helvetica', 'bold')
  doc.text('Order #:', 20, ly)
  doc.setFont('helvetica', 'normal')
  doc.text(order.number, 55, ly)
  ly += 5

  doc.setFont('helvetica', 'bold')
  doc.text('Date:', 20, ly)
  doc.setFont('helvetica', 'normal')
  doc.text(new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }), 55, ly)
  ly += 5

  doc.setFont('helvetica', 'bold')
  doc.text('Status:', 20, ly)
  doc.setFont('helvetica', 'normal')
  doc.text(statusLabels[order.status] || order.status, 55, ly)
  ly += 5

  if (order.poNumber) {
    doc.setFont('helvetica', 'bold')
    doc.text('PO Ref:', 20, ly)
    doc.setFont('helvetica', 'normal')
    doc.text(order.poNumber, 55, ly)
    ly += 5
  }

  doc.setFont('helvetica', 'bold')
  doc.text('Shipping:', 20, ly)
  doc.setFont('helvetica', 'normal')
  doc.text(order.shippingMethod || 'TBC', 55, ly)
  ly += 5

  if (order.requestedDate) {
    doc.setFont('helvetica', 'bold')
    doc.text('Req. Date:', 20, ly)
    doc.setFont('helvetica', 'normal')
    doc.text(new Date(order.requestedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }), 55, ly)
    ly += 5
  }

  if (order.trackingNumber) {
    doc.setFont('helvetica', 'bold')
    doc.text('Tracking:', 20, ly)
    doc.setFont('helvetica', 'normal')
    doc.text(order.trackingNumber, 55, ly)
    ly += 5
  }

  // Right column — customer info
  let ry = y
  doc.setFont('helvetica', 'bold')
  doc.text(user.company, colRight, ry)
  ry += 5
  doc.setFont('helvetica', 'normal')
  doc.text(user.name, colRight, ry)
  ry += 5
  if (user.email) {
    doc.text(user.email, colRight, ry)
    ry += 5
  }

  // Shipping address in right column
  if (shippingAddress) {
    ry += 3
    doc.setFont('helvetica', 'bold')
    doc.text('Ship to:', colRight, ry)
    ry += 5
    doc.setFont('helvetica', 'normal')
    doc.text(shippingAddress.company, colRight, ry); ry += 4
    doc.text(shippingAddress.contactName, colRight, ry); ry += 4
    doc.text(shippingAddress.street, colRight, ry); ry += 4
    doc.text(`${shippingAddress.postalCode} ${shippingAddress.city}`, colRight, ry); ry += 4
    doc.text(shippingAddress.country, colRight, ry); ry += 4
    if (shippingAddress.phone) { doc.text(shippingAddress.phone, colRight, ry); ry += 4 }
  }

  y = Math.max(ly, ry) + 10

  // Separator
  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(0.3)
  doc.line(20, y - 4, pageWidth - 20, y - 4)

  // Products table header
  doc.setFillColor(pdfBranding.primaryColor[0], pdfBranding.primaryColor[1], pdfBranding.primaryColor[2])
  doc.rect(20, y - 2, pageWidth - 40, 8, 'F')

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('REF', 23, y + 3.5)
  doc.text('PRODUCT', 48, y + 3.5)
  doc.text('QTY', colMid - 5, y + 3.5, { align: 'right' })
  doc.text('UNIT PRICE', colMid + 20, y + 3.5, { align: 'right' })
  doc.text('TOTAL', pageWidth - 22, y + 3.5, { align: 'right' })
  y += 12

  // Products rows
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)

  order.items.forEach((item, index) => {
    const rowH = 8 + (item.selectedOptions && item.selectedOptions.length > 0 ? 4 : 0)
    if (y + rowH > 270) {
      doc.addPage()
      y = 20
    }

    if (index % 2 === 0) {
      doc.setFillColor(248, 248, 250)
      doc.rect(20, y - 2, pageWidth - 40, rowH, 'F')
    }

    doc.setFontSize(8)
    doc.text(item.ref || item.id.slice(0, 8), 23, y + 3)
    const nameLines = doc.splitTextToSize(item.name, colMid - 60)
    doc.text(nameLines[0], 48, y + 3)
    doc.text(String(item.quantity), colMid - 5, y + 3, { align: 'right' })
    doc.text(`${currencySymbol}${item.price.toFixed(2)}`, colMid + 20, y + 3, { align: 'right' })
    doc.text(`${currencySymbol}${(item.price * item.quantity).toFixed(2)}`, pageWidth - 22, y + 3, { align: 'right' })

    if (item.selectedOptions && item.selectedOptions.length > 0) {
      doc.setFontSize(7)
      doc.setTextColor(120, 120, 120)
      doc.text(item.selectedOptions.map(o => `${o.groupName}: ${o.optionName}`).join(' · '), 48, y + 7)
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(8)
    }

    y += rowH
  })

  // Totals
  y += 6
  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(0.3)
  doc.line(pageWidth - 90, y - 2, pageWidth - 20, y - 2)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text('Subtotal', pageWidth - 60, y + 3, { align: 'right' })
  doc.setTextColor(0, 0, 0)
  doc.text(`${currencySymbol}${order.subtotal.toFixed(2)}`, pageWidth - 22, y + 3, { align: 'right' })
  y += 7

  doc.setTextColor(100, 100, 100)
  doc.text('Shipping', pageWidth - 60, y + 3, { align: 'right' })
  doc.setTextColor(0, 0, 0)
  doc.text(order.shipping > 0 ? `${currencySymbol}${order.shipping.toFixed(2)}` : 'TBC', pageWidth - 22, y + 3, { align: 'right' })
  y += 9

  doc.setFillColor(pdfBranding.primaryColor[0], pdfBranding.primaryColor[1], pdfBranding.primaryColor[2])
  doc.rect(pageWidth - 90, y - 3, 70, 10, 'F')
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('TOTAL', pageWidth - 60, y + 3.5, { align: 'right' })
  doc.text(`${currencySymbol}${order.total.toFixed(2)}`, pageWidth - 22, y + 3.5, { align: 'right' })
  y += 16

  // Instructions / notes
  if (order.instructions) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text('Notes / Instructions:', 20, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(80, 80, 80)
    const lines = doc.splitTextToSize(order.instructions, pageWidth - 40)
    doc.text(lines, 20, y)
    y += lines.length * 5 + 4
  }

  // Footer
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(150, 150, 150)
    doc.text(`Generated on ${new Date().toLocaleDateString('en-GB')}`, 20, 287)
    doc.text(`Page ${i} / ${totalPages}`, pageWidth - 20, 287, { align: 'right' })
  }

  doc.save(`Order-${order.number}.pdf`)
}

// ============================================
// GENERATE PACKING LIST PDF
// ============================================

export function generatePackingListPdf({ order, user, shippingAddress }: PackingListParams): void {
  const company = getCompanyInfo()
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  
  // Get branding colors
  const pdfBranding = brandingToPdfColors()
  
  // Company header
  let y = addCompanyHeader(doc, company, 20, pdfBranding)

  // Separator line
  doc.setDrawColor(pdfBranding.primaryColor[0], pdfBranding.primaryColor[1], pdfBranding.primaryColor[2])
  doc.setLineWidth(0.5)
  doc.line(20, y, pageWidth - 20, y)
  y += 10

  // PACKING LIST title
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(pdfBranding.primaryColor[0], pdfBranding.primaryColor[1], pdfBranding.primaryColor[2])
  doc.text('PACKING LIST', pageWidth / 2, y, { align: 'center' })
  y += 15

  // Order Info Box
  doc.setFillColor(245, 245, 247)
  doc.roundedRect(20, y, pageWidth - 40, 20, 3, 3, 'F')
  
  y += 8
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text(`Order: ${order.number}`, 30, y)
  doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString('en-GB')}`, pageWidth - 30, y, { align: 'right' })
  
  y += 6
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text(`Shipping Method: ${order.shippingMethod}`, 30, y)
  doc.text(`Customer: ${user.company}`, pageWidth - 30, y, { align: 'right' })
  
  y += 15

  // Ship To Address
  if (shippingAddress) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text('SHIP TO:', 20, y)
    
    y += 6
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(shippingAddress.company, 20, y)
    y += 5
    doc.setFontSize(9)
    doc.setTextColor(80, 80, 80)
    doc.text(shippingAddress.contactName, 20, y)
    y += 4
    doc.text(shippingAddress.street, 20, y)
    y += 4
    doc.text(`${shippingAddress.postalCode} ${shippingAddress.city}`, 20, y)
    y += 4
    doc.text(shippingAddress.country, 20, y)
    if (shippingAddress.phone) {
      y += 4
      doc.text(`Tel: ${shippingAddress.phone}`, 20, y)
    }
    y += 10
  }

  // Items Table Header
  doc.setFillColor(0, 113, 227)
  doc.rect(20, y, pageWidth - 40, 10, 'F')
  
  y += 7
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('#', 25, y)
  doc.text('Reference', 40, y)
  doc.text('Description', 80, y)
  doc.text('Qty', pageWidth - 30, y, { align: 'right' })
  
  y += 8
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'normal')
  
  // Table Rows
  order.items.forEach((item, index) => {
    if (y > 260) {
      doc.addPage()
      y = 20
    }
    
    // Alternating background
    if (index % 2 === 0) {
      doc.setFillColor(250, 250, 252)
      doc.rect(20, y - 4, pageWidth - 40, 10, 'F')
    }
    
    doc.setFontSize(9)
    doc.text(`${index + 1}`, 25, y)
    doc.text(item.ref, 40, y)
    doc.text(item.name.substring(0, 40), 80, y)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(item.quantity.toString(), pageWidth - 30, y, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    
    y += 10
    if (item.serials && item.serials.length > 0) {
      doc.setFontSize(8)
      doc.setTextColor(100, 100, 100)
      doc.text(`S/N: ${item.serials.join(', ')}`, 40, y)
      doc.setTextColor(0, 0, 0)
      y += 6
    }
  })
  
  // Total Items
  y += 5
  doc.setDrawColor(200, 200, 200)
  doc.line(20, y, pageWidth - 20, y)
  
  y += 10
  const totalUnits = order.items.reduce((sum, item) => sum + item.quantity, 0)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(`Total Items: ${order.items.length}`, 25, y)
  doc.text(`Total Units: ${totalUnits}`, pageWidth - 30, y, { align: 'right' })
  
  // Signature Section
  y += 30
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text('Packed by: _______________________', 25, y)
  doc.text('Date: _____________', pageWidth - 70, y)
  
  y += 15
  doc.text('Received by: _______________________', 25, y)
  doc.text('Date: _____________', pageWidth - 70, y)
  
  // Footer
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text('Please check all items upon receipt and report any discrepancies within 48 hours.', pageWidth / 2, 285, { align: 'center' })
  
  // Save
  doc.save(`PackingList-${order.number}.pdf`)
}

// ============================================
// GENERATE ADMIN INVOICE PDF
// ============================================

interface AdminInvoiceData {
  invoice: {
    invoiceNumber: string
    issueDate: string
    dueDate: string | null
    status: string
    subtotal: number
    totalAmount: number
    currency: string
  }
  documentType?: 'INVOICE' | 'QUOTE' | 'PROFORMA'
  order: {
    orderNumber: string
    lines: Array<{
      quantity: number
      unitPrice: number
      lineTotal: number
      product: {
        ref: string
        nameEn: string
      }
      serials?: string[]
    }>
    charges?: Array<{
      description: string
      amount: number
    }>
    discounts?: Array<{
      description: string
      type: string  // 'fixed', 'percent_products', 'percent_total'
      value: number // Original value (amount for fixed, percentage for percent types)
      amount: number // Calculated discount amount
    }>
  }
  customer: {
    companyName: string
    contactName: string | null
    billingAddress: string | null
    vatNumber: string | null
  }
}

export function generateAdminInvoicePdf(data: AdminInvoiceData, branding?: BrandingConfig): void {
  const { invoice, order, customer } = data
  const company = getCompanyInfo()
  const displaySettings = getDocumentDisplaySettings()
  const pdfBranding = brandingToPdfColors(branding)
  const layoutConfig = getLayoutConfig('invoice')
  
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  
  // Use configured margins
  const margins = layoutConfig.margins
  const contentWidth = pageWidth - margins.left - margins.right
  
  // Get branding for logo
  const storedBranding = getBrandingFromStorage()
  const logoUrl = storedBranding?.logoUrl || company.logo
  const displayCompanyName = storedBranding?.companyName || company.name
  
  // Document type
  const docType = data.documentType || 'INVOICE'
  const docTitle = docType === 'QUOTE' ? 'QUOTE' : docType === 'PROFORMA' ? 'PROFORMA INVOICE' : 'INVOICE'
  const billToLabel = docType === 'QUOTE' ? 'QUOTE TO:' : 'BILL TO:'
  
  // Calculate column X positions
  const colLeftX = margins.left
  const colCenterX = pageWidth / 2
  const colRightX = pageWidth - margins.right
  
  // Get all header elements sorted by zone and order
  const headerElements = layoutConfig.elements
    .filter(el => el.zone.startsWith('header-') && el.visible)
    .sort((a, b) => a.order - b.order)
  
  // Currency symbol
  const currencySymbol = invoice.currency === 'EUR' ? '€' : invoice.currency + ' '
  
  // ============================================
  // HEADER SECTION - 3 columns
  // ============================================
  let headerLeftY = margins.top
  let headerCenterY = margins.top
  let headerRightY = margins.top
  
  // Process each header element
  for (const element of headerElements) {
    const zone = element.zone
    let x: number
    let align: 'left' | 'center' | 'right'
    let currentY: number
    
    if (zone === 'header-left') {
      x = colLeftX
      align = 'left'
      currentY = headerLeftY
    } else if (zone === 'header-center') {
      x = colCenterX
      align = 'center'
      currentY = headerCenterY
    } else {
      x = colRightX
      align = 'right'
      currentY = headerRightY
    }
    
    // Render element based on type
    switch (element.type) {
      case 'logo':
        if (logoUrl) {
          try {
            const logoW = 40
            const logoH = 20
            const logoX = zone === 'header-left' ? x : zone === 'header-center' ? x - logoW/2 : x - logoW
            doc.addImage(logoUrl, 'PNG', logoX, currentY - 5, logoW, logoH)
          } catch {
            try {
              const logoW = 40
              const logoH = 20
              const logoX = zone === 'header-left' ? x : zone === 'header-center' ? x - logoW/2 : x - logoW
              doc.addImage(logoUrl, 'JPEG', logoX, currentY - 5, logoW, logoH)
            } catch {
              // Skip if logo fails
            }
          }
        }
        if (zone === 'header-left') headerLeftY += 25
        else if (zone === 'header-center') headerCenterY += 25
        else headerRightY += 25
        break
        
      case 'companyInfo':
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(pdfBranding.primaryColor[0], pdfBranding.primaryColor[1], pdfBranding.primaryColor[2])
        doc.text(displayCompanyName, x, currentY, { align })
        currentY += 6
        
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(100, 100, 100)
        
        if (displaySettings.showCompanyAddress && company.address) {
          const addr = company.address
          const addressLines = [
            addr.street,
            `${addr.city}, ${addr.postalCode}`,
            addr.country
          ].filter(Boolean)
          addressLines.forEach((line: string) => {
            doc.text(line, x, currentY, { align })
            currentY += 3.5
          })
        }
        if (displaySettings.showPhone && company.phone) {
          doc.text(`Tel: ${company.phone}`, x, currentY, { align })
          currentY += 3.5
        }
        if (displaySettings.showEmail && company.email) {
          doc.text(`Email: ${company.email}`, x, currentY, { align })
          currentY += 3.5
        }
        if (displaySettings.showWebsite && company.website) {
          doc.text(`Web: ${company.website}`, x, currentY, { align })
          currentY += 3.5
        }
        if (displaySettings.showVAT && company.vatNumber) {
          doc.text(`VAT: ${company.vatNumber}`, x, currentY, { align })
          currentY += 3.5
        }
        if (displaySettings.showRegistrationNumber && company.registrationNumber) {
          doc.text(`Reg: ${company.registrationNumber}`, x, currentY, { align })
          currentY += 3.5
        }
        
        if (zone === 'header-left') headerLeftY = currentY + 5
        else if (zone === 'header-center') headerCenterY = currentY + 5
        else headerRightY = currentY + 5
        break
        
      case 'documentTitle':
        doc.setFontSize(20)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(pdfBranding.primaryColor[0], pdfBranding.primaryColor[1], pdfBranding.primaryColor[2])
        doc.text(docTitle, x, currentY, { align })
        
        if (zone === 'header-left') headerLeftY += 15
        else if (zone === 'header-center') headerCenterY += 15
        else headerRightY += 15
        break
        
      case 'documentInfo':
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(80, 80, 80)
        doc.text(`Invoice #: ${invoice.invoiceNumber}`, x, currentY, { align })
        currentY += 5
        doc.text(`Date: ${new Date(invoice.issueDate).toLocaleDateString('en-GB')}`, x, currentY, { align })
        currentY += 5
        if (invoice.dueDate) {
          doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString('en-GB')}`, x, currentY, { align })
          currentY += 5
        }
        doc.text(`Order: ${order.orderNumber}`, x, currentY, { align })
        currentY += 5
        
        if (zone === 'header-left') headerLeftY = currentY + 8
        else if (zone === 'header-center') headerCenterY = currentY + 8
        else headerRightY = currentY + 8
        break
        
      case 'billTo':
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 0, 0)
        doc.text(billToLabel, x, currentY, { align })
        currentY += 6
        
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        doc.text(customer.companyName, x, currentY, { align })
        currentY += 5
        
        if (customer.contactName) {
          doc.setFontSize(9)
          doc.text(customer.contactName, x, currentY, { align })
          currentY += 4
        }
        if (customer.billingAddress) {
          doc.setFontSize(8)
          const addressLines = customer.billingAddress.split('\n')
          addressLines.forEach(line => {
            doc.text(line, x, currentY, { align })
            currentY += 3.5
          })
        }
        if (customer.vatNumber) {
          doc.setFontSize(8)
          doc.text(`VAT: ${customer.vatNumber}`, x, currentY, { align })
          currentY += 4
        }
        
        if (zone === 'header-left') headerLeftY = currentY + 5
        else if (zone === 'header-center') headerCenterY = currentY + 5
        else headerRightY = currentY + 5
        break
        
      case 'bankDetails':
        if (displaySettings.showBankDetails && company.bankInfo) {
          doc.setFontSize(9)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(0, 0, 0)
          doc.text('Bank Details', x, currentY, { align })
          currentY += 5
          
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(8)
          doc.setTextColor(80, 80, 80)
          if (company.bankInfo.bankName) {
            doc.text(`Bank: ${company.bankInfo.bankName}`, x, currentY, { align })
            currentY += 3.5
          }
          if (company.bankInfo.accountName) {
            doc.text(`Account Name: ${company.bankInfo.accountName}`, x, currentY, { align })
            currentY += 3.5
          }
          if (company.bankInfo.accountNumber) {
            doc.text(`Account Number: ${company.bankInfo.accountNumber}`, x, currentY, { align })
            currentY += 3.5
          }
          if (company.bankInfo.swiftCode) {
            doc.text(`SWIFT: ${company.bankInfo.swiftCode}`, x, currentY, { align })
            currentY += 3.5
          }
        }
        
        if (zone === 'header-left') headerLeftY = currentY + 5
        else if (zone === 'header-center') headerCenterY = currentY + 5
        else headerRightY = currentY + 5
        break
    }
  }
  
  // Calculate where header ends
  let y = Math.max(headerLeftY, headerCenterY, headerRightY) + 5
  
  // Header separator line
  doc.setDrawColor(pdfBranding.primaryColor[0], pdfBranding.primaryColor[1], pdfBranding.primaryColor[2])
  doc.line(margins.left, y, pageWidth - margins.right, y)
  y += 8
  
  // Header text if configured
  if (displaySettings.headerText) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 60, 60)
    const headerLines = doc.splitTextToSize(displaySettings.headerText, contentWidth)
    headerLines.forEach((line: string) => {
      doc.text(line, margins.left, y)
      y += 4
    })
    y += 3
  }
  
  // ============================================
  // BODY SECTION - Render body elements (billTo, etc.)
  // ============================================
  const bodyElements = layoutConfig.elements
    .filter(el => el.zone.startsWith('body-') && el.visible)
    .sort((a, b) => a.order - b.order)
  
  if (bodyElements.length > 0) {
    let bodyLeftY = y
    let bodyRightY = y
    
    for (const element of bodyElements) {
      const zone = element.zone
      let x: number
      let align: 'left' | 'center' | 'right'
      let currentY: number
      
      if (zone === 'body-left') {
        x = colLeftX
        align = 'left'
        currentY = bodyLeftY
      } else {
        x = colRightX
        align = 'right'
        currentY = bodyRightY
      }
      
      switch (element.type) {
        case 'billTo':
          doc.setFontSize(10)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(0, 0, 0)
          doc.text(billToLabel, x, currentY, { align })
          currentY += 6
          
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(10)
          doc.text(customer.companyName, x, currentY, { align })
          currentY += 5
          
          if (customer.contactName) {
            doc.setFontSize(9)
            doc.text(customer.contactName, x, currentY, { align })
            currentY += 4
          }
          if (customer.billingAddress) {
            doc.setFontSize(8)
            const addressLines = customer.billingAddress.split('\n')
            addressLines.forEach(addrLine => {
              doc.text(addrLine, x, currentY, { align })
              currentY += 3.5
            })
          }
          if (customer.vatNumber) {
            doc.setFontSize(8)
            doc.text(`VAT: ${customer.vatNumber}`, x, currentY, { align })
            currentY += 4
          }
          
          if (zone === 'body-left') bodyLeftY = currentY + 5
          else bodyRightY = currentY + 5
          break
          
        case 'bankDetails':
          if (displaySettings.showBankDetails && company.bankInfo) {
            doc.setFontSize(9)
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(0, 0, 0)
            doc.text('Bank Details', x, currentY, { align })
            currentY += 5
            
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(8)
            doc.setTextColor(80, 80, 80)
            if (company.bankInfo.bankName) {
              doc.text(`Bank: ${company.bankInfo.bankName}`, x, currentY, { align })
              currentY += 3.5
            }
            if (company.bankInfo.accountName) {
              doc.text(`Account: ${company.bankInfo.accountName}`, x, currentY, { align })
              currentY += 3.5
            }
            if (company.bankInfo.accountNumber) {
              doc.text(`Number: ${company.bankInfo.accountNumber}`, x, currentY, { align })
              currentY += 3.5
            }
            if (company.bankInfo.swiftCode) {
              doc.text(`SWIFT: ${company.bankInfo.swiftCode}`, x, currentY, { align })
              currentY += 3.5
            }
          }
          
          if (zone === 'body-left') bodyLeftY = currentY + 5
          else bodyRightY = currentY + 5
          break
      }
    }
    
    y = Math.max(bodyLeftY, bodyRightY) + 5
  }
  
  // ============================================
  // ITEMS TABLE with configurable columns
  // ============================================
  const tableStartY = y
  const visibleColumns = getVisibleColumns(layoutConfig.tableColumns)
  const columnPositions = calculateColumnPositions(layoutConfig.tableColumns, margins.left, contentWidth)
  
  // Table Header
  doc.setFillColor(pdfBranding.primaryColor[0], pdfBranding.primaryColor[1], pdfBranding.primaryColor[2])
  doc.rect(margins.left, tableStartY, contentWidth, 10, 'F')
  
  let tableY = tableStartY + 7
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  
  // Render column headers with word wrap support
  columnPositions.forEach(({ column, x, width }) => {
    const headerLines = doc.splitTextToSize(column.label, width - 2)
    doc.text(headerLines[0] || column.label, x + 1, tableY)
  })
  
  tableY += 8
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'normal')
  
  // Table Rows
  order.lines.forEach((line, index) => {
    if (tableY > pageHeight - 50) {
      doc.addPage()
      tableY = margins.top
    }
    
    // Alternating background
    if (index % 2 === 0) {
      doc.setFillColor(250, 250, 252)
      doc.rect(margins.left, tableY - 4, contentWidth, 10, 'F')
    }
    
    doc.setFontSize(8)
    columnPositions.forEach(({ column, x, width }) => {
      let value = ''
      switch (column.field) {
        case 'rowNumber':
          value = `${index + 1}`
          break
        case 'reference':
          value = line.product.ref || ''
          break
        case 'description':
          value = line.product.nameEn || ''
          // Word wrap for description
          const descLines = doc.splitTextToSize(value, width - 2)
          doc.text(descLines[0] || '', x + 1, tableY)
          return
        case 'quantity':
          value = line.quantity.toString()
          break
        case 'unitPrice':
          value = `${currencySymbol}${Number(line.unitPrice).toFixed(2)}`
          break
        case 'total':
          doc.setFont('helvetica', 'bold')
          value = `${currencySymbol}${Number(line.lineTotal).toFixed(2)}`
          break
        default:
          value = ''
      }
      doc.text(value, x + 1, tableY)
      doc.setFont('helvetica', 'normal')
    })
    
    if (line.serials && line.serials.length > 0) {
      doc.setFontSize(7)
      doc.setTextColor(100, 100, 100)
      doc.text(`S/N: ${line.serials.join(', ')}`, margins.left + 1, tableY + 5)
      doc.setFontSize(8)
      doc.setTextColor(0, 0, 0)
      tableY += 5
    }
    tableY += 10
  })
  
  // Additional charges
  if (order.charges && order.charges.length > 0) {
    tableY += 5
    doc.setDrawColor(200, 200, 200)
    doc.line(margins.left + contentWidth * 0.4, tableY - 3, pageWidth - margins.right, tableY - 3)
    
    order.charges.forEach(charge => {
      doc.setFontSize(9)
      doc.text(charge.description, margins.left + contentWidth * 0.4, tableY)
      doc.setFont('helvetica', 'bold')
      doc.text(`${currencySymbol}${Number(charge.amount).toFixed(2)}`, pageWidth - margins.right, tableY, { align: 'right' })
      doc.setFont('helvetica', 'normal')
      tableY += 8
    })
  }
  
  // Discounts
  if (order.discounts && order.discounts.length > 0) {
    tableY += 5
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(34, 197, 94) // Green color for discounts
    doc.text('DISCOUNTS', margins.left + contentWidth * 0.4, tableY)
    tableY += 8
    
    doc.setFont('helvetica', 'normal')
    order.discounts.forEach(discount => {
      doc.setFontSize(9)
      // Build discount label with type info
      let discountLabel = discount.description
      if (discount.type && discount.value !== undefined) {
        const typeLabel = discount.type === 'fixed' 
          ? `(${currencySymbol}${Number(discount.value).toFixed(2)} off)`
          : discount.type === 'percent_products'
          ? `(${Number(discount.value)}% on products)`
          : `(${Number(discount.value)}% on total)`
        discountLabel = `${discount.description} ${typeLabel}`
      }
      doc.text(discountLabel, margins.left + contentWidth * 0.4, tableY)
      doc.setFont('helvetica', 'bold')
      doc.text(`-${currencySymbol}${Number(discount.amount).toFixed(2)}`, pageWidth - margins.right, tableY, { align: 'right' })
      doc.setFont('helvetica', 'normal')
      tableY += 8
    })
    doc.setTextColor(0, 0, 0) // Reset to black
  }
  
  // ============================================
  // TOTALS SECTION
  // ============================================
  tableY += 10
  doc.setDrawColor(200, 200, 200)
  doc.line(margins.left + contentWidth * 0.5, tableY - 5, pageWidth - margins.right, tableY - 5)
  
  // Subtotal
  doc.setFontSize(10)
  doc.text('Subtotal:', margins.left + contentWidth * 0.6, tableY)
  doc.text(`${currencySymbol}${Number(invoice.subtotal).toFixed(2)}`, pageWidth - margins.right, tableY, { align: 'right' })
  tableY += 8
  
  // Total
  doc.setFillColor(pdfBranding.primaryColor[0], pdfBranding.primaryColor[1], pdfBranding.primaryColor[2])
  doc.rect(margins.left + contentWidth * 0.5, tableY - 4, contentWidth * 0.5, 12, 'F')
  
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('TOTAL:', margins.left + contentWidth * 0.6, tableY + 4)
  doc.text(`${currencySymbol}${Number(invoice.totalAmount).toFixed(2)}`, pageWidth - margins.right, tableY + 4, { align: 'right' })
  
  tableY += 20
  doc.setTextColor(0, 0, 0)
  
  // ============================================
  // FOOTER SECTION
  // ============================================
  // Check if bank details should be in footer
  const bankInHeaderOrBody = layoutConfig.elements.some(
    el => el.type === 'bankDetails' && (el.zone.startsWith('header-') || el.zone.startsWith('body-')) && el.visible
  )
  
  // Bank Info (if not in header or body - render in footer)
  if (displaySettings.showBankDetails && !bankInHeaderOrBody) {
    tableY = addBankInfo(doc, company, tableY)
  }
  
  // Payment Terms
  tableY += 10
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  
  if (invoice.dueDate) {
    doc.text(`Payment is due by ${new Date(invoice.dueDate).toLocaleDateString('en-GB')}.`, margins.left, tableY)
  } else {
    doc.text('Payment is due upon receipt.', margins.left, tableY)
  }
  
  tableY += 5
  doc.text('Thank you for your business.', margins.left, tableY)
  
  // Notes & Terms
  if (displaySettings.notes) {
    tableY += 10
    doc.setFontSize(8)
    const noteLines = doc.splitTextToSize(displaySettings.notes, contentWidth)
    noteLines.forEach((line: string) => {
      doc.text(line, margins.left, tableY)
      tableY += 3.5
    })
  }
  
  // Footer
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text(`Generated on ${new Date().toLocaleString('en-GB')}`, pageWidth / 2, pageHeight - margins.bottom, { align: 'center' })
  
  // Save
  doc.save(`Invoice-${invoice.invoiceNumber}.pdf`)
}

// ============================================
// GENERATE INVOICE PDF WITH CONFIGURED LAYOUT
// ============================================
// This function uses the layout settings from Settings > Documents

export function generateInvoicePdfWithLayout(data: AdminInvoiceData, branding?: BrandingConfig): void {
  const { invoice, order, customer } = data
  const company = getCompanyInfo()
  const docSettings = getDocumentSettings()
  const displaySettings = getDocumentDisplaySettings()
  const pdfBranding = brandingToPdfColors(branding)
  const layoutConfig = getLayoutConfig('invoice')
  
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  
  // Use configured margins
  const margins = layoutConfig.margins
  const contentWidth = pageWidth - margins.left - margins.right
  
  // Get branding for logo
  const storedBranding = getBrandingFromStorage()
  const logoUrl = storedBranding?.logoUrl || company.logo
  const displayCompanyName = storedBranding?.companyName || company.name
  
  // Currency symbol
  const currencySymbol = invoice.currency === 'EUR' ? '€' : 
                         invoice.currency === 'USD' ? '$' : 
                         invoice.currency === 'GBP' ? '£' : 
                         invoice.currency + ' '
  
  // Helper to get element config
  const getElement = (elementType: DocumentElement['type']) => {
    const el = layoutConfig.elements.find(e => e.type === elementType)
    return el || { type: elementType, zone: 'header-left' as const, visible: true, order: 0 }
  }
  
  // Calculate column X positions and widths
  const colLeftX = margins.left
  const colCenterX = pageWidth / 2
  const colRightX = pageWidth - margins.right
  const colWidth = contentWidth / 3
  
  // Get all header elements sorted by zone and order
  const headerElements = layoutConfig.elements
    .filter(el => el.zone.startsWith('header-') && el.visible)
    .sort((a, b) => a.order - b.order)
  
  // ============================================
  // HEADER SECTION - 3 columns
  // ============================================
  let headerLeftY = margins.top
  let headerCenterY = margins.top
  let headerRightY = margins.top
  
  // Process each header element
  for (const element of headerElements) {
    const zone = element.zone
    
    // Determine X position and alignment
    let x: number
    let align: 'left' | 'center' | 'right'
    let currentY: number
    
    if (zone === 'header-left') {
      x = colLeftX
      align = 'left'
      currentY = headerLeftY
    } else if (zone === 'header-center') {
      x = colCenterX
      align = 'center'
      currentY = headerCenterY
    } else {
      x = colRightX
      align = 'right'
      currentY = headerRightY
    }
    
    // Render element based on type
    switch (element.type) {
      case 'logo':
        if (logoUrl) {
          try {
            const logoW = 40
            const logoH = 20
            const logoX = zone === 'header-left' ? x : zone === 'header-center' ? x - logoW/2 : x - logoW
            doc.addImage(logoUrl, 'PNG', logoX, currentY - 5, logoW, logoH)
          } catch {
            try {
              const logoW = 40
              const logoH = 20
              const logoX = zone === 'header-left' ? x : zone === 'header-center' ? x - logoW/2 : x - logoW
              doc.addImage(logoUrl, 'JPEG', logoX, currentY - 5, logoW, logoH)
            } catch {
              // Skip if logo fails
            }
          }
        } else {
          // Placeholder
          const logoW = 40
          const logoH = 20
          const logoX = zone === 'header-left' ? x : zone === 'header-center' ? x - logoW/2 : x - logoW
          doc.setDrawColor(200, 200, 200)
          doc.setFillColor(245, 245, 245)
          doc.rect(logoX, currentY - 5, logoW, logoH, 'FD')
          doc.setFontSize(8)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(150, 150, 150)
          doc.text('LOGO', logoX + logoW/2, currentY + 5, { align: 'center' })
        }
        if (zone === 'header-left') headerLeftY += 25
        else if (zone === 'header-center') headerCenterY += 25
        else headerRightY += 25
        break
        
      case 'companyInfo':
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(pdfBranding.primaryColor[0], pdfBranding.primaryColor[1], pdfBranding.primaryColor[2])
        doc.text(displayCompanyName, x, currentY, { align })
        currentY += 5
        
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(100, 100, 100)
        
        if (displaySettings.showCompanyAddress && company.address) {
          const addr = company.address
          const addressStr = `${addr.street}, ${addr.city}, ${addr.postalCode}, ${addr.country}`
          const addressLines = addressStr.split(', ')
          addressLines.forEach((line: string) => {
            doc.text(line, x, currentY, { align })
            currentY += 3.5
          })
        }
        if (displaySettings.showPhone && company.phone) {
          doc.text(`Tel: ${company.phone}`, x, currentY, { align })
          currentY += 3.5
        }
        if (displaySettings.showEmail && company.email) {
          doc.text(`Email: ${company.email}`, x, currentY, { align })
          currentY += 3.5
        }
        if (displaySettings.showWebsite && company.website) {
          doc.text(`Web: ${company.website}`, x, currentY, { align })
          currentY += 3.5
        }
        if (displaySettings.showVAT && company.vatNumber) {
          doc.text(`VAT: ${company.vatNumber}`, x, currentY, { align })
          currentY += 3.5
        }
        if (displaySettings.showRegistrationNumber && company.registrationNumber) {
          doc.text(`Reg: ${company.registrationNumber}`, x, currentY, { align })
          currentY += 3.5
        }
        
        if (zone === 'header-left') headerLeftY = currentY + 5
        else if (zone === 'header-center') headerCenterY = currentY + 5
        else headerRightY = currentY + 5
        break
        
      case 'documentTitle':
        const docType = data.documentType || 'INVOICE'
        const docTitle = docType === 'QUOTE' ? 'QUOTE' : docType === 'PROFORMA' ? 'PROFORMA INVOICE' : 'INVOICE'
        doc.setFontSize(20)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(pdfBranding.primaryColor[0], pdfBranding.primaryColor[1], pdfBranding.primaryColor[2])
        doc.text(docTitle, x, currentY + 5, { align })
        
        if (zone === 'header-left') headerLeftY += 15
        else if (zone === 'header-center') headerCenterY += 15
        else headerRightY += 15
        break
        
      case 'documentInfo':
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(80, 80, 80)
        
        doc.text(`Invoice #: ${invoice.invoiceNumber}`, x, currentY, { align })
        currentY += 4
        doc.text(`Date: ${new Date(invoice.issueDate).toLocaleDateString('en-GB')}`, x, currentY, { align })
        currentY += 4
        if (invoice.dueDate) {
          doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString('en-GB')}`, x, currentY, { align })
          currentY += 4
        }
        doc.text(`Order: ${order.orderNumber}`, x, currentY, { align })
        currentY += 4
        
        if (zone === 'header-left') headerLeftY = currentY + 8
        else if (zone === 'header-center') headerCenterY = currentY + 8
        else headerRightY = currentY + 8
        break
        
      case 'billTo':
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 0, 0)
        doc.text('BILL TO:', x, currentY, { align })
        currentY += 5
        
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        doc.text(customer.companyName, x, currentY, { align })
        currentY += 4
        
        if (customer.contactName) {
          doc.setFontSize(9)
          doc.text(customer.contactName, x, currentY, { align })
          currentY += 4
        }
        
        if (customer.billingAddress) {
          doc.setFontSize(8)
          const addrLines = customer.billingAddress.split('\n')
          addrLines.forEach(line => {
            doc.text(line, x, currentY, { align })
            currentY += 3.5
          })
        }
        
        if (customer.vatNumber) {
          doc.setFontSize(8)
          doc.text(`VAT: ${customer.vatNumber}`, x, currentY, { align })
          currentY += 3.5
        }
        
        if (zone === 'header-left') headerLeftY = currentY + 5
        else if (zone === 'header-center') headerCenterY = currentY + 5
        else headerRightY = currentY + 5
        break
        
      case 'bankDetails':
        if (displaySettings.showBankDetails && company.bankInfo) {
          doc.setFontSize(8)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(0, 0, 0)
          doc.text('Bank Details', x, currentY, { align })
          currentY += 4
          
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(80, 80, 80)
          
          if (company.bankInfo.bankName) {
            doc.text(`Bank: ${company.bankInfo.bankName}`, x, currentY, { align })
            currentY += 3.5
          }
          if (company.bankInfo.accountName) {
            doc.text(`Account Name: ${company.bankInfo.accountName}`, x, currentY, { align })
            currentY += 3.5
          }
          if (company.bankInfo.accountNumber) {
            doc.text(`Account Number: ${company.bankInfo.accountNumber}`, x, currentY, { align })
            currentY += 3.5
          }
          if (company.bankInfo.swiftCode) {
            doc.text(`SWIFT: ${company.bankInfo.swiftCode}`, x, currentY, { align })
            currentY += 3.5
          }
        }
        
        if (zone === 'header-left') headerLeftY = currentY + 5
        else if (zone === 'header-center') headerCenterY = currentY + 5
        else headerRightY = currentY + 5
        break
    }
  }
  
  // Calculate where header ends (max of all columns)
  let y = Math.max(headerLeftY, headerCenterY, headerRightY) + 5
  
  // Horizontal line
  doc.setDrawColor(pdfBranding.primaryColor[0], pdfBranding.primaryColor[1], pdfBranding.primaryColor[2])
  doc.line(margins.left, y, pageWidth - margins.right, y)
  y += 5
  
  // Header text (if configured)
  if (displaySettings.headerText) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 60, 60)
    const headerLines = doc.splitTextToSize(displaySettings.headerText, contentWidth)
    headerLines.forEach((line: string) => {
      doc.text(line, margins.left, y)
      y += 4
    })
    y += 3
  }
  
  // Custom fields at body-top
  y = renderCustomFields(doc, displaySettings.customFields, 'body-top', 'invoice', y, pageWidth)
  
  // ============================================
  // TABLE SECTION
  // ============================================
  const tableStartY = y + 5
  const tableResult = renderConfigurableTable(
    doc,
    layoutConfig.tableColumns,
    order.lines.map((line, idx) => ({
      rowNumber: idx + 1,
      reference: line.product?.ref || '',
      description: line.product?.nameEn || '',
      quantity: line.quantity,
      unitPrice: Number(line.unitPrice),
      total: Number(line.lineTotal),
      unit: 'pc',
      hsCode: '',
      weight: 0,
      netWeight: 0,
      packages: 0,
      cbm: 0,
      ...(line.serials && line.serials.length > 0 && { serials: line.serials }),
    })),
    tableStartY,
    pageWidth,
    pdfBranding,
    currencySymbol,
    margins.left,
    margins.right
  )
  y = tableResult.y
  
  // Additional charges
  if (order.charges && order.charges.length > 0) {
    y += 5
    doc.setDrawColor(200, 200, 200)
    doc.line(pageWidth / 2, y - 3, pageWidth - margins.right, y - 3)
    
    order.charges.forEach((charge: { description: string; amount: number | string }) => {
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(60, 60, 60)
      doc.text(charge.description, pageWidth / 2, y)
      doc.setFont('helvetica', 'bold')
      doc.text(`${currencySymbol}${Number(charge.amount).toFixed(2)}`, pageWidth - margins.right, y, { align: 'right' })
      y += 6
    })
  }
  
  // ============================================
  // TOTALS SECTION
  // ============================================
  y += 10
  doc.setDrawColor(200, 200, 200)
  doc.line(pageWidth / 2, y - 5, pageWidth - margins.right, y - 5)
  
  // Subtotal
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)
  doc.text('Subtotal:', pageWidth - 80, y)
  doc.text(`${currencySymbol}${Number(invoice.subtotal).toFixed(2)}`, pageWidth - margins.right, y, { align: 'right' })
  y += 8
  
  // Total
  doc.setFillColor(pdfBranding.primaryColor[0], pdfBranding.primaryColor[1], pdfBranding.primaryColor[2])
  doc.rect(pageWidth / 2, y - 4, contentWidth / 2, 12, 'F')
  
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('TOTAL:', pageWidth - 80, y + 4)
  doc.text(`${currencySymbol}${Number(invoice.totalAmount).toFixed(2)}`, pageWidth - margins.right, y + 4, { align: 'right' })
  
  y += 20
  doc.setTextColor(0, 0, 0)
  
  // ============================================
  // FOOTER SECTION
  // ============================================
  // Check if bank details should be in footer
  const bankElement = getElement('bankDetails')
  const bankInHeader = bankElement.zone.startsWith('header-')
  
  if (!bankInHeader && displaySettings.showBankDetails) {
    y = addBankInfo(doc, company, y)
  }
  
  // Payment Terms
  y += 10
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  
  if (invoice.dueDate) {
    doc.text(`Payment is due by ${new Date(invoice.dueDate).toLocaleDateString('en-GB')}.`, margins.left, y)
  } else {
    doc.text('Payment is due upon receipt.', margins.left, y)
  }
  
  // Terms and conditions
  if (displaySettings.termsAndConditions) {
    y += 8
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('Terms and Conditions:', margins.left, y)
    y += 4
    doc.setFont('helvetica', 'normal')
    const termsLines = doc.splitTextToSize(displaySettings.termsAndConditions, contentWidth)
    termsLines.slice(0, 5).forEach((line: string) => {
      doc.text(line, margins.left, y)
      y += 3.5
    })
  }
  
  // Notes
  if (displaySettings.notes) {
    y += 5
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('Notes:', margins.left, y)
    y += 4
    doc.setFont('helvetica', 'normal')
    const notesLines = doc.splitTextToSize(displaySettings.notes, contentWidth)
    notesLines.slice(0, 3).forEach((line: string) => {
      doc.text(line, margins.left, y)
      y += 3.5
    })
  }
  
  // Footer text
  if (displaySettings.footerText) {
    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)
    doc.text(displaySettings.footerText, pageWidth / 2, pageHeight - margins.bottom - 10, { align: 'center' })
  }
  
  // Generation timestamp
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text(`Generated on ${new Date().toLocaleString('en-GB')}`, pageWidth / 2, pageHeight - margins.bottom, { align: 'center' })
  
  // Save
  doc.save(`Invoice-${invoice.invoiceNumber}.pdf`)
}

// ============================================
// GENERATE EXPORT PACKING LIST PDF
// ============================================

interface ExportPackingListLine {
  hsCode: string
  specification: string
  unit: string
  quantity: number
  packages: number
  packageNumber?: number
  grossWeight: number
  netWeight: number
  cbm: number
}

interface ExportPackingListData {
  packingListNumber: string
  shipper: string
  shipperTaxId?: string
  customerName: string
  customerAddress: string
  customerVat?: string
  customerContact?: string
  consigneeSameAsCustomer: boolean
  consigneeName?: string
  consigneeAddress?: string
  consigneeContact?: string
  useShippingAgent: boolean
  shippingAgentName?: string
  shippingAgentAddress?: string
  shippingAgentContact?: string
  invoiceNumber?: string
  invoiceDate?: string
  orderNumber?: string
  shippingPort?: string
  destinationPort?: string
  headerText?: string
  footerText?: string
  customNotes?: string
  lines: ExportPackingListLine[]
  totals: {
    quantity: number
    packages: number
    grossWeight: number
    netWeight: number
    cbm: number
  }
}

export function generateExportPackingListPdf(data: ExportPackingListData, branding?: BrandingConfig): void {
  const company = getCompanyInfo()
  const pdfBranding = brandingToPdfColors(branding)
  
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  
  // Professional colors for packing list (not too colorful)
  const headerBgColor: [number, number, number] = [60, 60, 60]  // Dark gray
  const totalsBgColor: [number, number, number] = [80, 80, 80]  // Slightly lighter gray
  const accentColor: [number, number, number] = [40, 40, 40]    // For title
  
  // Company Header with branding
  let y = addCompanyHeader(doc, company, 20, pdfBranding)
  
  // Horizontal line - professional dark gray
  doc.setDrawColor(60, 60, 60)
  doc.line(20, y, pageWidth - 20, y)
  y += 10
  
  // Document Title - professional dark color
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2])
  doc.text('PACKING LIST', pageWidth / 2, y, { align: 'center' })
  
  y += 6
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)
  doc.text(data.packingListNumber, pageWidth / 2, y, { align: 'center' })
  
  // Header text if provided
  if (data.headerText) {
    y += 6
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    const headerLines = doc.splitTextToSize(data.headerText, pageWidth - 40)
    doc.text(headerLines, pageWidth / 2, y, { align: 'center' })
    y += headerLines.length * 4
  }
  
  y += 10
  
  // Party boxes - determine how many boxes we need
  const hasShippingAgent = data.useShippingAgent && data.shippingAgentName
  const numBoxes = hasShippingAgent ? 3 : 2
  const boxWidth = (pageWidth - 40 - (numBoxes - 1) * 5) / numBoxes
  const boxStartY = y
  const boxHeight = 38
  
  // Shipper Box
  doc.setDrawColor(180, 180, 180)
  doc.setFillColor(252, 252, 254)
  doc.rect(20, boxStartY, boxWidth, boxHeight, 'FD')
  
  let boxY = boxStartY + 6
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(80, 80, 80)
  doc.text('SHIPPER', 25, boxY)
  boxY += 5
  
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)
  const shipperLines = doc.splitTextToSize(data.shipper || '-', boxWidth - 10)
  doc.text(shipperLines.slice(0, 4), 25, boxY)
  
  if (data.shipperTaxId) {
    boxY += Math.min(shipperLines.length, 4) * 4 + 2
    doc.setFontSize(8)
    doc.text(`Tax ID: ${data.shipperTaxId}`, 25, boxY)
  }
  
  // Consignee Box
  const consigneeName = data.consigneeSameAsCustomer ? data.customerName : data.consigneeName
  const consigneeAddress = data.consigneeSameAsCustomer ? data.customerAddress : data.consigneeAddress
  
  const consigneeBoxX = 20 + boxWidth + 5
  doc.setDrawColor(180, 180, 180)
  doc.setFillColor(252, 252, 254)
  doc.rect(consigneeBoxX, boxStartY, boxWidth, boxHeight, 'FD')
  
  boxY = boxStartY + 6
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(80, 80, 80)
  // Show "CUSTOMER/CONSIGNEE" when same as customer, otherwise just "CONSIGNEE"
  const consigneeLabel = data.consigneeSameAsCustomer ? 'CUSTOMER/CONSIGNEE' : 'CONSIGNEE'
  doc.text(consigneeLabel, consigneeBoxX + 5, boxY)
  boxY += 5
  
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text(consigneeName || '-', consigneeBoxX + 5, boxY)
  boxY += 4
  
  doc.setFont('helvetica', 'normal')
  const consigneeAddrLines = doc.splitTextToSize(consigneeAddress || '', boxWidth - 10)
  doc.text(consigneeAddrLines.slice(0, 3), consigneeBoxX + 5, boxY)
  
  if (data.customerVat) {
    boxY += Math.min(consigneeAddrLines.length, 3) * 4 + 2
    doc.setFontSize(8)
    doc.text(`VAT: ${data.customerVat}`, consigneeBoxX + 5, boxY)
  }
  
  // Shipping Agent Box (if used)
  if (hasShippingAgent) {
    const agentBoxX = 20 + (boxWidth + 5) * 2
    doc.setDrawColor(180, 180, 180)
    doc.setFillColor(252, 252, 254)
    doc.rect(agentBoxX, boxStartY, boxWidth, boxHeight, 'FD')
    
    boxY = boxStartY + 6
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(80, 80, 80)
    doc.text('NOTIFY / AGENT', agentBoxX + 5, boxY)
    boxY += 5
    
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text(data.shippingAgentName || '', agentBoxX + 5, boxY)
    boxY += 4
    
    doc.setFont('helvetica', 'normal')
    if (data.shippingAgentAddress) {
      const agentAddrLines = doc.splitTextToSize(data.shippingAgentAddress, boxWidth - 10)
      doc.text(agentAddrLines.slice(0, 3), agentBoxX + 5, boxY)
    }
  }
  
  y = boxStartY + boxHeight + 10
  
  // Reference info row
  doc.setFillColor(245, 245, 247)
  doc.rect(20, y, pageWidth - 40, 12, 'F')
  
  y += 8
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  
  const refItems = [
    { label: 'Invoice No.', value: data.invoiceNumber || '-' },
    { label: 'Invoice Date', value: data.invoiceDate ? new Date(data.invoiceDate).toLocaleDateString('en-GB') : '-' },
    { label: 'Order No.', value: data.orderNumber || '-' },
    { label: 'Port of Loading', value: data.shippingPort || '-' },
    { label: 'Port of Dest.', value: data.destinationPort || '-' }
  ]
  
  const refColWidth = (pageWidth - 40) / refItems.length
  refItems.forEach((item, idx) => {
    const x = 20 + refColWidth * idx + 5
    doc.setFont('helvetica', 'bold')
    doc.text(item.label, x, y - 2)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    doc.text(item.value, x, y + 3)
    doc.setTextColor(100, 100, 100)
  })
  
  y += 12
  
  // Check if there are grouped packages (items sharing packageNumber)
  const hasGroupedPackages = data.lines.some(l => l.packageNumber !== undefined && l.packageNumber !== null)
  const groupedPackageNumbers = new Set(data.lines.filter(l => l.packageNumber !== undefined && l.packageNumber !== null).map(l => l.packageNumber))
  
  // Items Table Header - professional dark gray
  doc.setFillColor(headerBgColor[0], headerBgColor[1], headerBgColor[2])
  doc.rect(20, y, pageWidth - 40, 8, 'F')
  
  y += 5.5
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  // Adjusted column positions to avoid overlap
  doc.text('#', 23, y)
  doc.text('HS CODE', 32, y)
  doc.text('DESCRIPTION', 55, y)
  doc.text('UNIT', 105, y)
  doc.text('QTY', 120, y, { align: 'right' })
  doc.text('PKGS', 132, y, { align: 'right' })
  doc.text('G.W.(Kgs)', 150, y, { align: 'right' })
  doc.text('N.W.(Kgs)', 168, y, { align: 'right' })
  doc.text('CBM', pageWidth - 22, y, { align: 'right' })
  
  y += 6
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'normal')
  
  // Track which package numbers we've already shown
  const shownPackageNumbers = new Set<number>()
  
  // Description column width (from x=55 to x=100 approx)
  const descMaxWidth = 45
  
  // Table Rows
  data.lines.forEach((line, index) => {
    // Calculate how many lines the description will take
    doc.setFontSize(8)
    const descLines = doc.splitTextToSize(line.specification, descMaxWidth)
    const numDescLines = Math.min(descLines.length, 3) // Max 3 lines
    const rowHeight = Math.max(8, numDescLines * 4 + 2)
    
    if (y + rowHeight > 260) {
      doc.addPage()
      y = 20
    }
    
    // Alternating background - increased contrast
    if (index % 2 === 0) {
      doc.setFillColor(235, 235, 240)
      doc.rect(20, y - 3, pageWidth - 40, rowHeight, 'F')
    }
    
    doc.setFontSize(8)
    doc.setTextColor(0, 0, 0)
    doc.text(`${index + 1}`, 23, y)
    doc.text(line.hsCode || '-', 32, y)
    
    // Description with word wrap (max 3 lines)
    doc.text(descLines.slice(0, 3), 55, y)
    
    // Position other columns on first line - matching header positions
    doc.text(line.unit, 105, y)
    doc.text(line.quantity.toString(), 120, y, { align: 'right' })
    
    // Handle package display for grouped items
    // For grouped items: show "1" only for the first item with that packageNumber, then show "*" for others
    // For non-grouped items: show the packages count normally
    let pkgDisplay: string
    if (line.packageNumber !== undefined && line.packageNumber !== null) {
      if (!shownPackageNumbers.has(line.packageNumber)) {
        // First item in this group - show "1" (one package for all items with this number)
        pkgDisplay = '1'
        shownPackageNumbers.add(line.packageNumber)
      } else {
        // Subsequent items in same group - show "*" to indicate they're in the same package
        pkgDisplay = '*'
      }
    } else {
      pkgDisplay = line.packages.toString()
    }
    doc.text(pkgDisplay, 132, y, { align: 'right' })
    
    doc.text(line.grossWeight.toFixed(2), 150, y, { align: 'right' })
    doc.text(line.netWeight.toFixed(2), 168, y, { align: 'right' })
    doc.text(line.cbm.toFixed(3), pageWidth - 22, y, { align: 'right' })
    
    y += rowHeight
  })
  
  // Totals row - professional dark gray
  y += 2
  doc.setFillColor(totalsBgColor[0], totalsBgColor[1], totalsBgColor[2])
  doc.rect(20, y - 3, pageWidth - 40, 10, 'F')
  
  y += 4
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('TOTAL', 55, y)
  doc.text(data.totals.quantity.toString(), 120, y, { align: 'right' })
  doc.text(data.totals.packages.toString(), 132, y, { align: 'right' })
  doc.text(data.totals.grossWeight.toFixed(2), 150, y, { align: 'right' })
  doc.text(data.totals.netWeight.toFixed(2), 168, y, { align: 'right' })
  doc.text(data.totals.cbm.toFixed(3), pageWidth - 22, y, { align: 'right' })
  
  // Add note if there are grouped packages
  if (hasGroupedPackages) {
    y += 10
    doc.setFontSize(7)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(100, 100, 100)
    doc.text(`* Items marked with "*" in PKGS column are packed together in the same package.`, 20, y)
  }
  
  y += 15
  
  // Summary boxes
  doc.setTextColor(0, 0, 0)
  doc.setFillColor(245, 245, 247)
  doc.rect(20, y, pageWidth - 40, 18, 'F')
  
  y += 12
  const summaryItems = [
    { label: 'Total Qty', value: data.totals.quantity.toString() },
    { label: 'Total Packages', value: data.totals.packages.toString() },
    { label: 'Gross Weight', value: `${data.totals.grossWeight.toFixed(2)} kg` },
    { label: 'Net Weight', value: `${data.totals.netWeight.toFixed(2)} kg` },
    { label: 'Total CBM', value: `${data.totals.cbm.toFixed(3)} m³` }
  ]
  
  const summaryColWidth = (pageWidth - 40) / summaryItems.length
  summaryItems.forEach((item, idx) => {
    const x = 20 + summaryColWidth * idx + summaryColWidth / 2
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text(item.label.toUpperCase(), x, y - 5, { align: 'center' })
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text(item.value, x, y + 2, { align: 'center' })
  })
  
  y += 15
  
  // Footer text
  if (data.footerText) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    const footerLines = doc.splitTextToSize(data.footerText, pageWidth - 40)
    doc.text(footerLines, 20, y)
    y += footerLines.length * 4 + 5
  }
  
  // Custom notes
  if (data.customNotes) {
    doc.setFillColor(255, 250, 240)
    doc.setDrawColor(255, 200, 100)
    const notesLines = doc.splitTextToSize(data.customNotes, pageWidth - 50)
    const notesHeight = notesLines.length * 4 + 10
    doc.rect(20, y, pageWidth - 40, notesHeight, 'FD')
    
    y += 6
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('Notes:', 25, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.text(notesLines, 25, y)
  }
  
  // Page footer
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text(`Generated on ${new Date().toLocaleString('en-GB')}`, pageWidth / 2, 285, { align: 'center' })
  
  // Save
  doc.save(`PackingList-${data.packingListNumber}.pdf`)
}

// ============================================
// PREVIEW FUNCTIONS - Return blob URL for display
// ============================================

// Preview Invoice PDF
export function previewInvoicePdf(): string {
  const company = getCompanyInfo()
  const docSettings = getDocumentSettings()
  const displaySettings = getDocumentDisplaySettings()
  const pdfBranding = brandingToPdfColors()
  const layoutConfig = getLayoutConfig('invoice')
  
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  
  // Use configured margins
  const margins = layoutConfig.margins
  const contentWidth = pageWidth - margins.left - margins.right
  
  // Get branding for logo
  const storedBranding = getBrandingFromStorage()
  const logoUrl = storedBranding?.logoUrl || company.logo
  const displayCompanyName = storedBranding?.companyName || company.name
  
  // Helper to get element config
  const getElement = (elementType: DocumentElement['type']) => {
    const el = layoutConfig.elements.find(e => e.type === elementType)
    return el || { type: elementType, zone: 'header-left' as const, visible: true, order: 0 }
  }
  
  // Calculate column X positions and widths
  const colLeftX = margins.left
  const colCenterX = pageWidth / 2
  const colRightX = pageWidth - margins.right
  const colWidth = contentWidth / 3
  
  // Get all header elements sorted by zone and order
  const headerElements = layoutConfig.elements
    .filter(el => el.zone.startsWith('header-') && el.visible)
    .sort((a, b) => a.order - b.order)
  
  // ============================================
  // HEADER SECTION - 3 columns
  // ============================================
  let headerLeftY = margins.top
  let headerCenterY = margins.top
  let headerRightY = margins.top
  
  // Process each header element
  for (const element of headerElements) {
    const zone = element.zone
    
    // Determine X position and alignment
    let x: number
    let align: 'left' | 'center' | 'right'
    let currentY: number
    
    if (zone === 'header-left') {
      x = colLeftX
      align = 'left'
      currentY = headerLeftY
    } else if (zone === 'header-center') {
      x = colCenterX
      align = 'center'
      currentY = headerCenterY
    } else {
      x = colRightX
      align = 'right'
      currentY = headerRightY
    }
    
    // Render element based on type
    switch (element.type) {
      case 'logo':
        if (logoUrl) {
          try {
            const logoW = 40
            const logoH = 20
            const logoX = zone === 'header-left' ? x : zone === 'header-center' ? x - logoW/2 : x - logoW
            doc.addImage(logoUrl, 'PNG', logoX, currentY - 5, logoW, logoH)
          } catch {
            try {
              const logoW = 40
              const logoH = 20
              const logoX = zone === 'header-left' ? x : zone === 'header-center' ? x - logoW/2 : x - logoW
              doc.addImage(logoUrl, 'JPEG', logoX, currentY - 5, logoW, logoH)
            } catch {
              // Skip if logo fails
            }
          }
        } else {
          // Placeholder
          const logoW = 40
          const logoH = 20
          const logoX = zone === 'header-left' ? x : zone === 'header-center' ? x - logoW/2 : x - logoW
          doc.setDrawColor(200, 200, 200)
          doc.setFillColor(245, 245, 245)
          doc.rect(logoX, currentY - 5, logoW, logoH, 'FD')
          doc.setFontSize(8)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(150, 150, 150)
          doc.text('LOGO', logoX + logoW/2, currentY + 5, { align: 'center' })
        }
        if (zone === 'header-left') headerLeftY += 25
        else if (zone === 'header-center') headerCenterY += 25
        else headerRightY += 25
        break
        
      case 'companyInfo':
        doc.setFontSize(16)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(pdfBranding.primaryColor[0], pdfBranding.primaryColor[1], pdfBranding.primaryColor[2])
        doc.text(displayCompanyName, x, currentY, { align })
        currentY += 6
        
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(100, 100, 100)
        
        if (displaySettings.showCompanyAddress) {
          doc.text(company.address.street, x, currentY, { align })
          currentY += 4
          doc.text(`${company.address.city}, ${company.address.postalCode}`, x, currentY, { align })
          currentY += 4
          doc.text(company.address.country, x, currentY, { align })
          currentY += 4
        }
        if (displaySettings.showPhone && company.phone) {
          doc.text(`Tel: ${company.phone}`, x, currentY, { align })
          currentY += 4
        }
        if (displaySettings.showEmail && company.email) {
          doc.text(`Email: ${company.email}`, x, currentY, { align })
          currentY += 4
        }
        if (displaySettings.showWebsite && company.website) {
          doc.text(`Web: ${company.website}`, x, currentY, { align })
          currentY += 4
        }
        if (displaySettings.showVAT && company.vatNumber) {
          doc.text(`VAT: ${company.vatNumber}`, x, currentY, { align })
          currentY += 4
        }
        if (displaySettings.showRegistrationNumber && company.registrationNumber) {
          doc.text(`Reg: ${company.registrationNumber}`, x, currentY, { align })
          currentY += 4
        }
        
        if (zone === 'header-left') headerLeftY = currentY + 5
        else if (zone === 'header-center') headerCenterY = currentY + 5
        else headerRightY = currentY + 5
        break
        
      case 'documentTitle':
        doc.setFontSize(22)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(pdfBranding.primaryColor[0], pdfBranding.primaryColor[1], pdfBranding.primaryColor[2])
        doc.text('INVOICE', x, currentY + 5, { align })
        
        if (zone === 'header-left') headerLeftY += 15
        else if (zone === 'header-center') headerCenterY += 15
        else headerRightY += 15
        break
        
      case 'documentInfo':
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(80, 80, 80)
        doc.text('Invoice #: INV-2026-0001', x, currentY, { align })
        currentY += 5
        doc.text('Date: 17/02/2026', x, currentY, { align })
        currentY += 5
        doc.text('Due Date: 17/03/2026', x, currentY, { align })
        
        if (zone === 'header-left') headerLeftY = currentY + 8
        else if (zone === 'header-center') headerCenterY = currentY + 8
        else headerRightY = currentY + 8
        break
        
      case 'billTo':
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 0, 0)
        doc.text('BILL TO:', x, currentY, { align })
        currentY += 6
        
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(11)
        doc.text('Sample Company Ltd', x, currentY, { align })
        currentY += 5
        doc.setFontSize(9)
        doc.text('John Smith', x, currentY, { align })
        currentY += 4
        doc.text('123 Business Street', x, currentY, { align })
        currentY += 4
        doc.text('London, UK', x, currentY, { align })
        currentY += 4
        
        if (zone === 'header-left') headerLeftY = currentY + 5
        else if (zone === 'header-center') headerCenterY = currentY + 5
        else headerRightY = currentY + 5
        break
        
      case 'bankDetails':
        // Check if bank details should be shown (both layout visibility and display settings)
        if (displaySettings.showBankDetails) {
          doc.setFontSize(9)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(0, 0, 0)
          doc.text('Bank Details', x, currentY, { align })
          currentY += 4
          
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(8)
          doc.setTextColor(80, 80, 80)
          if (company.bankInfo?.bankName) {
            doc.text(`Bank: ${company.bankInfo.bankName}`, x, currentY, { align })
            currentY += 3
          }
          if (company.bankInfo?.accountName) {
            doc.text(`Account: ${company.bankInfo.accountName}`, x, currentY, { align })
            currentY += 3
          }
          if (company.bankInfo?.accountNumber) {
            doc.text(`Number: ${company.bankInfo.accountNumber}`, x, currentY, { align })
            currentY += 3
          }
          currentY += 3
          if (company.bankInfo?.swiftCode) {
            doc.text(`SWIFT: ${company.bankInfo.swiftCode}`, x, currentY, { align })
            currentY += 3
          }
          
          if (zone === 'header-left') headerLeftY = currentY + 5
          else if (zone === 'header-center') headerCenterY = currentY + 5
          else headerRightY = currentY + 5
        }
        break
    }
  }
  
  // Calculate where header ends (max of all columns)
  let y = Math.max(headerLeftY, headerCenterY, headerRightY) + 5
  
  // Line separator
  doc.setDrawColor(pdfBranding.primaryColor[0], pdfBranding.primaryColor[1], pdfBranding.primaryColor[2])
  doc.line(margins.left, y, pageWidth - margins.right, y)
  y += 10
  
  // Header Text (user-defined text that appears at the top)
  if (displaySettings.headerText && displaySettings.headerText.trim().length > 0) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 60, 60)
    const headerLines = doc.splitTextToSize(displaySettings.headerText, contentWidth)
    for (const line of headerLines) {
      doc.text(line, margins.left, y)
      y += 5
    }
    y += 5
  }
  
  // ============================================
  // BODY SECTION
  // ============================================
  
  // Bill To - only render in body if it's in a body zone
  const billToElement = getElement('billTo')
  if (billToElement.visible && billToElement.zone.startsWith('body-')) {
    const billToX = billToElement.zone.includes('right') ? colRightX : colLeftX
    const billToAlign = billToElement.zone.includes('right') ? 'right' : 'left'
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text('BILL TO:', billToX, y, { align: billToAlign as 'left' | 'right' })
    
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.text('Sample Company Ltd', billToX, y + 6, { align: billToAlign as 'left' | 'right' })
    doc.setFontSize(9)
    doc.text('John Smith', billToX, y + 11, { align: billToAlign as 'left' | 'right' })
    doc.text('123 Business Street', billToX, y + 15, { align: billToAlign as 'left' | 'right' })
    doc.text('London, UK', billToX, y + 19, { align: billToAlign as 'left' | 'right' })
    
    y += 28
  }
  
  // Check visibility helper
  const isVisible = (elementType: DocumentElement['type']) => {
    const el = layoutConfig.elements.find(e => e.type === elementType)
    return el ? el.visible : true
  }
  
  // Custom Fields - Body Top position
  y = renderCustomFields(doc, displaySettings.customFields, 'body-top', 'invoice', y, pageWidth)
  
  // Sample items for configurable table
  const sampleItems: TableRowData[] = [
    { rowNumber: 1, description: 'Product A - Premium Quality', quantity: 10, unitPrice: 150, total: 1500, hsCode: '8901.10', reference: 'PROD-A' },
    { rowNumber: 2, description: 'Product B - Standard Edition', quantity: 5, unitPrice: 200, total: 1000, hsCode: '8901.20', reference: 'PROD-B' },
    { rowNumber: 3, description: 'Shipping & Handling', quantity: 1, unitPrice: 50, total: 50, reference: 'SHIP-01' }
  ]
  
  // Use configurable table rendering with margins
  const tableResult = renderConfigurableTable(
    doc,
    layoutConfig.tableColumns,
    sampleItems,
    y,
    pageWidth,
    pdfBranding,
    '€',
    margins.left,
    margins.right
  )
  y = tableResult.y
  const subtotal = tableResult.subtotal
  
  // Totals
  if (isVisible('totals')) {
    y += 5
    doc.setFillColor(pdfBranding.primaryColor[0], pdfBranding.primaryColor[1], pdfBranding.primaryColor[2])
    doc.rect(pageWidth / 2, y - 4, contentWidth / 2, 12, 'F')
    
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text('TOTAL:', pageWidth / 2 + 10, y + 4)
    doc.text(`€${subtotal.toFixed(2)}`, pageWidth - margins.right - 5, y + 4, { align: 'right' })
    
    y += 15
  }
  
  // Custom Fields - Body Bottom position
  y = renderCustomFields(doc, displaySettings.customFields, 'body-bottom', 'invoice', y, pageWidth)
  
  // Bank info - only render here if it's in footer or body zone (not header - already rendered above)
  const bankDetailsElement = layoutConfig.elements.find(e => e.type === 'bankDetails')
  const showBankInLayout = bankDetailsElement ? bankDetailsElement.visible : true
  const showBankInSettings = displaySettings.showBankDetails
  const bankZone = bankDetailsElement?.zone || 'footer'
  const bankInHeader = bankZone.startsWith('header-')
  
  // Only render bank details here if NOT in header (header elements are rendered above)
  if (showBankInLayout && showBankInSettings && !bankInHeader) {
    y += 10
    // Determine position based on zone
    let bankPosition: 'left' | 'right' | 'full' = 'full'
    
    if (bankZone === 'body-right') {
      bankPosition = 'right'
    } else if (bankZone === 'body-left') {
      bankPosition = 'left'
    }
    
    y = addBankInfo(doc, company, y, margins.left, margins.right, bankPosition)
  }
  
  // Custom Fields - Footer position
  y = renderCustomFields(doc, displaySettings.customFields, 'footer', 'invoice', y, pageWidth)
  
  // Terms, Notes, Footer text
  if (isVisible('termsNotes')) {
    y = renderFooterContent(doc, displaySettings, y, pageWidth)
  }
  
  // Footer
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text('Preview - Generated for demonstration purposes', pageWidth / 2, pageHeight - margins.bottom, { align: 'center' })
  
  // Return blob URL
  const blob = doc.output('blob')
  return URL.createObjectURL(blob)
}

// Preview Quote PDF
export function previewQuotePdf(): string {
  const company = getCompanyInfo()
  const displaySettings = getDocumentDisplaySettings()
  const pdfBranding = brandingToPdfColors()
  const layoutConfig = getLayoutConfig('quote')
  
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const margins = layoutConfig.margins
  
  let y = addCompanyHeader(doc, company, margins.top, pdfBranding, displaySettings)
  
  doc.setDrawColor(pdfBranding.primaryColor[0], pdfBranding.primaryColor[1], pdfBranding.primaryColor[2])
  doc.line(margins.left, y, pageWidth - margins.right, y)
  y += 10
  
  // Title
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(pdfBranding.primaryColor[0], pdfBranding.primaryColor[1], pdfBranding.primaryColor[2])
  doc.text('QUOTATION', pageWidth / 2, y, { align: 'center' })
  y += 12
  
  // Quote info
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)
  doc.text('Quote #: Q-20260001', margins.left, y)
  doc.text('Date: 17/02/2026', pageWidth - margins.right, y, { align: 'right' })
  y += 6
  doc.text('Valid for: 30 days', margins.left, y)
  y += 15
  
  // Customer
  doc.setFont('helvetica', 'bold')
  doc.text('Quote To:', margins.left, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text('Sample Customer Inc', margins.left, y)
  y += 4
  doc.text('contact@sample.com', margins.left, y)
  y += 12
  
  // Custom Fields - Body Top position
  y = renderCustomFields(doc, displaySettings.customFields, 'body-top', 'quote', y, pageWidth)
  
  // Sample items for configurable table
  const sampleItems: TableRowData[] = [
    { rowNumber: 1, reference: 'PRD-001', description: 'Racing Equipment Set', quantity: 2, unitPrice: 1500, total: 3000 },
    { rowNumber: 2, reference: 'PRD-002', description: 'Accessories Package', quantity: 1, unitPrice: 450, total: 450 }
  ]
  
  // Use configurable table rendering with margins
  const tableResult = renderConfigurableTable(
    doc,
    layoutConfig.tableColumns,
    sampleItems,
    y,
    pageWidth,
    pdfBranding,
    '€',
    margins.left,
    margins.right
  )
  y = tableResult.y
  const total = tableResult.subtotal
  
  // Total
  y += 5
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('Subtotal:', 140, y, { align: 'right' })
  doc.text(`€${total.toLocaleString()}`, pageWidth - 22, y, { align: 'right' })
  y += 7
  doc.text('Shipping:', 140, y, { align: 'right' })
  doc.text('To be calculated', pageWidth - 22, y, { align: 'right' })
  
  y += 10
  
  // Custom Fields - Body Bottom position
  y = renderCustomFields(doc, displaySettings.customFields, 'body-bottom', 'quote', y, pageWidth)
  
  // Custom Fields - Footer position
  y = renderCustomFields(doc, displaySettings.customFields, 'footer', 'quote', y, pageWidth)
  
  // Terms, Notes, Footer text
  y = renderFooterContent(doc, displaySettings, y, pageWidth)
  
  // Footer
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text('Preview - Generated for demonstration purposes', pageWidth / 2, 285, { align: 'center' })
  
  const blob = doc.output('blob')
  return URL.createObjectURL(blob)
}

// Preview Export Packing List PDF
export function previewExportPackingListPdf(): string {
  const company = getCompanyInfo()
  const displaySettings = getDocumentDisplaySettings()
  const pdfBranding = brandingToPdfColors()
  const layoutConfig = getLayoutConfig('packingListExport')
  
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const margins = layoutConfig.margins
  
  const headerBgColor: [number, number, number] = [60, 60, 60]
  const totalsBgColor: [number, number, number] = [80, 80, 80]
  
  let y = addCompanyHeader(doc, company, margins.top, pdfBranding, displaySettings)
  
  doc.setDrawColor(60, 60, 60)
  doc.line(margins.left, y, pageWidth - margins.right, y)
  y += 10
  
  // Title
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(40, 40, 40)
  doc.text('PACKING LIST', pageWidth / 2, y, { align: 'center' })
  y += 6
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)
  doc.text('EPL-2026-SAMPLE', pageWidth / 2, y, { align: 'center' })
  y += 12
  
  // Party boxes
  const boxWidth = (pageWidth - 50) / 2
  const boxHeight = 35
  
  // Shipper
  doc.setDrawColor(180, 180, 180)
  doc.setFillColor(252, 252, 254)
  doc.rect(20, y, boxWidth, boxHeight, 'FD')
  
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(80, 80, 80)
  doc.text('SHIPPER', 25, y + 6)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)
  doc.text(company.name, 25, y + 12)
  doc.text(company.address.street, 25, y + 16)
  doc.text(`${company.address.city}, ${company.address.country}`, 25, y + 20)
  
  // Consignee
  doc.setDrawColor(180, 180, 180)
  doc.setFillColor(252, 252, 254)
  doc.rect(25 + boxWidth, y, boxWidth, boxHeight, 'FD')
  
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(80, 80, 80)
  doc.text('CUSTOMER/CONSIGNEE', 30 + boxWidth, y + 6)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('Sample Consignee Ltd', 30 + boxWidth, y + 12)
  doc.setFont('helvetica', 'normal')
  doc.text('456 Import Road', 30 + boxWidth, y + 16)
  doc.text('Rotterdam, Netherlands', 30 + boxWidth, y + 20)
  
  y += boxHeight + 10
  
  // Reference row
  doc.setFillColor(245, 245, 247)
  doc.rect(20, y, pageWidth - 40, 12, 'F')
  
  y += 8
  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  doc.setFont('helvetica', 'bold')
  doc.text('Invoice No.', 25, y - 2)
  doc.text('INV-2026-001', 25, y + 3)
  doc.text('Port of Loading', 90, y - 2)
  doc.text('Shanghai', 90, y + 3)
  doc.text('Port of Dest.', 140, y - 2)
  doc.text('Rotterdam', 140, y + 3)
  
  y += 12
  
  // Custom Fields - Body Top position
  y = renderCustomFields(doc, displaySettings.customFields, 'body-top', 'packingList', y, pageWidth)
  
  // Sample items for packing list
  const sampleItems: TableRowData[] = [
    { rowNumber: 1, hsCode: '890399', description: 'Racing boat equipment', unit: 'PCS', quantity: 10, packages: 2, weight: 250, netWeight: 220, cbm: 1.5, unitPrice: 0, total: 0 },
    { rowNumber: 2, hsCode: '890399', description: 'Spare parts kit', unit: 'SETS', quantity: 5, packages: 1, weight: 50, netWeight: 45, cbm: 0.3, unitPrice: 0, total: 0 }
  ]
  
  // Calculate totals
  let totQty = 0, totPkgs = 0, totGw = 0, totNw = 0, totCbm = 0
  sampleItems.forEach(item => {
    totQty += item.quantity
    totPkgs += item.packages || 0
    totGw += item.weight || 0
    totNw += item.netWeight || 0
    totCbm += item.cbm || 0
  })
  
  // Render table using configurable columns
  const tableResult = renderConfigurableTable(
    doc,
    layoutConfig.tableColumns,
    sampleItems,
    y,
    pageWidth,
    { primaryColor: headerBgColor },
    ''  // No currency for packing list
  )
  y = tableResult.y
  
  // Totals row
  y += 2
  doc.setFillColor(totalsBgColor[0], totalsBgColor[1], totalsBgColor[2])
  doc.rect(20, y - 3, pageWidth - 40, 10, 'F')
  
  y += 4
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('TOTAL', 55, y)
  doc.text(totQty.toString(), 120, y, { align: 'right' })
  doc.text(totPkgs.toString(), 132, y, { align: 'right' })
  doc.text(totGw.toFixed(2), 150, y, { align: 'right' })
  doc.text(totNw.toFixed(2), 168, y, { align: 'right' })
  doc.text(totCbm.toFixed(3), pageWidth - 22, y, { align: 'right' })
  
  // Summary
  y += 15
  doc.setFillColor(245, 245, 247)
  doc.rect(20, y, pageWidth - 40, 18, 'F')
  
  y += 12
  doc.setTextColor(0, 0, 0)
  const summaryItems = [
    { label: 'Total Qty', value: totQty.toString() },
    { label: 'Total Packages', value: totPkgs.toString() },
    { label: 'Gross Weight', value: `${totGw.toFixed(2)} kg` },
    { label: 'Net Weight', value: `${totNw.toFixed(2)} kg` },
    { label: 'Total CBM', value: `${totCbm.toFixed(3)} m³` }
  ]
  
  const colWidth = (pageWidth - 40) / summaryItems.length
  summaryItems.forEach((item, idx) => {
    const x = 20 + colWidth * idx + colWidth / 2
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text(item.label.toUpperCase(), x, y - 5, { align: 'center' })
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text(item.value, x, y + 2, { align: 'center' })
  })
  
  y += 15
  
  // Custom Fields - Body Bottom position
  y = renderCustomFields(doc, displaySettings.customFields, 'body-bottom', 'packingList', y, pageWidth)
  
  // Custom Fields - Footer position
  y = renderCustomFields(doc, displaySettings.customFields, 'footer', 'packingList', y, pageWidth)
  
  // Terms, Notes, Footer text
  y = renderFooterContent(doc, displaySettings, y, pageWidth)
  
  // Footer
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text('Preview - Generated for demonstration purposes', pageWidth / 2, 285, { align: 'center' })
  
  const blob = doc.output('blob')
  return URL.createObjectURL(blob)
}

// Preview Factory Packing List PDF
export function previewFactoryPackingListPdf(): string {
  const company = getCompanyInfo()
  const displaySettings = getDocumentDisplaySettings()
  const pdfBranding = brandingToPdfColors()
  const layoutConfig = getLayoutConfig('packingListFactory')
  
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const margins = layoutConfig.margins
  
  let y = addCompanyHeader(doc, company, margins.top, pdfBranding, displaySettings)
  
  doc.setDrawColor(pdfBranding.secondaryColor[0], pdfBranding.secondaryColor[1], pdfBranding.secondaryColor[2])
  doc.line(margins.left, y, pageWidth - margins.right, y)
  y += 10
  
  // Title
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(pdfBranding.secondaryColor[0], pdfBranding.secondaryColor[1], pdfBranding.secondaryColor[2])
  doc.text('FACTORY PACKING LIST', pageWidth / 2, y, { align: 'center' })
  y += 8
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80, 80, 80)
  doc.text('For internal production use', pageWidth / 2, y, { align: 'center' })
  y += 15
  
  // Order info
  doc.setFillColor(245, 245, 247)
  doc.roundedRect(20, y, pageWidth - 40, 20, 3, 3, 'F')
  
  y += 8
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('Order: ORD-2026-0001', 30, y)
  doc.text('Date: 16/02/2026', pageWidth - 30, y, { align: 'right' })
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text('Customer: Sample Customer', 30, y)
  
  y += 15
  
  // Custom Fields - Body Top position
  y = renderCustomFields(doc, displaySettings.customFields, 'body-top', 'packingList', y, pageWidth)
  
  // Sample items for factory packing list
  const sampleItems: TableRowData[] = [
    { rowNumber: 1, reference: 'PRD-001', description: 'Racing Shell - Competition', quantity: 2, unitPrice: 0, total: 0 },
    { rowNumber: 2, reference: 'PRD-002', description: 'Oars Set - Carbon', quantity: 4, unitPrice: 0, total: 0 },
    { rowNumber: 3, reference: 'PRD-003', description: 'Rigger Assembly', quantity: 2, unitPrice: 0, total: 0 }
  ]
  
  // Calculate total quantity
  let totalQty = 0
  sampleItems.forEach(item => {
    totalQty += item.quantity
  })
  
  // Render table using configurable columns
  const tableResult = renderConfigurableTable(
    doc,
    layoutConfig.tableColumns,
    sampleItems,
    y,
    pageWidth,
    { primaryColor: [pdfBranding.secondaryColor[0], pdfBranding.secondaryColor[1], pdfBranding.secondaryColor[2]] },
    ''  // No currency for factory packing list
  )
  y = tableResult.y
  
  // Total
  y += 5
  doc.setDrawColor(200, 200, 200)
  doc.line(20, y, pageWidth - 20, y)
  
  y += 10
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text(`Total Items: ${sampleItems.length}`, 25, y)
  doc.text(`Total Units: ${totalQty}`, pageWidth - 30, y, { align: 'right' })
  
  // Signature
  y += 25
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text('Packed by: _______________________', 25, y)
  doc.text('Date: _____________', pageWidth - 70, y)
  
  y += 15
  doc.text('Received by: _______________________', 25, y)
  doc.text('Date: _____________', pageWidth - 70, y)
  
  y += 15
  
  // Custom Fields - Body Bottom position
  y = renderCustomFields(doc, displaySettings.customFields, 'body-bottom', 'packingList', y, pageWidth)
  
  // Custom Fields - Footer position
  y = renderCustomFields(doc, displaySettings.customFields, 'footer', 'packingList', y, pageWidth)
  
  // Terms, Notes, Footer text
  y = renderFooterContent(doc, displaySettings, y, pageWidth)
  
  // Footer
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text('Preview - Generated for demonstration purposes', pageWidth / 2, 285, { align: 'center' })
  
  const blob = doc.output('blob')
  return URL.createObjectURL(blob)
}