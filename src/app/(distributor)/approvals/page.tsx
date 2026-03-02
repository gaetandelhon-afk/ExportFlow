'use client'

import { useState, useEffect } from 'react'
import { 
  Package, AlertTriangle, CheckCircle, XCircle, Clock, 
  ArrowRight, Loader2, RefreshCcw, ThumbsUp, ThumbsDown
} from 'lucide-react'

interface SubstitutionRequest {
  id: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
  reason: string | null
  originalQty: number
  substituteQty: number | null
  adminNotes: string | null
  createdAt: string
  order: {
    id: string
    orderNumber: string
  }
  originalProduct: {
    id: string
    ref: string
    nameEn: string
    photoUrl: string | null
    priceDistributor?: number
  }
  substituteProduct: {
    id: string
    ref: string
    nameEn: string
    photoUrl: string | null
    priceDistributor?: number
  } | null
}

const statusConfig = {
  PENDING: { 
    bg: 'bg-[#ff9500]/10', 
    text: 'text-[#ff9500]', 
    icon: Clock,
    label: 'Awaiting Your Decision' 
  },
  APPROVED: { 
    bg: 'bg-[#34c759]/10', 
    text: 'text-[#34c759]', 
    icon: CheckCircle,
    label: 'You Approved' 
  },
  REJECTED: { 
    bg: 'bg-[#ff3b30]/10', 
    text: 'text-[#ff3b30]', 
    icon: XCircle,
    label: 'You Rejected' 
  },
  CANCELLED: { 
    bg: 'bg-[#86868b]/10', 
    text: 'text-[#86868b]', 
    icon: XCircle,
    label: 'Cancelled' 
  }
}

