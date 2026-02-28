'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Receipt, Plus, Search, Filter, Download, Clock, 
  CheckCircle, AlertCircle, FileText, MoreHorizontal,
  Send, Trash2, Eye
} from 'lucide-react'
import { formatNumber } from '@/lib/utils'
import { useLocalization } from '@/hooks/useLocalization'
import { ExportModal, invoiceExportColumns } from '@/components/ExportModal'

interface Invoice {
  id: string
  invoiceNumber: string
  customerName: string
  orderId: string
  orderNumber: string
  totalAmount: number
  subtotal: number
  currency: string
  status: string
  issueDate: string
  dueDate: string | null
  pdfUrl: string | null
  createdAt: string
}

interface Stats {
  totalOutstanding: number
  overdue: number
  paidThisMonth: number
  draft: number
}

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

const statusConfig: Record<string, { 
  bg: string
  text: string
  icon: typeof CheckCircle
  label: string 
}> = {
  draft: { bg: 'bg-[#86868b]/10', text: 'text-[#86868b]', icon: Clock, label: 'Draft' },
  sent: { bg: 'bg-[#0071e3]/10', text: 'text-[#0071e3]', icon: Send, label: 'Sent' },
  paid: { bg: 'bg-[#34c759]/10', text: 'text-[#34c759]', icon: CheckCircle, label: 'Paid' },
  overdue: { bg: 'bg-[#ff3b30]/10', text: 'text-[#ff3b30]', icon: AlertCircle, label: 'Overdue' },
  cancelled: { bg: 'bg-[#86868b]/10', text: 'text-[#86868b]', icon: Clock, label: 'Cancelled' },
}

