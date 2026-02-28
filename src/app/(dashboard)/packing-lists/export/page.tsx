'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Package, Plus, Search, Download, Clock, 
  CheckCircle, Truck, FileText, MoreHorizontal,
  Trash2, Eye, Edit, Printer, Ship, ChevronLeft,
  Loader2
} from 'lucide-react'
import { formatNumber } from '@/lib/utils'
import { useLocalization } from '@/hooks/useLocalization'
import { ExportModal, packingListExportColumns } from '@/components/ExportModal'

interface PackingList {
  id: string
  packingListNumber: string
  type: 'EXPORT' | 'FACTORY'
  orderId?: string
  orderNumber?: string
  shipmentId?: string
  shipmentNumber?: string
  customerName: string
  status: string
  totalWeight: number
  totalCartons?: number
  totalCbm?: number
  pdfUrl?: string
  createdAt: string
}

const statusConfig: Record<string, { 
  bg: string
  text: string
  icon: typeof CheckCircle
  label: string 
}> = {
  DRAFT: { bg: 'bg-[#86868b]/10', text: 'text-[#86868b]', icon: Clock, label: 'Draft' },
  GENERATED: { bg: 'bg-[#0071e3]/10', text: 'text-[#0071e3]', icon: Package, label: 'Generated' },
  SENT: { bg: 'bg-[#34c759]/10', text: 'text-[#34c759]', icon: CheckCircle, label: 'Sent' },
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

export default function ExportPackingListsPage() {
  const { currencySymbol, isLoaded } = useLocalization()
  const [packingLists, setPackingLists] = useState<PackingList[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [showExportModal, setShowExportModal] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    loadPackingLists()
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

  const loadPackingLists = async () => {
    try {
      // Try API first
      const res = await fetch('/api/packing-lists?type=EXPORT')
      let apiLists: PackingList[] = []
      if (res.ok) {
        const data = await res.json()
        apiLists = data.packingLists || []
      }
      
      // Also load from localStorage (v2 format)
      const STORAGE_KEY = 'orderbridge_export_packing_lists_v2'
      const stored = localStorage.getItem(STORAGE_KEY)
      let localLists: PackingList[] = []
      if (stored) {
        try {
          const parsedLists = JSON.parse(stored)
          localLists = parsedLists.map((pl: {
            id: string
            packingListNumber: string
            type: string
            status: string
            orderId: string
            orderNumber: string
            consignee: string
            totalGrossWeight: number
            totalPackages: number
            totalCbm: number
            createdAt: string
          }) => ({
            id: pl.id,
            packingListNumber: pl.packingListNumber,
            type: pl.type || 'EXPORT',
            status: pl.status || 'DRAFT',
            orderId: pl.orderId,
            orderNumber: pl.orderNumber,
            customerName: pl.consignee?.split('\n')[0] || '',
            totalWeight: pl.totalGrossWeight || 0,
            totalCartons: pl.totalPackages || 0,
            totalCbm: pl.totalCbm || 0,
            createdAt: pl.createdAt
          }))
        } catch {
          // Ignore parse errors
        }
      }
      
      // Merge and dedupe by ID
      const allLists = [...apiLists]
      localLists.forEach((local: PackingList) => {
        if (!allLists.find(pl => pl.id === local.id)) {
          allLists.push(local)
        }
      })
      
      setPackingLists(allLists)
    } catch (error) {
      console.error('Failed to load packing lists:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this packing list?')) return
    
    try {
      const res = await fetch(`/api/packing-lists/${id}`, { method: 'DELETE' })

      // Also remove from localStorage for legacy PLs
      const STORAGE_KEY = 'orderbridge_export_packing_lists_v2'
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const localLists = JSON.parse(stored)
        const filtered = localLists.filter((pl: { id: string }) => pl.id !== id)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
      }

      if (res.ok) {
        setPackingLists(prev => prev.filter(pl => pl.id !== id))
        setActiveMenu(null)
      } else if (stored) {
        // Legacy PL only in localStorage
        setPackingLists(prev => prev.filter(pl => pl.id !== id))
        setActiveMenu(null)
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data.error || 'Failed to delete packing list')
      }
    } catch (error) {
      console.error('Failed to delete:', error)
    }
  }

  const filteredLists = packingLists.filter(pl => {
    const matchesSearch = !searchQuery || 
      pl.packingListNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (pl.orderNumber && pl.orderNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (pl.shipmentNumber && pl.shipmentNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      pl.customerName.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = !statusFilter || pl.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const stats = {
    total: packingLists.length,
    draft: packingLists.filter(p => p.status === 'DRAFT').length,
    generated: packingLists.filter(p => p.status === 'GENERATED').length,
    sent: packingLists.filter(p => p.status === 'SENT').length,
  }

  if (!isLoaded || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#0071e3]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/packing-lists" className="text-[#0071e3] hover:text-[#0077ed] flex items-center gap-1 text-[13px] mb-2">
            <ChevronLeft className="w-4 h-4" />
            All Packing Lists
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#34c759]/10 rounded-xl flex items-center justify-center">
              <Ship className="w-5 h-5 text-[#34c759]" />
            </div>
            <div>
              <h1 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">Export Packing Lists</h1>
              <p className="text-[15px] text-[#86868b]">
                For customers and customs - shipping documentation
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#0071e3] text-white rounded-xl text-[14px] font-medium hover:bg-[#0077ed] transition-colors"
          >
            <Download className="w-4 h-4" />
            Export Data
          </button>
          <Link
            href="/packing-lists/export/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-[#34c759] text-white rounded-xl text-[14px] font-medium hover:bg-[#30b553] transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Export Packing List
          </Link>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-[#34c759]/5 border border-[#34c759]/20 rounded-2xl p-4">
        <p className="text-[13px] text-[#1d1d1f]">
          <strong>Export Packing Lists</strong> are official shipping documents for your customers and customs. 
          They include carton numbers, weights, dimensions, and product details.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, color: '#1d1d1f' },
          { label: 'Draft', value: stats.draft, color: '#86868b' },
          { label: 'Generated', value: stats.generated, color: '#0071e3' },
          { label: 'Sent', value: stats.sent, color: '#34c759' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-4">
            <p className="text-[13px] text-[#86868b] mb-1">{stat.label}</p>
            <p className="text-[24px] font-semibold" style={{ color: stat.color }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" />
          <input
            type="text"
            placeholder="Search by number, order, shipment or customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 bg-white border border-[#d2d2d7]/50 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#34c759] focus:border-transparent"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 px-4 bg-white border border-[#d2d2d7]/50 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#34c759]"
        >
          <option value="">All Status</option>
          <option value="DRAFT">Draft</option>
          <option value="GENERATED">Generated</option>
          <option value="SENT">Sent</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 overflow-visible">
        {filteredLists.length === 0 ? (
          <div className="text-center py-16">
            <Ship className="w-12 h-12 text-[#34c759] mx-auto mb-4 opacity-50" />
            <h3 className="text-[17px] font-medium text-[#1d1d1f] mb-2">No export packing lists</h3>
            <p className="text-[14px] text-[#86868b] mb-4">
              {searchQuery || statusFilter 
                ? 'No packing lists match your search criteria'
                : 'Create your first export packing list from an order or shipment'}
            </p>
            <Link
              href="/shipments"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#34c759] text-white rounded-xl text-[14px] font-medium hover:bg-[#30b553] transition-colors"
            >
              <Ship className="w-4 h-4" />
              Go to Shipments
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-[#f5f5f7] border-b border-[#d2d2d7]/30">
              <tr>
                <th className="text-left text-[12px] font-medium text-[#86868b] uppercase tracking-wider px-6 py-3">
                  Packing List
                </th>
                <th className="text-left text-[12px] font-medium text-[#86868b] uppercase tracking-wider px-6 py-3">
                  Order/Shipment
                </th>
                <th className="text-left text-[12px] font-medium text-[#86868b] uppercase tracking-wider px-6 py-3">
                  Customer
                </th>
                <th className="text-left text-[12px] font-medium text-[#86868b] uppercase tracking-wider px-6 py-3">
                  Cartons
                </th>
                <th className="text-left text-[12px] font-medium text-[#86868b] uppercase tracking-wider px-6 py-3">
                  Weight
                </th>
                <th className="text-left text-[12px] font-medium text-[#86868b] uppercase tracking-wider px-6 py-3">
                  Status
                </th>
                <th className="text-left text-[12px] font-medium text-[#86868b] uppercase tracking-wider px-6 py-3">
                  Date
                </th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d2d2d7]/20">
              {filteredLists.map((pl) => {
                const status = statusConfig[pl.status] || statusConfig.DRAFT
                const StatusIcon = status.icon
                
                return (
                  <tr key={pl.id} className="hover:bg-[#f5f5f7]/50 transition-colors">
                    <td className="px-6 py-4">
                      <Link 
                        href={`/packing-lists/export/${pl.id}`}
                        className="text-[14px] font-medium text-[#34c759] hover:underline"
                      >
                        {pl.packingListNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      {pl.shipmentId ? (
                        <Link 
                          href={`/shipments/${pl.shipmentId}`}
                          className="text-[14px] text-[#1d1d1f] hover:text-[#0071e3] flex items-center gap-1"
                        >
                          <Ship className="w-3.5 h-3.5 text-[#86868b]" />
                          {pl.shipmentNumber || 'Shipment'}
                        </Link>
                      ) : pl.orderId ? (
                        <Link 
                          href={`/orders/${pl.orderId}`}
                          className="text-[14px] text-[#1d1d1f] hover:text-[#0071e3]"
                        >
                          {pl.orderNumber}
                        </Link>
                      ) : (
                        <span className="text-[14px] text-[#86868b]">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[14px] text-[#1d1d1f]">{pl.customerName || '—'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[14px] text-[#1d1d1f]">
                        {pl.totalCartons || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[14px] text-[#1d1d1f]">
                        {pl.totalWeight ? `${formatNumber(pl.totalWeight)} kg` : '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium ${status.bg} ${status.text}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[14px] text-[#86868b]">
                        {new Date(pl.createdAt).toLocaleDateString('fr-FR')}
                      </span>
                    </td>
                    <td className="px-4 py-4 relative">
                      <button
                        onClick={() => setActiveMenu(activeMenu === pl.id ? null : pl.id)}
                        className="p-2 hover:bg-[#f5f5f7] rounded-lg transition-colors"
                      >
                        <MoreHorizontal className="w-4 h-4 text-[#86868b]" />
                      </button>
                      
                      {activeMenu === pl.id && (
                        <div className="absolute right-4 bottom-full mb-1 w-48 bg-white rounded-xl shadow-lg border border-[#d2d2d7]/30 py-1 z-[101]">
                          <Link
                            href={`/packing-lists/export/${pl.id}`}
                            className="flex items-center gap-2 px-4 py-2 text-[14px] text-[#1d1d1f] hover:bg-[#f5f5f7]"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </Link>
                          <button
                            className="flex items-center gap-2 px-4 py-2 text-[14px] text-[#1d1d1f] hover:bg-[#f5f5f7] w-full text-left"
                          >
                            <Download className="w-4 h-4" />
                            Download PDF
                          </button>
                          <button
                            className="flex items-center gap-2 px-4 py-2 text-[14px] text-[#1d1d1f] hover:bg-[#f5f5f7] w-full text-left"
                          >
                            <Printer className="w-4 h-4" />
                            Print
                          </button>
                          <hr className="my-1 border-[#d2d2d7]/30" />
                          <button
                            onClick={() => handleDelete(pl.id)}
                            className="flex items-center gap-2 px-4 py-2 text-[14px] text-[#ff3b30] hover:bg-[#ff3b30]/5 w-full text-left"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Export Packing Lists"
        entityType="packingLists"
        data={filteredLists}
        availableColumns={packingListExportColumns}
        showCustomerFilter={true}
        customers={customers}
        categories={categories}
      />
    </div>
  )
}
