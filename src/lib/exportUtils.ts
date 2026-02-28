export type ExportFormat = 'excel' | 'csv' | 'pdf'

export interface ExportColumn {
  key: string
  label: string
  selected: boolean
  isCustomField?: boolean
}

export interface ExportOptions {
  format: ExportFormat
  filename: string
  columns: ExportColumn[]
  dateRange?: {
    start: Date | null
    end: Date | null
  }
  filterBy?: {
    type: 'all' | 'customer' | 'category' | 'subcategory'
    id?: string
  }
}

export type PeriodPreset = 
  | 'all' 
  | 'today' 
  | 'yesterday'
  | 'last7days' 
  | 'last30days'
  | 'thisMonth' 
  | 'lastMonth' 
  | 'thisQuarter' 
  | 'lastQuarter'
  | 'thisYear' 
  | 'lastYear' 
  | 'custom'

export function getDateRangeForPreset(preset: PeriodPreset): { start: Date | null; end: Date | null } {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  switch (preset) {
    case 'all':
      return { start: null, end: null }
    
    case 'today':
      return { 
        start: today, 
        end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1) 
      }
    
    case 'yesterday':
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
      return { 
        start: yesterday, 
        end: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000 - 1) 
      }
    
    case 'last7days':
      return { 
        start: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000), 
        end: now 
      }
    
    case 'last30days':
      return { 
        start: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000), 
        end: now 
      }
    
    case 'thisMonth':
      return { 
        start: new Date(now.getFullYear(), now.getMonth(), 1), 
        end: now 
      }
    
    case 'lastMonth':
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
      return { start: lastMonthStart, end: lastMonthEnd }
    
    case 'thisQuarter':
      const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
      return { start: quarterStart, end: now }
    
    case 'lastQuarter':
      const lastQuarterEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 0)
      const lastQuarterStart = new Date(lastQuarterEnd.getFullYear(), Math.floor(lastQuarterEnd.getMonth() / 3) * 3, 1)
      return { start: lastQuarterStart, end: lastQuarterEnd }
    
    case 'thisYear':
      return { 
        start: new Date(now.getFullYear(), 0, 1), 
        end: now 
      }
    
    case 'lastYear':
      return { 
        start: new Date(now.getFullYear() - 1, 0, 1), 
        end: new Date(now.getFullYear() - 1, 11, 31) 
      }
    
    case 'custom':
      return { start: null, end: null }
    
    default:
      return { start: null, end: null }
  }
}

export function formatDateForExport(date: Date | string | null): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatCurrencyForExport(amount: number | string, currency = 'EUR'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency 
  }).format(num || 0)
}

// Format a value based on its type and key name
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatValue(value: any, key: string): string | number {
  if (value === null || value === undefined) return ''
  
  // Handle dates
  if (key.toLowerCase().includes('date') || key.toLowerCase().includes('at') || key === 'createdAt' || key === 'updatedAt' || key === 'sentAt' || key === 'issueDate' || key === 'dueDate' || key === 'validUntil') {
    if (typeof value === 'string' && value.includes('T')) {
      return formatDateForExport(value)
    }
    if (value instanceof Date) {
      return formatDateForExport(value)
    }
  }
  
  // Handle booleans
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }
  
  // Handle numbers - keep as numbers for Excel formatting
  if (typeof value === 'number') {
    // Format amounts with 2 decimals
    if (key.toLowerCase().includes('amount') || key.toLowerCase().includes('price') || key.toLowerCase().includes('total') || key.toLowerCase().includes('subtotal') || key.toLowerCase().includes('discount') || key.toLowerCase().includes('charge')) {
      return Math.round(value * 100) / 100
    }
    return value
  }
  
  // Handle string numbers (from Decimal fields)
  if (typeof value === 'string' && !isNaN(parseFloat(value)) && isFinite(Number(value))) {
    const num = parseFloat(value)
    if (key.toLowerCase().includes('amount') || key.toLowerCase().includes('price') || key.toLowerCase().includes('total') || key.toLowerCase().includes('subtotal')) {
      return Math.round(num * 100) / 100
    }
  }
  
  // Handle arrays/objects
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  
  return String(value)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function prepareDataForExport(data: any[], columns: ExportColumn[]): any[] {
  const selectedColumns = columns.filter(c => c.selected)
  
  return data.map(item => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row: any = {}
    selectedColumns.forEach(col => {
      // Handle nested properties (e.g., "customer.companyName")
      const keys = col.key.split('.')
      let value = item
      for (const key of keys) {
        value = value?.[key]
      }
      
      // Handle custom fields
      if (col.isCustomField && item.customFields) {
        value = item.customFields[col.key] ?? ''
      }
      
      row[col.label] = formatValue(value, col.key)
    })
    return row
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function exportToExcel(data: any[], filename: string): Promise<void> {
  const XLSX = await import('xlsx')
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data')
  
  // Auto-size columns
  const maxWidth = 50
  const cols = Object.keys(data[0] || {}).map(key => ({
    wch: Math.min(
      maxWidth,
      Math.max(
        key.length,
        ...data.map(row => String(row[key] || '').length)
      )
    )
  }))
  worksheet['!cols'] = cols
  
  XLSX.writeFile(workbook, `${filename}.xlsx`)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function exportToCSV(data: any[], filename: string): Promise<void> {
  const XLSX = await import('xlsx')
  const worksheet = XLSX.utils.json_to_sheet(data)
  const csv = XLSX.utils.sheet_to_csv(worksheet)
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function exportToPDF(data: any[], filename: string, title: string): void {
  // Create a printable HTML table
  const columns = Object.keys(data[0] || {})
  
  const tableHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #1d1d1f; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th { background-color: #f5f5f7; text-align: left; padding: 8px; border: 1px solid #d2d2d7; font-weight: 600; }
        td { padding: 8px; border: 1px solid #d2d2d7; }
        tr:nth-child(even) { background-color: #fafafa; }
        .footer { margin-top: 20px; font-size: 11px; color: #86868b; }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <p>Generated on ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
      <table>
        <thead>
          <tr>${columns.map(col => `<th>${col}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${data.map(row => `<tr>${columns.map(col => `<td>${row[col] ?? ''}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
      <div class="footer">Total: ${data.length} records</div>
    </body>
    </html>
  `
  
  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(tableHTML)
    printWindow.document.close()
    setTimeout(() => {
      printWindow.print()
    }, 500)
  }
}

// Helper to download data based on format
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function downloadExport(
  data: any[], 
  options: { format: ExportFormat; filename: string; title?: string }
): Promise<void> {
  const { format, filename, title } = options
  
  switch (format) {
    case 'excel':
      await exportToExcel(data, filename)
      break
    case 'csv':
      await exportToCSV(data, filename)
      break
    case 'pdf':
      exportToPDF(data, filename, title || filename)
      break
  }
}

// Period preset labels
export const periodPresetLabels: Record<PeriodPreset, string> = {
  all: 'All Time',
  today: 'Today',
  yesterday: 'Yesterday',
  last7days: 'Last 7 Days',
  last30days: 'Last 30 Days',
  thisMonth: 'This Month',
  lastMonth: 'Last Month',
  thisQuarter: 'This Quarter',
  lastQuarter: 'Last Quarter',
  thisYear: 'This Year',
  lastYear: 'Last Year',
  custom: 'Custom Range'
}
