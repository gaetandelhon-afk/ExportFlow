'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { 
  ArrowLeft, Package, AlertTriangle, CheckCircle, XCircle, Clock,
  ArrowRight, Send, Loader2, Search
} from 'lucide-react'

interface Product {
  id: string
  ref: string
  nameEn: string
  photoUrl: string | null
  priceDistributor?: number
}

interface SubstitutionDetail {
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
    status: string
    customer: {
      id: string
      companyName: string
      contactName: string | null
      email: string
    }
    lines: {
      id: string
      quantity: number
      unitPrice: number
      product: Product
    }[]
  }
  originalProduct: Product
  substituteProduct: Product | null
}

const statusConfig = {
  PENDING: { bg: 'bg-[#ff9500]/10', text: 'text-[#ff9500]', icon: Clock, label: 'Pending' },
  APPROVED: { bg: 'bg-[#34c759]/10', text: 'text-[#34c759]', icon: CheckCircle, label: 'Approved' },
  REJECTED: { bg: 'bg-[#ff3b30]/10', text: 'text-[#ff3b30]', icon: XCircle, label: 'Rejected' },
  CANCELLED: { bg: 'bg-[#86868b]/10', text: 'text-[#86868b]', icon: XCircle, label: 'Cancelled' }
}

export default function SubstitutionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)
  
  const [substitution, setSubstitution] = useState<SubstitutionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form state
  const [substituteProductId, setSubstituteProductId] = useState<string | null>(null)
  const [substituteQty, setSubstituteQty] = useState<number>(0)
  const [adminNotes, setAdminNotes] = useState('')
  const [reason, setReason] = useState('')
  
  // Product search
  const [searchTerm, setSearchTerm] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [showProductSearch, setShowProductSearch] = useState(false)

  useEffect(() => {
    fetchSubstitution()
    fetchProducts()
  }, [id])

  const fetchSubstitution = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/substitutions/${id}`)
      if (res.ok) {
        const data = await res.json()
        setSubstitution(data.substitution)
        setSubstituteProductId(data.substitution.substituteProduct?.id || null)
        setSubstituteQty(data.substitution.substituteQty || data.substitution.originalQty)
        setAdminNotes(data.substitution.adminNotes || '')
        setReason(data.substitution.reason || '')
      } else {
        setError('Substitution not found')
      }
    } catch {
      setError('Failed to fetch substitution')
    } finally {
      setLoading(false)
    }
  }

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products/list')
      if (res.ok) {
        const data = await res.json()
        setProducts(data.products || [])
      }
    } catch {
      console.error('Failed to fetch products')
    }
  }

  const handleSave = async (newStatus?: string) => {
    setSaving(true)
    setError(null)
    
    try {
      const res = await fetch(`/api/substitutions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          substituteProductId,
          substituteQty,
          adminNotes,
          reason
        })
      })

      if (res.ok) {
        await fetchSubstitution()
        if (newStatus === 'APPROVED' || newStatus === 'REJECTED') {
          // Optionally redirect back
        }
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to update')
      }
    } catch {
      setError('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this substitution request?')) return
    
    setSaving(true)
    try {
      await fetch(`/api/substitutions/${id}`, { method: 'DELETE' })
      router.push('/substitutions')
    } catch {
      setError('Failed to cancel')
    } finally {
      setSaving(false)
    }
  }

  const selectedSubstitute = products.find(p => p.id === substituteProductId)
  const filteredProducts = products.filter(p => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return p.ref.toLowerCase().includes(term) || p.nameEn.toLowerCase().includes(term)
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-[#0071e3] animate-spin" />
      </div>
    )
  }

  if (!substitution) {
    return (
      <div className="text-center py-20">
        <AlertTriangle className="w-12 h-12 text-[#ff3b30] mx-auto mb-4" />
        <p className="text-[17px] font-semibold text-[#1d1d1f]">{error || 'Substitution not found'}</p>
        <Link href="/substitutions" className="text-[#0071e3] text-[14px] mt-2 inline-block">
          ← Back to substitutions
        </Link>
      </div>
    )
  }

  const status = statusConfig[substitution.status]
  const StatusIcon = status.icon
  const isPending = substitution.status === 'PENDING'

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/substitutions"
          className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-[#f5f5f7] transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-[#1d1d1f]" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-[24px] font-semibold text-[#1d1d1f]">
              Substitution Request
            </h1>
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[13px] font-medium ${status.bg} ${status.text}`}>
              <StatusIcon className="w-4 h-4" />
              {status.label}
            </span>
          </div>
          <p className="text-[14px] text-[#86868b] mt-1">
            Order #{substitution.order.orderNumber} • {substitution.order.customer.companyName}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-[#ff3b30]/10 border border-[#ff3b30]/20 rounded-xl text-[14px] text-[#ff3b30]">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Original Product */}
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-6">
          <h2 className="text-[15px] font-semibold text-[#1d1d1f] mb-4 flex items-center gap-2">
            <Package className="w-4 h-4 text-[#ff3b30]" />
            Original Product
          </h2>
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 bg-[#f5f5f7] rounded-xl flex items-center justify-center overflow-hidden relative">
              {substitution.originalProduct.photoUrl ? (
                <Image 
                  src={substitution.originalProduct.photoUrl} 
                  alt={substitution.originalProduct.nameEn}
                  width={80}
                  height={80}
                  className="object-contain p-2"
                  unoptimized
                />
              ) : (
                <Package className="w-8 h-8 text-[#86868b]" />
              )}
            </div>
            <div>
              <p className="text-[17px] font-semibold text-[#1d1d1f]">
                {substitution.originalProduct.ref}
              </p>
              <p className="text-[14px] text-[#86868b]">
                {substitution.originalProduct.nameEn}
              </p>
              <p className="text-[15px] font-medium text-[#1d1d1f] mt-2">
                Qty: {substitution.originalQty}
              </p>
            </div>
          </div>

          {/* Reason */}
          <div className="mt-4">
            <label className="block text-[13px] font-medium text-[#86868b] mb-1">
              Reason
            </label>
            {isPending ? (
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Out of stock, Discontinued..."
                className="w-full h-10 px-4 bg-[#f5f5f7] rounded-xl text-[14px] text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              />
            ) : (
              <p className="text-[14px] text-[#1d1d1f] p-3 bg-[#f5f5f7] rounded-xl">
                {substitution.reason || 'Not specified'}
              </p>
            )}
          </div>
        </div>

        {/* Substitute Product */}
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-6">
          <h2 className="text-[15px] font-semibold text-[#1d1d1f] mb-4 flex items-center gap-2">
            <ArrowRight className="w-4 h-4 text-[#34c759]" />
            Substitute Product
          </h2>

          {isPending ? (
            <>
              {/* Product selector */}
              <div className="relative mb-4">
                <button
                  onClick={() => setShowProductSearch(!showProductSearch)}
                  className="w-full p-4 bg-[#f5f5f7] rounded-xl text-left flex items-center gap-4"
                >
                  {selectedSubstitute ? (
                    <>
                      <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center overflow-hidden relative">
                        {selectedSubstitute.photoUrl ? (
                          <Image 
                            src={selectedSubstitute.photoUrl} 
                            alt={selectedSubstitute.nameEn}
                            width={48}
                            height={48}
                            className="object-contain"
                            unoptimized
                          />
                        ) : (
                          <Package className="w-5 h-5 text-[#86868b]" />
                        )}
                      </div>
                      <div>
                        <p className="text-[14px] font-medium text-[#1d1d1f]">{selectedSubstitute.ref}</p>
                        <p className="text-[13px] text-[#86868b]">{selectedSubstitute.nameEn}</p>
                      </div>
                    </>
                  ) : (
                    <span className="text-[14px] text-[#86868b]">Select substitute product...</span>
                  )}
                </button>

                {showProductSearch && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-[#d2d2d7]/30 shadow-lg z-10 max-h-80 overflow-hidden">
                    <div className="p-3 border-b border-[#d2d2d7]/30">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" />
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="Search products..."
                          className="w-full h-9 pl-10 pr-4 bg-[#f5f5f7] rounded-lg text-[13px] focus:outline-none"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {filteredProducts.slice(0, 20).map(product => (
                        <button
                          key={product.id}
                          onClick={() => {
                            setSubstituteProductId(product.id)
                            setShowProductSearch(false)
                            setSearchTerm('')
                          }}
                          className="w-full p-3 flex items-center gap-3 hover:bg-[#f5f5f7] text-left"
                        >
                          <div className="w-10 h-10 bg-[#f5f5f7] rounded-lg flex items-center justify-center overflow-hidden relative">
                            {product.photoUrl ? (
                              <Image src={product.photoUrl} alt="" width={40} height={40} className="object-contain" unoptimized />
                            ) : (
                              <Package className="w-4 h-4 text-[#86868b]" />
                            )}
                          </div>
                          <div>
                            <p className="text-[13px] font-medium text-[#1d1d1f]">{product.ref}</p>
                            <p className="text-[12px] text-[#86868b]">{product.nameEn}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Quantity */}
              <div className="mb-4">
                <label className="block text-[13px] font-medium text-[#86868b] mb-1">
                  Substitute Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  value={substituteQty}
                  onChange={(e) => setSubstituteQty(parseInt(e.target.value) || 0)}
                  className="w-full h-10 px-4 bg-[#f5f5f7] rounded-xl text-[14px] text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                />
              </div>
            </>
          ) : substitution.substituteProduct ? (
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 bg-[#f5f5f7] rounded-xl flex items-center justify-center overflow-hidden relative">
                {substitution.substituteProduct.photoUrl ? (
                  <Image 
                    src={substitution.substituteProduct.photoUrl} 
                    alt={substitution.substituteProduct.nameEn}
                    width={80}
                    height={80}
                    className="object-contain p-2"
                    unoptimized
                  />
                ) : (
                  <Package className="w-8 h-8 text-[#86868b]" />
                )}
              </div>
              <div>
                <p className="text-[17px] font-semibold text-[#1d1d1f]">
                  {substitution.substituteProduct.ref}
                </p>
                <p className="text-[14px] text-[#86868b]">
                  {substitution.substituteProduct.nameEn}
                </p>
                <p className="text-[15px] font-medium text-[#1d1d1f] mt-2">
                  Qty: {substitution.substituteQty || substitution.originalQty}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-[14px] text-[#86868b] p-4 bg-[#f5f5f7] rounded-xl">
              No substitute was proposed
            </p>
          )}
        </div>
      </div>

      {/* Admin Notes */}
      <div className="mt-6 bg-white rounded-2xl border border-[#d2d2d7]/30 p-6">
        <h2 className="text-[15px] font-semibold text-[#1d1d1f] mb-4">Admin Notes</h2>
        {isPending ? (
          <textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            placeholder="Add notes for internal reference..."
            rows={3}
            className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[14px] text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#0071e3] resize-none"
          />
        ) : (
          <p className="text-[14px] text-[#1d1d1f] p-4 bg-[#f5f5f7] rounded-xl">
            {substitution.adminNotes || 'No notes'}
          </p>
        )}
      </div>

      {/* Customer Response */}
      {substitution.customerResponse && (
        <div className="mt-6 bg-white rounded-2xl border border-[#d2d2d7]/30 p-6">
          <h2 className="text-[15px] font-semibold text-[#1d1d1f] mb-4">Customer Response</h2>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-lg text-[13px] font-medium ${
              substitution.customerResponse === 'approved' 
                ? 'bg-[#34c759]/10 text-[#34c759]' 
                : 'bg-[#ff3b30]/10 text-[#ff3b30]'
            }`}>
              {substitution.customerResponse === 'approved' ? 'Approved' : 'Rejected'}
            </span>
            {substitution.respondedAt && (
              <span className="text-[13px] text-[#86868b]">
                on {new Date(substitution.respondedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      {isPending && (
        <div className="mt-6 flex items-center gap-4">
          <button
            onClick={handleCancel}
            disabled={saving}
            className="h-11 px-5 text-[14px] font-medium text-[#86868b] bg-[#f5f5f7] rounded-xl hover:bg-[#e8e8ed] transition-colors disabled:opacity-50"
          >
            Cancel Request
          </button>
          <div className="flex-1" />
          <button
            onClick={() => handleSave()}
            disabled={saving}
            className="h-11 px-5 text-[14px] font-medium text-[#1d1d1f] bg-[#f5f5f7] rounded-xl hover:bg-[#e8e8ed] transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Draft'}
          </button>
          <button
            onClick={() => handleSave('PENDING')}
            disabled={saving || !substituteProductId}
            className="h-11 px-5 flex items-center gap-2 text-[14px] font-medium text-white bg-[#0071e3] rounded-xl hover:bg-[#0077ed] transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            Send to Customer
          </button>
        </div>
      )}
    </div>
  )
}
