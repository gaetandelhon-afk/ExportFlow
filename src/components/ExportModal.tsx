'use client'

import { useState, useEffect } from 'react'
import { 
  Download, X, FileSpreadsheet, FileText, Table2, 
  Calendar, Check, ChevronDown, Filter, Users
} from 'lucide-react'
import {
  type ExportColumn,
  ExportFormat,
  PeriodPreset,
  getDateRangeForPreset,
  periodPresetLabels,
  prepareDataForExport,
  downloadExport
} from '@/lib/exportUtils'

export type { ExportColumn } from '@/lib/exportUtils'

interface Customer {
  id: string
  companyName: string
  categoryId?: string
}

interface Category {
  id: string
  name: string
  parentId?: string
}

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  entityType: 'invoices' | 'quotes' | 'orders' | 'products' | 'packingLists' | 'payments' | 'customers'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[]
  availableColumns: ExportColumn[]
  customFieldsColumns?: ExportColumn[]
  // Optional: for filtering by customer/category
  customers?: Customer[]
  categories?: Category[]
  showCustomerFilter?: boolean
}

export function ExportModal({
  isOpen,
  onClose,
  title,
  entityType,
  data,
  availableColumns,
  customFieldsColumns = [],
  customers = [],
  categories = [],
  showCustomerFilter = false
}: ExportModalProps) {
  const [format, setFormat] = useState<ExportFormat>('excel')
  const [period, setPeriod] = useState<PeriodPreset>('all')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [columns, setColumns] = useState<ExportColumn[]>([])
  const [showColumnDropdown, setShowColumnDropdown] = useState(false)
  const [filterType, setFilterType] = useState<'all' | 'customer' | 'category'>('all')
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [exporting, setExporting] = useState(false)

  // Initialize columns - only on first render or when column keys change
  useEffect(() => {
    const allColumns = [...availableColumns, ...customFieldsColumns]
    setColumns(prev => {
      // Only update if column keys are different to avoid infinite loops
      const prevKeys = prev.map(c => c.key).join(',')
      const newKeys = allColumns.map(c => c.key).join(',')
      if (prevKeys === newKeys) return prev
      return allColumns
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableColumns.length, customFieldsColumns.length])

  const toggleColumn = (key: string) => {
    setColumns(prev => prev.map(col => 
      col.key === key ? { ...col, selected: !col.selected } : col
    ))
  }

  const selectAllColumns = () => {
    setColumns(prev => prev.map(col => ({ ...col, selected: true })))
  }

  const deselectAllColumns = () => {
    setColumns(prev => prev.map(col => ({ ...col, selected: false })))
  }

  const selectedCount = columns.filter(c => c.selected).length

  // Filter data based on date range and customer/category
  const getFilteredData = () => {
    let filtered = [...data]
    
    // Apply date filter
    const dateRange = period === 'custom' 
      ? { 
          start: customStartDate ? new Date(customStartDate) : null, 
          end: customEndDate ? new Date(customEndDate) : null 
        }
      : getDateRangeForPreset(period)
    
    if (dateRange.start || dateRange.end) {
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.createdAt || item.issueDate || item.date)
        if (dateRange.start && itemDate < dateRange.start) return false
        if (dateRange.end && itemDate > dateRange.end) return false
        return true
      })
    }
    
    // Apply customer/category filter
    if (filterType === 'customer' && selectedCustomerId) {
      filtered = filtered.filter(item => 
        item.customerId === selectedCustomerId || 
        item.customer?.id === selectedCustomerId
      )
    } else if (filterType === 'category' && selectedCategoryId) {
      // Get all customers in this category
      const customerIds = customers
        .filter(c => c.categoryId === selectedCategoryId)
        .map(c => c.id)
      filtered = filtered.filter(item => 
        customerIds.includes(item.customerId || item.customer?.id)
      )
    }
    
    return filtered
  }

  const handleExport = async () => {
    const selectedColumns = columns.filter(c => c.selected)
    if (selectedColumns.length === 0) {
      alert('Please select at least one column to export')
      return
    }

    setExporting(true)
    try {
      const filteredData = getFilteredData()
      const exportData = prepareDataForExport(filteredData, selectedColumns)
      
      const timestamp = new Date().toISOString().split('T')[0]
      const filename = `${entityType}_export_${timestamp}`
      
      await downloadExport(exportData, {
        format,
        filename,
        title: `${title} Export`
      })
      
      onClose()
    } catch (error) {
      console.error('Export failed:', error)
      alert('Export failed. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  if (!isOpen) return null

  const filteredDataCount = getFilteredData().length

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#d2d2d7]/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#34c759]/10 flex items-center justify-center">
              <Download className="w-5 h-5 text-[#34c759]" />
            </div>
            <div>
              <h2 className="text-[17px] font-semibold text-[#1d1d1f]">Export {title}</h2>
              <p className="text-[13px] text-[#86868b]">{filteredDataCount} records to export</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#f5f5f7] rounded-lg">
            <X className="w-5 h-5 text-[#86868b]" />
          </button>
        </div>
        
        <div className="p-4 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Format Selection */}
          <div>
            <label className="block text-[13px] font-medium text-[#1d1d1f] mb-2">Export Format</label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setFormat('excel')}
                className={`flex items-center justify-center gap-2 h-12 rounded-xl border-2 transition-all ${
                  format === 'excel' 
                    ? 'border-[#34c759] bg-[#34c759]/5 text-[#34c759]' 
                    : 'border-[#d2d2d7]/50 text-[#86868b] hover:border-[#86868b]'
                }`}
              >
                <FileSpreadsheet className="w-5 h-5" />
                <span className="text-[14px] font-medium">Excel</span>
              </button>
              <button
                onClick={() => setFormat('csv')}
                className={`flex items-center justify-center gap-2 h-12 rounded-xl border-2 transition-all ${
                  format === 'csv' 
                    ? 'border-[#34c759] bg-[#34c759]/5 text-[#34c759]' 
                    : 'border-[#d2d2d7]/50 text-[#86868b] hover:border-[#86868b]'
                }`}
              >
                <Table2 className="w-5 h-5" />
                <span className="text-[14px] font-medium">CSV</span>
              </button>
              <button
                onClick={() => setFormat('pdf')}
                className={`flex items-center justify-center gap-2 h-12 rounded-xl border-2 transition-all ${
                  format === 'pdf' 
                    ? 'border-[#34c759] bg-[#34c759]/5 text-[#34c759]' 
                    : 'border-[#d2d2d7]/50 text-[#86868b] hover:border-[#86868b]'
                }`}
              >
                <FileText className="w-5 h-5" />
                <span className="text-[14px] font-medium">PDF</span>
              </button>
            </div>
          </div>

          {/* Period Selection */}
          <div>
            <label className="block text-[13px] font-medium text-[#1d1d1f] mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Time Period
            </label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as PeriodPreset)}
              className="w-full h-11 px-4 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#34c759]"
            >
              {Object.entries(periodPresetLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            
            {/* Custom date range */}
            {period === 'custom' && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="block text-[12px] text-[#86868b] mb-1">Start Date</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full h-10 px-3 bg-[#f5f5f7] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#34c759]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] text-[#86868b] mb-1">End Date</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full h-10 px-3 bg-[#f5f5f7] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#34c759]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Customer/Category Filter */}
          {showCustomerFilter && (
            <div>
              <label className="block text-[13px] font-medium text-[#1d1d1f] mb-2">
                <Filter className="w-4 h-4 inline mr-1" />
                Filter By
              </label>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <button
                  onClick={() => setFilterType('all')}
                  className={`h-10 rounded-lg text-[13px] font-medium transition-all ${
                    filterType === 'all'
                      ? 'bg-[#0071e3] text-white'
                      : 'bg-[#f5f5f7] text-[#86868b] hover:bg-[#e8e8ed]'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterType('customer')}
                  className={`h-10 rounded-lg text-[13px] font-medium transition-all ${
                    filterType === 'customer'
                      ? 'bg-[#0071e3] text-white'
                      : 'bg-[#f5f5f7] text-[#86868b] hover:bg-[#e8e8ed]'
                  }`}
                >
                  By Customer
                </button>
                <button
                  onClick={() => setFilterType('category')}
                  className={`h-10 rounded-lg text-[13px] font-medium transition-all ${
                    filterType === 'category'
                      ? 'bg-[#0071e3] text-white'
                      : 'bg-[#f5f5f7] text-[#86868b] hover:bg-[#e8e8ed]'
                  }`}
                >
                  By Category
                </button>
              </div>
              
              {filterType === 'customer' && (
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full h-10 px-3 bg-[#f5f5f7] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                >
                  <option value="">Select a customer...</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.companyName}</option>
                  ))}
                </select>
              )}
              
              {filterType === 'category' && (
                <select
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="w-full h-10 px-3 bg-[#f5f5f7] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                >
                  <option value="">Select a category...</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Column Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[13px] font-medium text-[#1d1d1f]">
                Columns to Export ({selectedCount}/{columns.length})
              </label>
              <div className="flex gap-2">
                <button
                  onClick={selectAllColumns}
                  className="text-[12px] text-[#0071e3] hover:underline"
                >
                  Select All
                </button>
                <span className="text-[#d2d2d7]">|</span>
                <button
                  onClick={deselectAllColumns}
                  className="text-[12px] text-[#86868b] hover:underline"
                >
                  Deselect All
                </button>
              </div>
            </div>
            
            <div className="relative">
              <button
                onClick={() => setShowColumnDropdown(!showColumnDropdown)}
                className="w-full h-11 px-4 bg-[#f5f5f7] rounded-xl text-[14px] text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-[#34c759]"
              >
                <span className="text-[#1d1d1f]">
                  {selectedCount} columns selected
                </span>
                <ChevronDown className={`w-4 h-4 text-[#86868b] transition-transform ${showColumnDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              {showColumnDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-[#d2d2d7]/30 max-h-60 overflow-y-auto z-10">
                  {/* Standard columns */}
                  {columns.filter(c => !c.isCustomField).length > 0 && (
                    <>
                      <div className="px-3 py-2 bg-[#f5f5f7] border-b border-[#d2d2d7]/30">
                        <span className="text-[11px] font-medium text-[#86868b] uppercase">Standard Fields</span>
                      </div>
                      {columns.filter(c => !c.isCustomField).map(col => (
                        <button
                          key={col.key}
                          onClick={() => toggleColumn(col.key)}
                          className="w-full px-4 py-2.5 text-left hover:bg-[#f5f5f7] flex items-center justify-between"
                        >
                          <span className="text-[14px] text-[#1d1d1f]">{col.label}</span>
                          {col.selected && <Check className="w-4 h-4 text-[#34c759]" />}
                        </button>
                      ))}
                    </>
                  )}
                  
                  {/* Custom fields */}
                  {columns.filter(c => c.isCustomField).length > 0 && (
                    <>
                      <div className="px-3 py-2 bg-[#ff9500]/10 border-b border-[#d2d2d7]/30">
                        <span className="text-[11px] font-medium text-[#ff9500] uppercase">Custom Fields</span>
                      </div>
                      {columns.filter(c => c.isCustomField).map(col => (
                        <button
                          key={col.key}
                          onClick={() => toggleColumn(col.key)}
                          className="w-full px-4 py-2.5 text-left hover:bg-[#f5f5f7] flex items-center justify-between"
                        >
                          <span className="text-[14px] text-[#1d1d1f]">{col.label}</span>
                          {col.selected && <Check className="w-4 h-4 text-[#34c759]" />}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-[#d2d2d7]/30">
          <button
            onClick={onClose}
            className="flex-1 h-11 bg-[#f5f5f7] text-[#1d1d1f] text-[14px] font-medium rounded-xl hover:bg-[#e8e8ed]"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || selectedCount === 0}
            className="flex-1 h-11 bg-[#34c759] text-white text-[14px] font-medium rounded-xl hover:bg-[#2db350] disabled:bg-[#d2d2d7] flex items-center justify-center gap-2"
          >
            {exporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Export {filteredDataCount} Records
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// Column definitions for different entity types
export const invoiceExportColumns: ExportColumn[] = [
  { key: 'invoiceNumber', label: 'Invoice Number', selected: true },
  { key: 'type', label: 'Type', selected: true },
  { key: 'status', label: 'Status', selected: true },
  { key: 'issueDate', label: 'Issue Date', selected: true },
  { key: 'dueDate', label: 'Due Date', selected: true },
  { key: 'customer.companyName', label: 'Customer', selected: true },
  { key: 'customer.email', label: 'Customer Email', selected: false },
  { key: 'subtotal', label: 'Subtotal', selected: true },
  { key: 'totalAmount', label: 'Total Amount', selected: true },
  { key: 'currency', label: 'Currency', selected: true },
  { key: 'sentAt', label: 'Sent At', selected: false },
  { key: 'sentTo', label: 'Sent To', selected: false },
]

export const quoteExportColumns: ExportColumn[] = [
  { key: 'invoiceNumber', label: 'Quote Number', selected: true },
  { key: 'status', label: 'Status', selected: true },
  { key: 'issueDate', label: 'Issue Date', selected: true },
  { key: 'validUntil', label: 'Valid Until', selected: true },
  { key: 'customer.companyName', label: 'Customer', selected: true },
  { key: 'customer.email', label: 'Customer Email', selected: false },
  { key: 'subtotal', label: 'Subtotal', selected: true },
  { key: 'totalAmount', label: 'Total Amount', selected: true },
  { key: 'currency', label: 'Currency', selected: true },
  { key: 'sentAt', label: 'Sent At', selected: false },
]

export const orderExportColumns: ExportColumn[] = [
  { key: 'orderNumber', label: 'Order Number', selected: true },
  { key: 'status', label: 'Status', selected: true },
  { key: 'createdAt', label: 'Created At', selected: true },
  { key: 'customer.companyName', label: 'Customer', selected: true },
  { key: 'customer.country', label: 'Country', selected: false },
  { key: 'customer.email', label: 'Customer Email', selected: false },
  { key: 'subtotal', label: 'Subtotal', selected: true },
  { key: 'totalCharges', label: 'Charges', selected: false },
  { key: 'totalDiscounts', label: 'Discounts', selected: false },
  { key: 'totalAmount', label: 'Total Amount', selected: true },
  { key: 'currency', label: 'Currency', selected: true },
  { key: 'shippingAddress', label: 'Shipping Address', selected: false },
]

export const productExportColumns: ExportColumn[] = [
  { key: 'ref', label: 'Reference', selected: true },
  { key: 'nameEn', label: 'Name (EN)', selected: true },
  { key: 'nameCn', label: 'Name (CN)', selected: false },
  { key: 'description', label: 'Description', selected: false },
  { key: 'category.nameEn', label: 'Category', selected: true },
  { key: 'priceDistributor', label: 'Distributor Price', selected: true },
  { key: 'priceDirect', label: 'Direct Price', selected: false },
  { key: 'weightKg', label: 'Weight (kg)', selected: false },
  { key: 'hsCode', label: 'HS Code', selected: false },
  { key: 'isActive', label: 'Active', selected: true },
]

export const packingListExportColumns: ExportColumn[] = [
  { key: 'packingListNumber', label: 'PL Number', selected: true },
  { key: 'type', label: 'Type', selected: true },
  { key: 'status', label: 'Status', selected: true },
  { key: 'orderNumber', label: 'Order Number', selected: true },
  { key: 'customerName', label: 'Customer', selected: true },
  { key: 'createdAt', label: 'Created At', selected: true },
  { key: 'totalPackages', label: 'Packages', selected: true },
  { key: 'totalWeight', label: 'Total Weight', selected: true },
  { key: 'shipToCountry', label: 'Destination', selected: false },
]

export const paymentExportColumns: ExportColumn[] = [
  { key: 'orderNumber', label: 'Order Number', selected: true },
  { key: 'customer.companyName', label: 'Customer', selected: true },
  { key: 'totalAmount', label: 'Total Amount', selected: true },
  { key: 'depositRequired', label: 'Deposit Required', selected: true },
  { key: 'depositPaid', label: 'Deposit Paid', selected: true },
  { key: 'depositPaidAt', label: 'Deposit Paid At', selected: false },
  { key: 'balanceRequired', label: 'Balance Required', selected: true },
  { key: 'balancePaid', label: 'Balance Paid', selected: true },
  { key: 'balancePaidAt', label: 'Balance Paid At', selected: false },
  { key: 'status', label: 'Status', selected: true },
  { key: 'currency', label: 'Currency', selected: true },
]

export const customerExportColumns: ExportColumn[] = [
  { key: 'companyName', label: 'Company Name', selected: true },
  { key: 'contactName', label: 'Contact Name', selected: true },
  { key: 'email', label: 'Email', selected: true },
  { key: 'phone', label: 'Phone', selected: false },
  { key: 'country', label: 'Country', selected: true },
  { key: 'shippingAddress', label: 'Shipping Address', selected: false },
  { key: 'billingAddress', label: 'Billing Address', selected: false },
  { key: 'vatNumber', label: 'VAT Number', selected: false },
  { key: 'paymentTerms', label: 'Payment Terms', selected: false },
  { key: 'category.name', label: 'Category', selected: true },
  { key: 'isActive', label: 'Active', selected: true },
  { key: 'createdAt', label: 'Created At', selected: false },
]
