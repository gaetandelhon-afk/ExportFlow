'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { 
  RefreshCcw, Search, Filter, Package, AlertTriangle, CheckCircle, 
  XCircle, Clock, ChevronRight, Eye, Loader2, ArrowRight
} from 'lucide-react'

interface SubstitutionRequest {
  id: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
  reason: string | null
  originalQty: number
  substituteQty: number | null
  adminNotes: string | null
  customerResponse: string | null
  respondedAt: string | null
  createdAt: string
  order: {
    id: string
    orderNumber: string
    customer: {
      id: string
      companyName: string
      contactName: string | null
      email: string
    }
  }
  originalProduct: {
    id: string
    ref: string
    nameEn: string
    photoUrl: string | null
  }
  substituteProduct: {
    id: string
    ref: string
    nameEn: string
    photoUrl: string | null
  } | null
}

const statusConfig = {
  PENDING: { 
    bg: 'bg-[#ff9500]/10', 
    text: 'text-[#ff9500]', 
    icon: Clock,
    label: 'Pending' 
  },
  APPROVED: { 
    bg: 'bg-[#34c759]/10', 
    text: 'text-[#34c759]', 
    icon: CheckCircle,
    label: 'Approved' 
  },
  REJECTED: { 
    bg: 'bg-[#ff3b30]/10', 
    text: 'text-[#ff3b30]', 
    icon: XCircle,
    label: 'Rejected' 
  },
  CANCELLED: { 
    bg: 'bg-[#86868b]/10', 
    text: 'text-[#86868b]', 
    icon: XCircle,
    label: 'Cancelled' 
  }
}

export default function SubstitutionsPage() {
  const [substitutions, setSubstitutions] = useState<SubstitutionRequest[]>([])
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const fetchSubstitutions = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      
      const res = await fetch(`/api/substitutions?${params}`)
      if (res.ok) {
        const data = await res.json()
        setSubstitutions(data.substitutions)
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to fetch substitutions:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSubstitutions()
  }, [statusFilter])

  const filteredSubstitutions = substitutions.filter(sub => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (
      sub.order.orderNumber.toLowerCase().includes(term) ||
      sub.order.customer.companyName.toLowerCase().includes(term) ||
      sub.originalProduct.ref.toLowerCase().includes(term) ||
      sub.originalProduct.nameEn.toLowerCase().includes(term)
    )
  })

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">
            Substitutions
          </h1>
          <p className="text-[15px] text-[#86868b] mt-1">
            Manage product substitution requests for out-of-stock items
          </p>
        </div>
        <button
          onClick={fetchSubstitutions}
          className="h-10 px-4 flex items-center gap-2 bg-[#f5f5f7] text-[#1d1d1f] text-[13px] font-medium rounded-xl hover:bg-[#e8e8ed] transition-colors"
        >
          <RefreshCcw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-5">
          <div className="flex items-center justify-between">
            <p className="text-[13px] text-[#86868b]">Pending</p>
            <div className="w-8 h-8 bg-[#ff9500]/10 rounded-lg flex items-center justify-center">
              <Clock className="w-4 h-4 text-[#ff9500]" />
            </div>
          </div>
          <p className="text-[28px] font-semibold text-[#1d1d1f] mt-2">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-5">
          <div className="flex items-center justify-between">
            <p className="text-[13px] text-[#86868b]">Approved</p>
            <div className="w-8 h-8 bg-[#34c759]/10 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-[#34c759]" />
            </div>
          </div>
          <p className="text-[28px] font-semibold text-[#1d1d1f] mt-2">{stats.approved}</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-5">
          <div className="flex items-center justify-between">
            <p className="text-[13px] text-[#86868b]">Rejected</p>
            <div className="w-8 h-8 bg-[#ff3b30]/10 rounded-lg flex items-center justify-center">
              <XCircle className="w-4 h-4 text-[#ff3b30]" />
            </div>
          </div>
          <p className="text-[28px] font-semibold text-[#1d1d1f] mt-2">{stats.rejected}</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-5">
          <div className="flex items-center justify-between">
            <p className="text-[13px] text-[#86868b]">Total</p>
            <div className="w-8 h-8 bg-[#0071e3]/10 rounded-lg flex items-center justify-center">
              <RefreshCcw className="w-4 h-4 text-[#0071e3]" />
            </div>
          </div>
          <p className="text-[28px] font-semibold text-[#1d1d1f] mt-2">{stats.total}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" />
            <input
              type="text"
              placeholder="Search by order, customer, or product..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 pl-10 pr-4 bg-[#f5f5f7] rounded-xl text-[14px] text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#86868b]" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 px-3 bg-[#f5f5f7] rounded-xl text-[14px] text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-[#0071e3] animate-spin" />
          </div>
        ) : filteredSubstitutions.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-12 h-12 text-[#86868b] mx-auto mb-4" />
            <p className="text-[17px] font-semibold text-[#1d1d1f] mb-1">No substitutions found</p>
            <p className="text-[14px] text-[#86868b]">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your filters'
                : 'Substitution requests will appear here when created'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#d2d2d7]/30">
            {filteredSubstitutions.map(sub => {
              const status = statusConfig[sub.status]
              const StatusIcon = status.icon
              
              return (
                <Link
                  key={sub.id}
                  href={`/substitutions/${sub.id}`}
                  className="block p-5 hover:bg-[#f5f5f7]/50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {/* Original Product Image */}
                    <div className="w-16 h-16 bg-[#f5f5f7] rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0 relative">
                      {sub.originalProduct.photoUrl ? (
                        <Image 
                          src={sub.originalProduct.photoUrl} 
                          alt={sub.originalProduct.nameEn}
                          width={64}
                          height={64}
                          className="object-contain p-1"
                          unoptimized
                        />
                      ) : (
                        <Package className="w-6 h-6 text-[#86868b]" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[12px] font-medium ${status.bg} ${status.text}`}>
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </span>
                        <span className="text-[13px] text-[#86868b]">
                          Order #{sub.order.orderNumber}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[15px] font-medium text-[#1d1d1f]">
                          {sub.originalProduct.ref}
                        </span>
                        <span className="text-[14px] text-[#86868b]">
                          {sub.originalProduct.nameEn}
                        </span>
                        <span className="text-[14px] text-[#86868b]">
                          × {sub.originalQty}
                        </span>
                      </div>

                      {sub.substituteProduct && (
                        <div className="flex items-center gap-2 text-[13px]">
                          <ArrowRight className="w-4 h-4 text-[#34c759]" />
                          <span className="text-[#34c759] font-medium">
                            {sub.substituteProduct.ref}
                          </span>
                          <span className="text-[#86868b]">
                            {sub.substituteProduct.nameEn}
                          </span>
                          {sub.substituteQty && (
                            <span className="text-[#86868b]">
                              × {sub.substituteQty}
                            </span>
                          )}
                        </div>
                      )}

                      {sub.reason && (
                        <p className="text-[13px] text-[#86868b] mt-1 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {sub.reason}
                        </p>
                      )}
                    </div>

                    {/* Customer */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-[14px] font-medium text-[#1d1d1f]">
                        {sub.order.customer.companyName}
                      </p>
                      <p className="text-[13px] text-[#86868b]">
                        {new Date(sub.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <ChevronRight className="w-5 h-5 text-[#86868b] flex-shrink-0" />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
