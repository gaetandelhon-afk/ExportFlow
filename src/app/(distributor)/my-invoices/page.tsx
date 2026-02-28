'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useDistributor, CURRENCY_SYMBOLS } from '@/contexts/DistributorContext'
import { usePreview } from '@/contexts/PreviewContext'
import { 
  Search, Receipt, Download, ExternalLink, FileText,
  Clock, CheckCircle, AlertCircle, X, Calendar
} from 'lucide-react'
import { formatNumber } from '@/lib/utils'

interface Invoice {
  id: string
  invoiceNumber: string
  type: string
  issueDate: string
  dueDate: string | null
  subtotal: number
  taxAmount: number
  shippingAmount: number
  totalAmount: number
  currency: string
  status: string
  sentAt: string | null
  pdfUrl: string | null
  orderId: string
  orderNumber: string
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: typeof Clock }> = {
  draft: { label: 'Draft', color: 'var(--color-text-secondary)', bgColor: 'rgba(134, 134, 139, 0.1)', icon: FileText },
  sent: { label: 'Sent', color: 'var(--color-brand-primary)', bgColor: 'rgba(0, 113, 227, 0.1)', icon: Receipt },
  paid: { label: 'Paid', color: 'var(--color-success)', bgColor: 'rgba(52, 199, 89, 0.1)', icon: CheckCircle },
  overdue: { label: 'Overdue', color: 'var(--color-error)', bgColor: 'rgba(255, 59, 48, 0.1)', icon: AlertCircle },
  cancelled: { label: 'Cancelled', color: 'var(--color-error)', bgColor: 'rgba(255, 59, 48, 0.1)', icon: X },
}

const typeLabels: Record<string, string> = {
  INVOICE: 'Invoice',
  QUOTE: 'Quote',
  PROFORMA: 'Proforma',
}

type DateFilter = 'all' | 'month' | '3months' | 'year'
type SortOption = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'