export default function ApprovalsPage() {
  const [substitutions, setSubstitutions] = useState<SubstitutionRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [responding, setResponding] = useState<string | null>(null)

  const fetchSubstitutions = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/substitutions')
      if (res.ok) {
        const data = await res.json()
        setSubstitutions(data.substitutions)
      }
    } catch (error) {
      console.error('Failed to fetch substitutions:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSubstitutions()
  }, [])

  const handleRespond = async (id: string, response: 'approved' | 'rejected') => {
    setResponding(id)
    try {
      const res = await fetch(`/api/substitutions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerResponse: response })
      })

      if (res.ok) {
        await fetchSubstitutions()
      }
    } catch (error) {
      console.error('Failed to respond:', error)
    } finally {
      setResponding(null)
    }
  }

  const pendingCount = substitutions.filter(s => s.status === 'PENDING').length
  const pendingSubstitutions = substitutions.filter(s => s.status === 'PENDING')
  const historySubstitutions = substitutions.filter(s => s.status !== 'PENDING')

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">
            Approvals
          </h1>
          <p className="text-[15px] text-[#86868b] mt-1">
            Review and approve product substitutions for your orders
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

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#0071e3] animate-spin" />
        </div>
      ) : (
        <>
          {/* Pending Approvals */}
          {pendingCount > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-[#ff9500]/10 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-[#ff9500]" />
                </div>
                <h2 className="text-[17px] font-semibold text-[#1d1d1f]">
                  Pending Approval ({pendingCount})
                </h2>
              </div>

              <div className="space-y-4">
                {pendingSubstitutions.map(sub => (
                  <div 
                    key={sub.id}
                    className="bg-white rounded-2xl border border-[#ff9500]/30 p-6"
                  >
                    {/* Order Info */}
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-[13px] text-[#86868b]">
                        Order #{sub.order.orderNumber}
                      </span>
                      <span className="text-[12px] text-[#86868b]">
                        {new Date(sub.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Product Comparison */}
                    <div className="flex items-center gap-4">
                      {/* Original */}
                      <div className="flex-1 p-4 bg-[#ff3b30]/5 rounded-xl">
                        <p className="text-[11px] font-medium text-[#ff3b30] mb-3">OUT OF STOCK</p>
                        <div className="flex items-start gap-3">
                          <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                            {sub.originalProduct.photoUrl ? (
                              <img 
                                src={sub.originalProduct.photoUrl} 
                                alt={sub.originalProduct.nameEn}
                                className="w-full h-full object-contain p-1"
                              />
                            ) : (
                              <Package className="w-6 h-6 text-[#86868b]" />
                            )}
                          </div>
                          <div>
                            <p className="text-[14px] font-semibold text-[#1d1d1f]">
                              {sub.originalProduct.ref}
                            </p>
                            <p className="text-[13px] text-[#86868b] line-clamp-2">
                              {sub.originalProduct.nameEn}
                            </p>
                            <p className="text-[14px] font-medium text-[#1d1d1f] mt-1">
                              Qty: {sub.originalQty}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Arrow */}
                      <div className="flex-shrink-0">
                        <ArrowRight className="w-6 h-6 text-[#34c759]" />
                      </div>

                      {/* Substitute */}
                      <div className="flex-1 p-4 bg-[#34c759]/5 rounded-xl">
                        <p className="text-[11px] font-medium text-[#34c759] mb-3">PROPOSED SUBSTITUTE</p>
                        {sub.substituteProduct ? (
                          <div className="flex items-start gap-3">
                            <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                              {sub.substituteProduct.photoUrl ? (
                                <img 
                                  src={sub.substituteProduct.photoUrl} 
                                  alt={sub.substituteProduct.nameEn}
                                  className="w-full h-full object-contain p-1"
                                />
                              ) : (
                                <Package className="w-6 h-6 text-[#86868b]" />
                              )}
                            </div>
                            <div>
                              <p className="text-[14px] font-semibold text-[#1d1d1f]">
                                {sub.substituteProduct.ref}
                              </p>
                              <p className="text-[13px] text-[#86868b] line-clamp-2">
                                {sub.substituteProduct.nameEn}
                              </p>
                              <p className="text-[14px] font-medium text-[#1d1d1f] mt-1">
                                Qty: {sub.substituteQty || sub.originalQty}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-[14px] text-[#86868b]">
                            No substitute proposed - item will be removed
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Reason */}
                    {sub.reason && (
                      <div className="mt-4 p-3 bg-[#f5f5f7] rounded-xl">
                        <p className="text-[13px] text-[#86868b]">
                          <span className="font-medium">Reason:</span> {sub.reason}
                        </p>
                      </div>
                    )}

                    {/* Admin Notes */}
                    {sub.adminNotes && (
                      <div className="mt-3 p-3 bg-[#0071e3]/5 rounded-xl">
                        <p className="text-[13px] text-[#0071e3]">
                          <span className="font-medium">Note from supplier:</span> {sub.adminNotes}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-3 mt-6">
                      <button
                        onClick={() => handleRespond(sub.id, 'rejected')}
                        disabled={responding === sub.id}
                        className="flex-1 h-11 flex items-center justify-center gap-2 text-[14px] font-medium text-[#ff3b30] bg-[#ff3b30]/10 rounded-xl hover:bg-[#ff3b30]/20 transition-colors disabled:opacity-50"
                      >
                        {responding === sub.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <ThumbsDown className="w-4 h-4" />
                            Reject
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleRespond(sub.id, 'approved')}
                        disabled={responding === sub.id}
                        className="flex-1 h-11 flex items-center justify-center gap-2 text-[14px] font-medium text-white bg-[#34c759] rounded-xl hover:bg-[#2db350] transition-colors disabled:opacity-50"
                      >
                        {responding === sub.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <ThumbsUp className="w-4 h-4" />
                            Approve Substitution
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Pending */}
          {pendingCount === 0 && (
            <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-12 text-center mb-8">
              <div className="w-16 h-16 bg-[#34c759]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-[#34c759]" />
              </div>
              <h2 className="text-[17px] font-semibold text-[#1d1d1f] mb-2">
                All caught up!
              </h2>
              <p className="text-[14px] text-[#86868b]">
                You have no pending substitution requests to review
              </p>
            </div>
          )}

          {/* History */}
          {historySubstitutions.length > 0 && (
            <div>
              <h2 className="text-[17px] font-semibold text-[#1d1d1f] mb-4">
                History
              </h2>
              <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 overflow-hidden divide-y divide-[#d2d2d7]/30">
                {historySubstitutions.map(sub => {
                  const status = statusConfig[sub.status]
                  const StatusIcon = status.icon
                  
                  return (
                    <div key={sub.id} className="p-4">
                      <div className="flex items-center gap-4">
                        {/* Product */}
                        <div className="w-12 h-12 bg-[#f5f5f7] rounded-xl flex items-center justify-center overflow-hidden">
                          {sub.originalProduct.photoUrl ? (
                            <img 
                              src={sub.originalProduct.photoUrl} 
                              alt={sub.originalProduct.nameEn}
                              className="w-full h-full object-contain p-1"
                            />
                          ) : (
                            <Package className="w-5 h-5 text-[#86868b]" />
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[14px] font-medium text-[#1d1d1f]">
                              {sub.originalProduct.ref}
                            </span>
                            {sub.substituteProduct && (
                              <>
                                <ArrowRight className="w-3 h-3 text-[#86868b]" />
                                <span className="text-[14px] text-[#86868b]">
                                  {sub.substituteProduct.ref}
                                </span>
                              </>
                            )}
                          </div>
                          <p className="text-[13px] text-[#86868b]">
                            Order #{sub.order.orderNumber}
                          </p>
                        </div>

                        {/* Status */}
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[12px] font-medium ${status.bg} ${status.text}`}>
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
