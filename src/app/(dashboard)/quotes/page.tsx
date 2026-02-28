'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  Plus, Search, ClipboardList,
  Building2, Download, Send, Loader2, MoreHorizontal,
  Eye, Trash2, CheckCircle, Clock, AlertCircle
} from 'lucide-react'
import { formatNumber } from '@/lib/utils'
import { useLocalization } from '@/hooks/useLocalization'
import { ExportModal, quoteExportColumns } from '@/components/ExportModal'
import { generateAdminInvoicePdf } from '@/lib/generatePdf'

interface Quote {
  id: string
  invoiceNumber: string
  type: string
  customerName: string
  orderId: string
  orderNumber: string
  totalAmount: number
  currency: string
  status: string
  issueDate: string
  validUntil: string | null
  createdAt: string
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

const statusConfig: Record<string, { bg: string; text: string; icon: typeof Clock; label: string }> = {
  draft: { bg: 'bg-[#86868b]/10', text: 'text-[#86868b]', icon: Clock, label: 'Draft' },
  sent: { bg: 'bg-[#0071e3]/10', text: 'text-[#0071e3]', icon: Send, label: 'Sent' },
  accepted: { bg: 'bg-[#34c759]/10', text: 'text-[#34c759]', icon: CheckCircle, label: 'Accepted' },
  expired: { bg: 'bg-[#ff3b30]/10', text: 'text-[#ff3b30]', icon: AlertCircle, label: 'Expired' },
  rejected: { bg: 'bg-[#ff3b30]/10', text: 'text-[#ff3b30]', icon: AlertCircle, label: 'Rejected' },
}

export default function QuotesPage() {
  const { currencySymbol } = useLocalization()
  const router = useRouter()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showExportModal, setShowExportModal] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchQuotes()
    fetchFiltersData()
  }, [])

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
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

  const fetchQuotes = async () => {
    try {
      const res = await fetch('/api/quotes')
      if (res.ok) {
        const data = await res.json()
        setQuotes(data.quotes || [])
      }
    } catch (error) {
      console.error('Failed to fetch quotes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPdf = async (quoteId: string) => {
    setDownloadingId(quoteId)
    try {
      const res = await fetch(`/api/quotes/${quoteId}`)
      if (!res.ok) { alert('Failed to load quote'); return }
      const data = await res.json()
      const q = data.quote
      generateAdminInvoicePdf({
        documentType: 'QUOTE',
        invoice: {
          invoiceNumber: q.invoiceNumber,
          issueDate: q.issueDate,
          dueDate: q.validUntil,
          status: q.status,
          subtotal: Number(q.subtotal),
          totalAmount: Number(q.totalAmount),
          currency: q.currency,
        },
        order: {
          orderNumber: q.order?.orderNumber || '',
          lines: (q.order?.lines || []).map((l: { quantity: number; unitPrice: number; lineTotal: number; product: { ref: string; nameEn: string } }) => ({
            quantity: l.quantity,
            unitPrice: Number(l.unitPrice),
            lineTotal: Number(l.lineTotal),
            product: { ref: l.product.ref, nameEn: l.product.nameEn },
          })),
          charges: (q.order?.charges || []).map((c: { description: string; amount: number }) => ({
            description: c.description,
            amount: Number(c.amount),
          })),
          discounts: (q.order?.discounts || []).map((d: { description: string; type: string; value: number; amount: number }) => ({
            description: d.description,
            type: d.type,
            value: Number(d.value),
            amount: Number(d.amount),
          })),
        },
        customer: {
          companyName: q.order?.customer?.companyName || '',
          contactName: q.order?.customer?.contactName || null,
          billingAddress: q.order?.customer?.billingAddress || null,
          vatNumber: q.order?.customer?.vatNumber || null,
        },
      })
    } catch {
      alert('Failed to generate PDF')
    } finally {
      setDownloadingId(null)
    }
  }

  const handleDelete = async (quoteId: string) => {
    if (!confirm('Delete this quote? This cannot be undone.')) return
    try {
      const res = await fetch(`/api/invoices/${quoteId}`, { method: 'DELETE' })
      if (res.ok) {
        setActiveMenu(null)
        fetchQuotes()
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data.error || 'Failed to delete quote')
        setActiveMenu(null)
      }
    } catch {
      alert('Failed to delete quote')
      setActiveMenu(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = !searchQuery || 
      quote.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.orderNumber.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = !statusFilter || quote.status === statusFilter

    return matchesSearch && matchesStatus
  })

  // Stats
  const stats = {
    total: quotes.length,
    draft: quotes.filter(q => q.status === 'draft').length,
    sent: quotes.filter(q => q.status === 'sent').length,
    accepted: quotes.filter(q => q.status === 'accepted').length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#0071e3]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-semibold text-[#1d1d1f]">Quotes</h1>
          <p className="text-[15px] text-[#86868b] mt-1">Manage your quotations and proposals</p>
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
            href="/quotes/new"
            className="inline-flex items-center gap-2 h-10 px-5 bg-[#0071e3] hover:bg-[#0077ed] text-white text-[14px] font-medium rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Quote
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0071e3]/10 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-[#0071e3]" />
            </div>
            <div>
              <p className="text-[24px] font-bold text-[#1d1d1f]">{stats.total}</p>
              <p className="text-[13px] text-[#86868b]">Total Quotes</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#86868b]/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-[#86868b]" />
            </div>
            <div>
              <p className="text-[24px] font-bold text-[#1d1d1f]">{stats.draft}</p>
              <p className="text-[13px] text-[#86868b]">Draft</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0071e3]/10 flex items-center justify-center">
              <Send className="w-5 h-5 text-[#0071e3]" />
            </div>
            <div>
              <p className="text-[24px] font-bold text-[#1d1d1f]">{stats.sent}</p>
              <p className="text-[13px] text-[#86868b]">Sent</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#34c759]/10 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-[#34c759]" />
            </div>
            <div>
              <p className="text-[24px] font-bold text-[#1d1d1f]">{stats.accepted}</p>
              <p className="text-[13px] text-[#86868b]">Accepted</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search quotes..."
              className="w-full h-10 pl-10 pr-4 bg-[#f5f5f7] border-0 rounded-xl text-[14px] text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
            />
          </div>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-4 bg-[#f5f5f7] border-0 rounded-xl text-[13px] text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="accepted">Accepted</option>
            <option value="expired">Expired</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Quotes List */}
      {filteredQuotes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-12 text-center">
          <ClipboardList className="w-12 h-12 text-[#86868b] mx-auto mb-4" />
          <h3 className="text-[17px] font-semibold text-[#1d1d1f] mb-2">No quotes yet</h3>
          <p className="text-[15px] text-[#86868b] mb-6">Create your first quote to get started</p>
          <Link
            href="/quotes/new"
            className="inline-flex items-center gap-2 h-10 px-5 bg-[#0071e3] hover:bg-[#0077ed] text-white text-[14px] font-medium rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Quote
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#d2d2d7]/30 bg-[#f5f5f7]">
                <th className="text-left px-6 py-4 text-[12px] font-semibold text-[#86868b] uppercase tracking-wide">Quote #</th>
                <th className="text-left px-6 py-4 text-[12px] font-semibold text-[#86868b] uppercase tracking-wide">Customer</th>
                <th className="text-left px-6 py-4 text-[12px] font-semibold text-[#86868b] uppercase tracking-wide">Amount</th>
                <th className="text-left px-6 py-4 text-[12px] font-semibold text-[#86868b] uppercase tracking-wide">Status</th>
                <th className="text-left px-6 py-4 text-[12px] font-semibold text-[#86868b] uppercase tracking-wide">Date</th>
                <th className="text-left px-6 py-4 text-[12px] font-semibold text-[#86868b] uppercase tracking-wide">Valid Until</th>
                <th className="text-right px-6 py-4 text-[12px] font-semibold text-[#86868b] uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d2d2d7]/30">
              {filteredQuotes.map((quote) => {
                const status = statusConfig[quote.status] || statusConfig.draft
                const StatusIcon = status.icon

                return (
                  <tr key={quote.id} className="hover:bg-[#f5f5f7]/50 transition-colors">
                    <td className="px-6 py-4">
                      <Link href={`/quotes/${quote.id}`} className="text-[14px] font-medium text-[#0071e3] hover:underline">
                        {quote.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0071e3] to-[#00c7be] flex items-center justify-center">
                          <span className="text-[11px] font-semibold text-white">
                            {quote.customerName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-[14px] text-[#1d1d1f]">{quote.customerName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[14px] font-semibold text-[#1d1d1f]">
                        {currencySymbol}{formatNumber(quote.totalAmount)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium ${status.bg} ${status.text}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[14px] text-[#86868b]">{formatDate(quote.issueDate)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[14px] text-[#86868b]">
                        {quote.validUntil ? formatDate(quote.validUntil) : '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/quotes/${quote.id}`}
                          className="p-2 hover:bg-[#f5f5f7] rounded-lg transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4 text-[#86868b]" />
                        </Link>
                        <button
                          onClick={() => handleDownloadPdf(quote.id)}
                          disabled={downloadingId === quote.id}
                          className="p-2 hover:bg-[#f5f5f7] rounded-lg transition-colors disabled:opacity-50"
                          title="Download PDF"
                        >
                          {downloadingId === quote.id
                            ? <Loader2 className="w-4 h-4 text-[#86868b] animate-spin" />
                            : <Download className="w-4 h-4 text-[#86868b]" />}
                        </button>
                        <Link
                          href={`/quotes/${quote.id}`}
                          className="p-2 hover:bg-[#f5f5f7] rounded-lg transition-colors"
                          title="Send Email"
                        >
                          <Send className="w-4 h-4 text-[#86868b]" />
                        </Link>
                        {/* 3-dots menu */}
                        <div className="relative" ref={activeMenu === quote.id ? menuRef : undefined}>
                          <button
                            onClick={() => setActiveMenu(activeMenu === quote.id ? null : quote.id)}
                            className="p-2 hover:bg-[#f5f5f7] rounded-lg transition-colors"
                          >
                            <MoreHorizontal className="w-4 h-4 text-[#86868b]" />
                          </button>
                          {activeMenu === quote.id && (
                            <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl shadow-lg border border-[#d2d2d7]/30 py-1 z-50">
                              <button
                                onClick={() => handleDelete(quote.id)}
                                className="w-full flex items-center gap-2 px-4 py-2 text-[13px] text-[#ff3b30] hover:bg-[#f5f5f7] transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
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
        title="Quotes"
        entityType="quotes"
        data={filteredQuotes}
        availableColumns={quoteExportColumns}
        showCustomerFilter={true}
        customers={customers}
        categories={categories}
      />
    </div>
  )
}