export default function MyInvoicesPage() {
  const { user, orders } = useDistributor()
  const { isPreviewMode, previewCustomer } = usePreview()
  
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [sortOption, setSortOption] = useState<SortOption>('date-desc')
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  useEffect(() => {
    loadInvoices()

    // Refresh when tab becomes visible again (sync with admin-side changes)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') loadInvoices()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPreviewMode, previewCustomer])

  const loadInvoices = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (isPreviewMode && previewCustomer?.id) {
        params.set('customerId', previewCustomer.id)
      }
      
      const res = await fetch(`/api/distributor/invoices?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setInvoices(data.invoices || [])
      }
    } catch (error) {
      console.error('Error loading invoices:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredInvoices = useMemo(() => {
    let result = invoices.filter(invoice => {
      const matchesSearch = 
        invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.orderNumber.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter

      let matchesDate = true
      if (dateFilter !== 'all') {
        const invoiceDate = new Date(invoice.issueDate)
        const now = new Date()
        
        switch (dateFilter) {
          case 'month':
            const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
            matchesDate = invoiceDate >= oneMonthAgo
            break
          case '3months':
            const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
            matchesDate = invoiceDate >= threeMonthsAgo
            break
          case 'year':
            const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
            matchesDate = invoiceDate >= oneYearAgo
            break
        }
      }

      return matchesSearch && matchesStatus && matchesDate
    })

    result.sort((a, b) => {
      switch (sortOption) {
        case 'date-desc':
          return new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()
        case 'date-asc':
          return new Date(a.issueDate).getTime() - new Date(b.issueDate).getTime()
        case 'amount-desc':
          return b.totalAmount - a.totalAmount
        case 'amount-asc':
          return a.totalAmount - b.totalAmount
        default:
          return 0
      }
    })

    return result
  }, [invoices, searchQuery, statusFilter, dateFilter, sortOption])

  const handleDownload = async (invoice: Invoice) => {
    setDownloadingId(invoice.id)
    try {
      if (invoice.pdfUrl) {
        window.open(invoice.pdfUrl, '_blank')
        return
      }
      // Pas de pdfUrl → génération locale depuis les données de la commande
      if (!user) return
      const order = orders.find(o => o.id === invoice.orderId)
      if (order) {
        const { generateOrderSummaryPdf } = await import('@/lib/generatePdf')
        const currencySymbol = getCurrencySymbol(invoice.currency)
        generateOrderSummaryPdf({ order, user, currencySymbol, shippingAddress: null })
      }
    } finally {
      setDownloadingId(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getCurrencySymbol = (currency: string) => {
    return CURRENCY_SYMBOLS[currency as keyof typeof CURRENCY_SYMBOLS] || currency
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 
          className="text-[28px] font-semibold tracking-tight"
          style={{ color: 'var(--color-text-primary)' }}
        >
          My Invoices
        </h1>
        <p 
          className="text-[15px] mt-1"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {filteredInvoices.length} invoice{filteredInvoices.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search 
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: 'var(--color-text-secondary)' }}
          />
          <input
            type="text"
            placeholder="Search by invoice or order number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field has-icon w-full"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
            </button>
          )}
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-field w-auto"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
          <option value="cancelled">Cancelled</option>
        </select>

        {/* Date Filter */}
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value as DateFilter)}
          className="input-field w-auto"
        >
          <option value="all">All Time</option>
          <option value="month">Last Month</option>
          <option value="3months">Last 3 Months</option>
          <option value="year">Last Year</option>
        </select>

        {/* Sort */}
        <select
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value as SortOption)}
          className="input-field w-auto"
        >
          <option value="date-desc">Newest First</option>
          <option value="date-asc">Oldest First</option>
          <option value="amount-desc">Highest Amount</option>
          <option value="amount-asc">Lowest Amount</option>
        </select>
      </div>

      {/* Invoices List */}
      {loading ? (
        <div className="text-center py-16">
          <div 
            className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-4"
            style={{ borderColor: 'var(--color-brand-primary)', borderTopColor: 'transparent' }}
          />
          <p style={{ color: 'var(--color-text-secondary)' }}>Loading invoices...</p>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div 
          className="text-center py-16 rounded-2xl"
          style={{ backgroundColor: 'var(--color-bg-secondary)' }}
        >
          <Receipt 
            className="w-12 h-12 mx-auto mb-4"
            style={{ color: 'var(--color-text-tertiary)' }}
          />
          <p 
            className="text-[15px] font-medium mb-1"
            style={{ color: 'var(--color-text-primary)' }}
          >
            No invoices found
          </p>
          <p 
            className="text-[13px]"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {invoices.length === 0 
              ? "Invoices will appear here once they are issued and sent."
              : "Try adjusting your search or filters."
            }
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredInvoices.map((invoice) => {
            const status = statusConfig[invoice.status] || statusConfig.sent
            const StatusIcon = status.icon
            const isOverdue = invoice.dueDate && new Date(invoice.dueDate) < new Date() && invoice.status !== 'paid'
            const effectiveStatus = isOverdue ? statusConfig.overdue : status

            return (
              <div
                key={invoice.id}
                className="card p-4 hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: effectiveStatus.bgColor }}
                  >
                    <Receipt className="w-5 h-5" style={{ color: effectiveStatus.color }} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span 
                        className="text-[15px] font-semibold"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {invoice.invoiceNumber}
                      </span>
                      <span 
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                        style={{ 
                          backgroundColor: effectiveStatus.bgColor,
                          color: effectiveStatus.color
                        }}
                      >
                        {effectiveStatus.label}
                      </span>
                      <span 
                        className="text-[10px] px-2 py-0.5 rounded-full"
                        style={{ 
                          backgroundColor: 'var(--color-bg-tertiary)',
                          color: 'var(--color-text-secondary)'
                        }}
                      >
                        {typeLabels[invoice.type] || invoice.type}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(invoice.issueDate)}
                      </span>
                      <Link 
                        href={`/my-orders/${invoice.orderId}`}
                        className="flex items-center gap-1 hover:underline"
                        style={{ color: 'var(--color-brand-primary)' }}
                      >
                        <ExternalLink className="w-3 h-3" />
                        Order {invoice.orderNumber}
                      </Link>
                      {invoice.dueDate && (
                        <span className={isOverdue ? 'text-red-500 font-medium' : ''}>
                          Due: {formatDate(invoice.dueDate)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="text-right flex-shrink-0">
                    <p 
                      className="text-[18px] font-semibold"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {getCurrencySymbol(invoice.currency)}{formatNumber(invoice.totalAmount)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleDownload(invoice)}
                      disabled={downloadingId === invoice.id}
                      className="h-9 px-4 rounded-lg flex items-center justify-center gap-1.5 text-[12px] font-medium transition-all hover:opacity-90 disabled:opacity-50"
                      style={{ 
                        backgroundColor: 'var(--color-brand-primary)',
                        color: 'white'
                      }}
                    >
                      <Download className="w-3.5 h-3.5" />
                      {downloadingId === invoice.id ? '...' : 'Export PDF'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