export default function InvoicesPage() {
  const { currencySymbol, getCurrencySymbol } = useLocalization()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [stats, setStats] = useState<Stats>({ totalOutstanding: 0, overdue: 0, paidThisMonth: 0, draft: 0 })
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [showExportModal, setShowExportModal] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    fetchInvoices()
    fetchFiltersData()
  }, [])

  const fetchFiltersData = async () => {
    try {
      const [customersRes, categoriesRes] = await Promise.all([
        fetch('/api/customers/list'),
        fetch('/api/customer-categories')
      ])
      if (customersRes.ok) {
        const data = await customersRes.json()
        setCustomers((data.customers || []).map((c: { id: string; companyName: string; categoryId?: string }) => ({
          id: c.id,
          companyName: c.companyName,
          categoryId: c.categoryId
        })))
      }
      if (categoriesRes.ok) {
        const data = await categoriesRes.json()
        setCategories((data.categories || []).map((c: { id: string; name: string; parentId?: string }) => ({
          id: c.id,
          name: c.name,
          parentId: c.parentId
        })))
      }
    } catch {
      // Ignore
    }
  }

  const fetchInvoices = async () => {
    try {
      const res = await fetch('/api/invoices')
      if (res.ok) {
        const data = await res.json()
        setInvoices(data.invoices || [])
        setStats(data.stats || { totalOutstanding: 0, overdue: 0, paidThisMonth: 0, draft: 0 })
      }
    } catch (error) {
      console.error('Failed to fetch invoices:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (invoiceId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (res.ok) {
        fetchInvoices()
      }
    } catch (error) {
      console.error('Failed to update status:', error)
    }
    setActiveMenu(null)
  }

  const handleDelete = async (invoiceId: string) => {
    if (!confirm('Delete this invoice? This cannot be undone.')) return

    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, { method: 'DELETE' })
      if (res.ok) {
        setActiveMenu(null)
        fetchInvoices()
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data.error || 'Failed to delete invoice')
        setActiveMenu(null)
      }
    } catch (error) {
      console.error('Failed to delete invoice:', error)
      alert('Failed to delete invoice')
      setActiveMenu(null)
    }
  }

  // Filter invoices
  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = !searchQuery || 
      invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.orderNumber.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = !statusFilter || invoice.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-[#e8e8ed] rounded w-48" />
          <div className="grid grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-24 bg-[#e8e8ed] rounded-2xl" />)}
          </div>
          <div className="h-64 bg-[#e8e8ed] rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">Invoices</h1>
          <p className="text-[15px] text-[#86868b] mt-1">
            {invoices.length} invoice{invoices.length !== 1 ? 's' : ''} total
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowExportModal(true)}
            className="inline-flex items-center gap-2 bg-[#34c759] hover:bg-[#2db350] text-white text-[13px] font-medium px-4 h-10 rounded-xl transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <Link
            href="/orders"
            className="inline-flex items-center gap-2 bg-[#0071e3] hover:bg-[#0077ed] text-white text-[13px] font-medium px-4 h-10 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create from Order
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-5">
          <p className="text-[12px] text-[#86868b] uppercase tracking-wide mb-1">Total Outstanding</p>
          <p className="text-[24px] font-semibold text-[#1d1d1f]">{currencySymbol}{formatNumber(stats.totalOutstanding)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-5">
          <p className="text-[12px] text-[#86868b] uppercase tracking-wide mb-1">Overdue</p>
          <p className="text-[24px] font-semibold text-[#ff3b30]">{currencySymbol}{formatNumber(stats.overdue)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-5">
          <p className="text-[12px] text-[#86868b] uppercase tracking-wide mb-1">Paid This Month</p>
          <p className="text-[24px] font-semibold text-[#34c759]">{currencySymbol}{formatNumber(stats.paidThisMonth)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-5">
          <p className="text-[12px] text-[#86868b] uppercase tracking-wide mb-1">Draft</p>
          <p className="text-[24px] font-semibold text-[#86868b]">{stats.draft}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by invoice number, customer..."
              className="w-full h-10 pl-10 pr-4 bg-[#f5f5f7] border-0 rounded-xl text-[14px] text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
            />
          </div>
          
          {/* Status Filter */}
          <div className="relative">
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 pl-4 pr-10 bg-[#f5f5f7] border-0 rounded-xl text-[14px] text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#0071e3] appearance-none cursor-pointer min-w-[140px]"
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b] pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Invoices List */}
      {filteredInvoices.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-12 text-center">
          <div className="w-16 h-16 bg-[#f5f5f7] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Receipt className="w-8 h-8 text-[#86868b]" />
          </div>
          <h3 className="text-[17px] font-semibold text-[#1d1d1f] mb-2">
            {searchQuery || statusFilter ? 'No invoices found' : 'No invoices yet'}
          </h3>
          <p className="text-[14px] text-[#86868b] mb-6">
            {searchQuery || statusFilter 
              ? 'Try adjusting your search or filters' 
              : 'Create your first invoice from a confirmed order.'}
          </p>
          {!searchQuery && !statusFilter && (
            <Link
              href="/orders"
              className="inline-flex items-center gap-2 bg-[#0071e3] hover:bg-[#0077ed] text-white text-[13px] font-medium px-5 h-10 rounded-xl transition-colors"
            >
              View Orders
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 overflow-visible">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#d2d2d7]/30">
                <th className="text-left text-[12px] font-medium text-[#86868b] uppercase tracking-wide px-5 py-4">Invoice</th>
                <th className="text-left text-[12px] font-medium text-[#86868b] uppercase tracking-wide px-5 py-4">Customer</th>
                <th className="text-left text-[12px] font-medium text-[#86868b] uppercase tracking-wide px-5 py-4">Order</th>
                <th className="text-left text-[12px] font-medium text-[#86868b] uppercase tracking-wide px-5 py-4">Amount</th>
                <th className="text-left text-[12px] font-medium text-[#86868b] uppercase tracking-wide px-5 py-4">Status</th>
                <th className="text-left text-[12px] font-medium text-[#86868b] uppercase tracking-wide px-5 py-4">Date</th>
                <th className="text-right text-[12px] font-medium text-[#86868b] uppercase tracking-wide px-5 py-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((invoice) => {
                const status = statusConfig[invoice.status] || statusConfig.draft
                const StatusIcon = status.icon
                
                return (
                  <tr key={invoice.id} className="border-b border-[#d2d2d7]/20 last:border-0 hover:bg-[#f5f5f7]/50 transition-colors">
                    <td className="px-5 py-4">
                      <Link href={`/invoices/${invoice.id}`} className="flex items-center gap-3 group">
                        <div className="w-10 h-10 bg-[#f5f5f7] rounded-xl flex items-center justify-center">
                          <FileText className="w-5 h-5 text-[#86868b]" />
                        </div>
                        <span className="text-[14px] font-medium text-[#1d1d1f] group-hover:text-[#0071e3] transition-colors">
                          {invoice.invoiceNumber}
                        </span>
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-[14px] text-[#1d1d1f]">{invoice.customerName}</p>
                    </td>
                    <td className="px-5 py-4">
                      <Link href={`/orders/${invoice.orderId}`} className="text-[14px] text-[#0071e3] hover:underline">
                        {invoice.orderNumber}
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-[15px] font-semibold text-[#1d1d1f]">
                        {getCurrencySymbol(invoice.currency)}{formatNumber(invoice.totalAmount)}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-medium ${status.bg} ${status.text}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {status.label}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-[13px] text-[#1d1d1f]">{formatDate(invoice.issueDate)}</p>
                      {invoice.dueDate && (
                        <p className="text-[11px] text-[#86868b]">Due: {formatDate(invoice.dueDate)}</p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2 relative">
                        <Link
                          href={`/invoices/${invoice.id}`}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f5f5f7] transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4 text-[#86868b]" />
                        </Link>
                        
                        {invoice.pdfUrl && (
                          <a
                            href={invoice.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f5f5f7] transition-colors"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4 text-[#86868b]" />
                          </a>
                        )}

                        <button
                          onClick={() => setActiveMenu(activeMenu === invoice.id ? null : invoice.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f5f5f7] transition-colors"
                        >
                          <MoreHorizontal className="w-4 h-4 text-[#86868b]" />
                        </button>

                        {activeMenu === invoice.id && (
                          <>
                            <div 
                              className="fixed inset-0 z-[100]" 
                              onClick={() => setActiveMenu(null)} 
                            />
                            <div className="absolute right-0 bottom-full mb-1 bg-white rounded-xl shadow-2xl border border-[#d2d2d7]/30 py-1 min-w-[180px] z-[101]">
                              {/* View invoice */}
                              <Link
                                href={`/invoices/${invoice.id}`}
                                onClick={() => setActiveMenu(null)}
                                className="w-full px-4 py-2 text-left text-[13px] text-[#1d1d1f] hover:bg-[#f5f5f7] flex items-center gap-2"
                              >
                                <Eye className="w-4 h-4" />
                                View Details
                              </Link>
                              
                              {/* View order */}
                              <Link
                                href={`/orders/${invoice.orderId}`}
                                onClick={() => setActiveMenu(null)}
                                className="w-full px-4 py-2 text-left text-[13px] text-[#1d1d1f] hover:bg-[#f5f5f7] flex items-center gap-2"
                              >
                                <FileText className="w-4 h-4" />
                                View Order
                              </Link>
                              
                              <div className="border-t border-[#d2d2d7]/30 my-1" />
                              
                              {/* Status changes */}
                              {invoice.status === 'draft' && (
                                <button
                                  onClick={() => handleStatusChange(invoice.id, 'sent')}
                                  className="w-full px-4 py-2 text-left text-[13px] text-[#1d1d1f] hover:bg-[#f5f5f7] flex items-center gap-2"
                                >
                                  <Send className="w-4 h-4" />
                                  Mark as Sent
                                </button>
                              )}
                              {(invoice.status === 'sent' || invoice.status === 'overdue') && (
                                <button
                                  onClick={() => handleStatusChange(invoice.id, 'paid')}
                                  className="w-full px-4 py-2 text-left text-[13px] text-[#1d1d1f] hover:bg-[#f5f5f7] flex items-center gap-2"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                  Mark as Paid
                                </button>
                              )}
                              {invoice.status === 'paid' && (
                                <button
                                  onClick={() => handleStatusChange(invoice.id, 'sent')}
                                  className="w-full px-4 py-2 text-left text-[13px] text-[#1d1d1f] hover:bg-[#f5f5f7] flex items-center gap-2"
                                >
                                  <AlertCircle className="w-4 h-4" />
                                  Mark as Unpaid
                                </button>
                              )}
                              
                              {/* Delete (only draft) */}
                              {invoice.status === 'draft' && (
                                <>
                                  <div className="border-t border-[#d2d2d7]/30 my-1" />
                                  <button
                                    onClick={() => handleDelete(invoice.id)}
                                    className="w-full px-4 py-2 text-left text-[13px] text-[#ff3b30] hover:bg-[#ff3b30]/10 flex items-center gap-2"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Delete
                                  </button>
                                </>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Invoices"
        entityType="invoices"
        data={filteredInvoices}
        availableColumns={invoiceExportColumns}
        showCustomerFilter={true}
        customers={customers}
        categories={categories}
      />
    </div>
  )
}
