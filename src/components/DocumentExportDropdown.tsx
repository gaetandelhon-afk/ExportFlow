'use client'

import { useState, useRef, useEffect } from 'react'
import { Download, FileSpreadsheet, Table2, FileText, ChevronDown } from 'lucide-react'
import { ExportFormat } from '@/lib/exportUtils'

interface DocumentExportDropdownProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
  filename: string
  title: string
  documentType: 'invoice' | 'quote' | 'packingList' | 'order'
}

export function DocumentExportDropdown({ data, filename, title, documentType }: DocumentExportDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const formatDate = (date: string | null | undefined): string => {
    if (!date) return ''
    try {
      return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
    } catch {
      return ''
    }
  }

  const formatCurrency = (amount: number | string | null | undefined): string => {
    const num = typeof amount === 'string' ? parseFloat(amount) : (amount || 0)
    return num.toFixed(2)
  }

  const getDocumentInfo = () => {
    if (documentType === 'invoice' || documentType === 'quote') {
      return [
        { Field: 'Document Number', Value: data.invoiceNumber || '' },
        { Field: 'Type', Value: data.type || documentType.toUpperCase() },
        { Field: 'Status', Value: data.status || '' },
        { Field: 'Issue Date', Value: formatDate(data.issueDate) },
        { Field: documentType === 'quote' ? 'Valid Until' : 'Due Date', Value: formatDate(data.validUntil || data.dueDate) },
        { Field: 'Customer', Value: data.customerName || '' },
        { Field: 'Currency', Value: data.currency || '' },
        { Field: 'Subtotal', Value: formatCurrency(data.subtotal) },
        { Field: 'Total Charges', Value: formatCurrency(data.totalCharges) },
        { Field: 'Total Discounts', Value: formatCurrency(data.totalDiscounts) },
        { Field: 'Total Amount', Value: formatCurrency(data.totalAmount) },
      ]
    } else if (documentType === 'packingList') {
      return [
        { Field: 'Packing List Number', Value: data.packingListNumber || '' },
        { Field: 'Type', Value: data.type || '' },
        { Field: 'Status', Value: data.status || '' },
        { Field: 'Order Number', Value: data.orderNumber || '' },
        { Field: 'Customer', Value: data.customerName || '' },
        { Field: 'Total Weight (kg)', Value: formatCurrency(data.totalWeight) },
        { Field: 'Total Cartons', Value: String(data.totalCartons || 0) },
        { Field: 'Total CBM', Value: formatCurrency(data.totalCbm) },
      ]
    } else {
      return [
        { Field: 'Order Number', Value: data.orderNumber || '' },
        { Field: 'Status', Value: data.status || '' },
        { Field: 'Created At', Value: formatDate(data.createdAt) },
        { Field: 'Customer', Value: data.customerName || '' },
        { Field: 'Currency', Value: data.currency || '' },
        { Field: 'Subtotal', Value: formatCurrency(data.subtotal) },
        { Field: 'Total Charges', Value: formatCurrency(data.totalCharges) },
        { Field: 'Total Discounts', Value: formatCurrency(data.totalDiscounts) },
        { Field: 'Total Amount', Value: formatCurrency(data.totalAmount) },
      ]
    }
  }

  const getLineItems = () => {
    if (!data.lines || !Array.isArray(data.lines)) return []
    
    return data.lines.map((line: { ref?: string; productRef?: string; nameEn?: string; productName?: string; quantity?: number; unitPrice?: number; lineTotal?: number }, index: number) => ({
      '#': index + 1,
      'Reference': line.ref || line.productRef || '',
      'Product Name': line.nameEn || line.productName || '',
      'Quantity': line.quantity || 0,
      'Unit Price': formatCurrency(line.unitPrice),
      'Line Total': formatCurrency(line.lineTotal),
    }))
  }

  const getCharges = () => {
    if (!data.charges || !Array.isArray(data.charges)) return []
    
    return data.charges.map((charge: { description?: string; amount?: number }) => ({
      'Description': charge.description || '',
      'Amount': formatCurrency(charge.amount),
    }))
  }

  const getDiscounts = () => {
    if (!data.discounts || !Array.isArray(data.discounts)) return []
    
    return data.discounts.map((discount: { description?: string; type?: string; value?: number; amount?: number }) => ({
      'Description': discount.description || '',
      'Type': discount.type || '',
      'Value': discount.value || 0,
      'Amount': formatCurrency(discount.amount),
    }))
  }

  const exportToExcel = async () => {
    const XLSX = await import('xlsx')
    const workbook = XLSX.utils.book_new()
    
    // Document Info Sheet
    const docInfo = getDocumentInfo()
    const infoSheet = XLSX.utils.json_to_sheet(docInfo)
    infoSheet['!cols'] = [{ wch: 20 }, { wch: 40 }]
    XLSX.utils.book_append_sheet(workbook, infoSheet, 'Document Info')
    
    // Line Items Sheet
    const lines = getLineItems()
    if (lines.length > 0) {
      const linesSheet = XLSX.utils.json_to_sheet(lines)
      linesSheet['!cols'] = [{ wch: 5 }, { wch: 15 }, { wch: 35 }, { wch: 10 }, { wch: 12 }, { wch: 12 }]
      XLSX.utils.book_append_sheet(workbook, linesSheet, 'Line Items')
    }
    
    // Charges Sheet
    const charges = getCharges()
    if (charges.length > 0) {
      const chargesSheet = XLSX.utils.json_to_sheet(charges)
      chargesSheet['!cols'] = [{ wch: 35 }, { wch: 15 }]
      XLSX.utils.book_append_sheet(workbook, chargesSheet, 'Charges')
    }
    
    // Discounts Sheet
    const discounts = getDiscounts()
    if (discounts.length > 0) {
      const discountsSheet = XLSX.utils.json_to_sheet(discounts)
      discountsSheet['!cols'] = [{ wch: 35 }, { wch: 20 }, { wch: 10 }, { wch: 15 }]
      XLSX.utils.book_append_sheet(workbook, discountsSheet, 'Discounts')
    }
    
    XLSX.writeFile(workbook, `${filename}.xlsx`)
  }

  const exportToCSV = () => {
    const lines: string[] = []
    
    // Header
    lines.push(`"${title}"`)
    lines.push(`"Generated: ${new Date().toLocaleDateString('en-GB')}"`)
    lines.push('')
    
    // Document Info
    lines.push('"DOCUMENT INFORMATION"')
    getDocumentInfo().forEach(row => {
      lines.push(`"${row.Field}","${row.Value}"`)
    })
    lines.push('')
    
    // Line Items
    const lineItems = getLineItems() as Record<string, unknown>[]
    if (lineItems.length > 0) {
      lines.push('"LINE ITEMS"')
      const headers = Object.keys(lineItems[0])
      lines.push(headers.map(h => `"${h}"`).join(','))
      lineItems.forEach(row => {
        lines.push(Object.values(row).map(v => `"${v}"`).join(','))
      })
      lines.push('')
    }
    
    // Charges
    const charges = getCharges() as Array<{ Description: unknown; Amount: unknown }>
    if (charges.length > 0) {
      lines.push('"ADDITIONAL CHARGES"')
      lines.push('"Description","Amount"')
      charges.forEach(row => {
        lines.push(`"${row.Description}","${row.Amount}"`)
      })
      lines.push('')
    }
    
    // Discounts
    const discounts = getDiscounts() as Array<{ Description: unknown; Type: unknown; Value: unknown; Amount: unknown }>
    if (discounts.length > 0) {
      lines.push('"DISCOUNTS"')
      lines.push('"Description","Type","Value","Amount"')
      discounts.forEach(row => {
        lines.push(`"${row.Description}","${row.Type}","${row.Value}","${row.Amount}"`)
      })
    }
    
    const csv = lines.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.setAttribute('href', URL.createObjectURL(blob))
    link.setAttribute('download', `${filename}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportToPDF = () => {
    const docInfo = getDocumentInfo()
    const lineItems = getLineItems() as Record<string, unknown>[]
    const charges = getCharges() as Array<{ Description: unknown; Amount: unknown }>
    const discounts = getDiscounts() as Array<{ Description: unknown; Type: unknown; Value: unknown; Amount: unknown }>
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          h1 { color: #1d1d1f; font-size: 24px; margin-bottom: 10px; }
          h2 { color: #1d1d1f; font-size: 16px; margin-top: 30px; margin-bottom: 10px; border-bottom: 2px solid #d2d2d7; padding-bottom: 5px; }
          .meta { color: #86868b; font-size: 12px; margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { background-color: #f5f5f7; text-align: left; padding: 10px; font-size: 12px; font-weight: 600; border: 1px solid #d2d2d7; }
          td { padding: 10px; font-size: 12px; border: 1px solid #d2d2d7; }
          tr:nth-child(even) { background-color: #fafafa; }
          .info-table td:first-child { font-weight: 600; width: 150px; background-color: #f5f5f7; }
          .amount { text-align: right; }
          .total-row { font-weight: 600; background-color: #f0f8ff !important; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p class="meta">Generated on ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
        
        <h2>Document Information</h2>
        <table class="info-table">
          ${docInfo.map(row => `<tr><td>${row.Field}</td><td>${row.Value}</td></tr>`).join('')}
        </table>
        
        ${lineItems.length > 0 ? `
          <h2>Line Items (${lineItems.length})</h2>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Reference</th>
                <th>Product Name</th>
                <th>Qty</th>
                <th class="amount">Unit Price</th>
                <th class="amount">Total</th>
              </tr>
            </thead>
            <tbody>
              ${lineItems.map(row => `
                <tr>
                  <td>${row['#']}</td>
                  <td>${row['Reference']}</td>
                  <td>${row['Product Name']}</td>
                  <td>${row['Quantity']}</td>
                  <td class="amount">${row['Unit Price']}</td>
                  <td class="amount">${row['Line Total']}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}
        
        ${charges.length > 0 ? `
          <h2>Additional Charges</h2>
          <table>
            <thead>
              <tr><th>Description</th><th class="amount">Amount</th></tr>
            </thead>
            <tbody>
              ${charges.map(row => `<tr><td>${row.Description}</td><td class="amount">${row.Amount}</td></tr>`).join('')}
            </tbody>
          </table>
        ` : ''}
        
        ${discounts.length > 0 ? `
          <h2>Discounts</h2>
          <table>
            <thead>
              <tr><th>Description</th><th>Type</th><th>Value</th><th class="amount">Amount</th></tr>
            </thead>
            <tbody>
              ${discounts.map(row => `<tr><td>${row.Description}</td><td>${row.Type}</td><td>${row.Value}</td><td class="amount">${row.Amount}</td></tr>`).join('')}
            </tbody>
          </table>
        ` : ''}
      </body>
      </html>
    `
    
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(html)
      printWindow.document.close()
      setTimeout(() => printWindow.print(), 500)
    }
  }

  const handleExport = async (format: ExportFormat) => {
    setExporting(true)
    try {
      switch (format) {
        case 'excel':
          await exportToExcel()
          break
        case 'csv':
          exportToCSV()
          break
        case 'pdf':
          exportToPDF()
          break
      }
      setIsOpen(false)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Export failed. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={exporting}
        className="inline-flex items-center gap-2 h-9 px-3 bg-[#34c759] hover:bg-[#2db350] text-white text-[13px] font-medium rounded-lg transition-colors disabled:opacity-50"
      >
        <Download className="w-4 h-4" />
        Export
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-[#d2d2d7]/30 overflow-hidden z-50 w-44">
          <button
            onClick={() => handleExport('excel')}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-[14px] text-[#1d1d1f] hover:bg-[#f5f5f7] transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#34c759]" />
            Excel (.xlsx)
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-[14px] text-[#1d1d1f] hover:bg-[#f5f5f7] transition-colors"
          >
            <Table2 className="w-4 h-4 text-[#0071e3]" />
            CSV (.csv)
          </button>
          <button
            onClick={() => handleExport('pdf')}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-[14px] text-[#1d1d1f] hover:bg-[#f5f5f7] transition-colors"
          >
            <FileText className="w-4 h-4 text-[#ff3b30]" />
            PDF
          </button>
        </div>
      )}
    </div>
  )
}
