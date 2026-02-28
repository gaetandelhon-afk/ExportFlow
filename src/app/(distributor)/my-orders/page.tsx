'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useDistributor, CURRENCY_SYMBOLS, Product } from '@/contexts/DistributorContext'
import { 
  Search, Package, ChevronRight, RefreshCw, FileText,
  Clock, CheckCircle, Truck, XCircle, Download, X,
  Ship, Plane, Building2, MapPin, Calendar, ExternalLink,
  Mail, AlertCircle, Edit3
} from 'lucide-react'
import { formatNumber } from '@/lib/utils'
import { getCompanyInfo } from '@/config/features'

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: typeof Clock }> = {
  pending: { label: 'Pending', color: 'var(--color-warning)', bgColor: 'rgba(255, 149, 0, 0.1)', icon: Clock },
  confirmed: { label: 'Confirmed', color: 'var(--color-brand-primary)', bgColor: 'rgba(0, 113, 227, 0.1)', icon: CheckCircle },
  preparing: { label: 'Preparing', color: 'var(--color-brand-primary)', bgColor: 'rgba(0, 113, 227, 0.1)', icon: Package },
  shipped: { label: 'Shipped', color: 'var(--color-success)', bgColor: 'rgba(52, 199, 89, 0.1)', icon: Truck },
  delivered: { label: 'Delivered', color: 'var(--color-success)', bgColor: 'rgba(52, 199, 89, 0.1)', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'var(--color-error)', bgColor: 'rgba(255, 59, 48, 0.1)', icon: XCircle },
}

const shippingIcons: Record<string, typeof Ship> = {
  'Sea Freight': Ship,
  'Air Freight': Plane,
  'Customer Pickup': Building2,
}

type DateFilter = 'all' | 'month' | '3months' | 'year'
type SortOption = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'

export default function MyOrdersPage() {
  const router = useRouter()
  const { orders, addToCart, cancelOrder, user, addresses, quotes, invoiceCurrencySymbol } = useDistributor()
  
  // Get company info for support email
  const companyInfo = getCompanyInfo()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [sortOption, setSortOption] = useState<SortOption>('date-desc')
  const [reorderingId, setReorderingId] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [showCancelModal, setShowCancelModal] = useState<string | null>(null)
  const [cancelReason, setCancelReason] = useState('')

  const filteredOrders = useMemo(() => {
    let result = orders.filter(order => {
      const matchesSearch = 
        order.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.poNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.items.some(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
      
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter

      let matchesDate = true
      if (dateFilter !== 'all') {
        const orderDate = new Date(order.createdAt)
        const now = new Date()
        
        switch (dateFilter) {
          case 'month':
            const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
            matchesDate = orderDate >= oneMonthAgo
            break
          case '3months':
            const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
            matchesDate = orderDate >= threeMonthsAgo
            break
          case 'year':
            const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
            matchesDate = orderDate >= oneYearAgo
            break
        }
      }

      return matchesSearch && matchesStatus && matchesDate
    })

    result.sort((a, b) => {
      switch (sortOption) {
        case 'date-desc':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case 'date-asc':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        case 'amount-desc':
          return b.total - a.total
        case 'amount-asc':
          return a.total - b.total
        default:
          return 0
      }
    })

    return result
  }, [orders, searchQuery, statusFilter, dateFilter, sortOption])

  const handleReorder = useCallback(async (order: typeof orders[0]) => {
    setReorderingId(order.id)
    
    await new Promise(resolve => setTimeout(resolve, 300))
    
    // Try to load products from API for accurate pricing
    const productIds = order.items.map(item => item.id)
    let productsMap: Record<string, Product> = {}
    
    try {
      const res = await fetch('/api/distributor/products')
      if (res.ok) {
        const data = await res.json()
        productsMap = (data.products || []).reduce((acc: Record<string, Product>, p: Product) => {
          acc[p.id] = p
          return acc
        }, {})
      }
    } catch (err) {
      console.warn('Could not fetch products, using order data')
    }
    
    order.items.forEach(orderItem => {
      const apiProduct = productsMap[orderItem.id]
      
      if (apiProduct) {
        // Use fresh product data from API
        addToCart(apiProduct, orderItem.quantity, undefined, orderItem.selectedOptions, orderItem.optionsPriceModifier)
      } else {
        // Fallback: reconstruct product from order item data
        const fallbackProduct: Product = {
          id: orderItem.id,
          ref: orderItem.ref || orderItem.id,
          nameEn: orderItem.name,
          prices: { 
            RMB: orderItem.price * 7.8, 
            EUR: orderItem.price, 
            USD: orderItem.price * 1.1 
          },
          category: 'Products',
          stock: 100,
          moq: 1,
        }
        addToCart(fallbackProduct, orderItem.quantity, undefined, orderItem.selectedOptions, orderItem.optionsPriceModifier)
      }
    })
    
    setReorderingId(null)
    router.push('/cart')
  }, [addToCart, router])

  const handleDownloadInvoice = async (order: typeof orders[0]) => {
    if (!user) return
    
    setDownloadingId(order.id)
    
    const { generateInvoicePdf } = await import('@/lib/generatePdf')
    generateInvoicePdf({
      order: {
        ...order,
        date: order.createdAt,
      },
      user,
      invoiceCurrencySymbol
    })
    
    setDownloadingId(null)
  }

  const handleDownloadPackingList = async (order: typeof orders[0]) => {
    if (!user) return
    
    setDownloadingId(`packing-${order.id}`)
    
    const { generatePackingListPdf } = await import('@/lib/generatePdf')
    const shippingAddress = addresses.find(a => a.id === order.shippingAddressId) || null
    
    generatePackingListPdf({
      order,
      user,
      shippingAddress,
    })
    
    setDownloadingId(null)
  }

  const handleCancelOrder = () => {
    if (showCancelModal) {
      cancelOrder(showCancelModal, cancelReason || 'Cancelled by customer')
      setShowCancelModal(null)
      setCancelReason('')
    }
  }

  const handleContactSupport = (order: typeof orders[0]) => {
    const subject = encodeURIComponent(`Support Request - Order ${order.number}`)
    const body = encodeURIComponent(`Order Number: ${order.number}\nPO Number: ${order.poNumber || 'N/A'}\n\nPlease describe your issue:\n\n`)
    window.location.href = `mailto:${companyInfo.email}?subject=${subject}&body=${body}`
  }

  const getLinkedQuote = (quoteId?: string) => {
    if (!quoteId) return null
    return quotes.find(q => q.id === quoteId)
  }

  const getAddress = (addressId: string | null) => {
    if (!addressId) return null
    return addresses.find(a => a.id === addressId)
  }

  return (
    <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 
            className="text-[28px] font-semibold tracking-tight"
            style={{ color: 'var(--color-text-primary)' }}
          >
            My Orders
          </h1>
          <p 
            className="text-[15px] mt-1"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {filteredOrders.length} of {orders.length} orders
          </p>
        </div>

        {/* Filters */}
        <div className="space-y-4 mb-6">
          {/* Search */}
          <div className="relative">
            <Search 
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: 'var(--color-text-secondary)' }}
            />
            <input
              type="text"
              placeholder="Search by order number, PO, or product..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-10"
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

          {/* Filter Row */}
          <div className="flex flex-wrap gap-3">
            {/* Status Filter */}
            <div className="flex gap-2 flex-wrap">
              {['all', 'pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors capitalize"
                  style={{ 
                    backgroundColor: statusFilter === status ? 'var(--color-brand-primary)' : 'var(--color-bg-secondary)',
                    color: statusFilter === status ? 'white' : 'var(--color-text-primary)',
                    border: statusFilter === status ? 'none' : '1px solid rgba(210, 210, 215, 0.3)'
                  }}
                >
                  {status === 'all' ? 'All' : status}
                </button>
              ))}
            </div>

            {/* Date Filter */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as DateFilter)}
              className="px-3 py-1.5 rounded-lg text-[12px] font-medium"
              style={{ 
                backgroundColor: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)',
                border: '1px solid rgba(210, 210, 215, 0.3)'
              }}
            >
              <option value="all">All Time</option>
              <option value="month">This Month</option>
              <option value="3months">Last 3 Months</option>
              <option value="year">This Year</option>
            </select>

            {/* Sort */}
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="px-3 py-1.5 rounded-lg text-[12px] font-medium"
              style={{ 
                backgroundColor: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)',
                border: '1px solid rgba(210, 210, 215, 0.3)'
              }}
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="amount-desc">Highest Amount</option>
              <option value="amount-asc">Lowest Amount</option>
            </select>
          </div>
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <div className="card p-12 text-center">
            <Package className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-text-tertiary)' }} />
            <p className="text-[15px] mb-2" style={{ color: 'var(--color-text-primary)' }}>
              No orders found
            </p>
            <p className="text-[13px] mb-6" style={{ color: 'var(--color-text-secondary)' }}>
              {searchQuery || statusFilter !== 'all' || dateFilter !== 'all'
                ? 'Try adjusting your filters' 
                : 'Place your first order to get started'}
            </p>
            <Link href="/catalog" className="btn-primary">
              Browse Catalog
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const status = statusConfig[order.status] || statusConfig.pending
              const StatusIcon = status.icon
              const ShippingIcon = shippingIcons[order.shippingMethod] || Ship
              const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0)
              const isReordering = reorderingId === order.id
              const isDownloading = downloadingId === order.id
              const isDownloadingPacking = downloadingId === `packing-${order.id}`
              const currencySymbol = CURRENCY_SYMBOLS[order.currency] || '€'
              const shippingAddress = getAddress(order.shippingAddressId)
              const linkedQuote = getLinkedQuote(order.fromQuoteId)

              return (
                <div key={order.id} className="card p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <Link 
                          href={`/my-orders/${order.id}`}
                          className="text-[15px] font-semibold hover:underline"
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          {order.number}
                        </Link>
                        <span 
                          className="text-[11px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1"
                          style={{ backgroundColor: status.bgColor, color: status.color }}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(order.createdAt).toLocaleDateString('en-GB', { 
                            day: 'numeric', month: 'short', year: 'numeric' 
                          })}
                        </span>
                        {order.poNumber && (
                          <span>PO: {order.poNumber}</span>
                        )}
                        <span className="flex items-center gap-1">
                          <ShippingIcon className="w-3 h-3" />
                          {order.shippingMethod}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[18px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        {currencySymbol}{formatNumber(order.total)}
                      </p>
                      <p className="text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>
                        {itemCount} units
                      </p>
                    </div>
                  </div>

                  {/* Extra Info Row */}
                  <div className="flex flex-wrap gap-4 mb-3 text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>
                    {shippingAddress && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {shippingAddress.city}, {shippingAddress.country}
                      </span>
                    )}
                    {order.requestedDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Requested: {new Date(order.requestedDate).toLocaleDateString('en-GB')}
                      </span>
                    )}
                    {order.trackingNumber && (
                      <span className="flex items-center gap-1">
                        <Truck className="w-3 h-3" />
                        Tracking: {order.trackingNumber}
                      </span>
                    )}
                    {linkedQuote && (
                      <Link 
                        href="/my-quotes" 
                        className="flex items-center gap-1 hover:underline"
                        style={{ color: 'var(--color-brand-primary)' }}
                      >
                        <FileText className="w-3 h-3" />
                        From Quote {linkedQuote.number}
                      </Link>
                    )}
                  </div>

                  {/* Products */}
                  <div 
                    className="py-3 mb-4"
                    style={{ borderTop: '1px solid rgba(210, 210, 215, 0.3)' }}
                  >
                    <p className="text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
                      {order.items.slice(0, 3).map(item => `${item.quantity}× ${item.name}`).join(', ')}
                      {order.items.length > 3 && ` +${order.items.length - 3} more`}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex gap-2 flex-wrap">
                      {/* Reorder */}
                      <button
                        onClick={() => handleReorder(order)}
                        disabled={isReordering}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors hover:opacity-80"
                        style={{ 
                          backgroundColor: 'var(--color-bg-tertiary)',
                          color: 'var(--color-text-primary)'
                        }}
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isReordering ? 'animate-spin' : ''}`} />
                        {isReordering ? 'Adding...' : 'Reorder'}
                      </button>
                      
                      {/* Invoice (for shipped/delivered) */}
                      {['shipped', 'delivered'].includes(order.status) && (
                        <button
                          onClick={() => handleDownloadInvoice(order)}
                          disabled={isDownloading}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors hover:opacity-80"
                          style={{ 
                            backgroundColor: 'rgba(0, 113, 227, 0.1)',
                            color: 'var(--color-brand-primary)'
                          }}
                        >
                          <Download className={`w-3.5 h-3.5 ${isDownloading ? 'animate-pulse' : ''}`} />
                          {isDownloading ? '...' : 'Invoice'}
                        </button>
                      )}

                      {/* Packing List (for shipped/delivered) */}
                      {['shipped', 'delivered'].includes(order.status) && (
                        <button
                          onClick={() => handleDownloadPackingList(order)}
                          disabled={isDownloadingPacking}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors hover:opacity-80"
                          style={{ 
                            backgroundColor: 'rgba(0, 113, 227, 0.1)',
                            color: 'var(--color-brand-primary)'
                          }}
                        >
                          <Package className={`w-3.5 h-3.5 ${isDownloadingPacking ? 'animate-pulse' : ''}`} />
                          {isDownloadingPacking ? '...' : 'Packing List'}
                        </button>
                      )}

                      {/* Track Shipment */}
                      {order.trackingUrl && order.status === 'shipped' && (
                        <a
                          href={order.trackingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors hover:opacity-80"
                          style={{ 
                            backgroundColor: 'rgba(52, 199, 89, 0.1)',
                            color: 'var(--color-success)'
                          }}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Track
                        </a>
                      )}

                      {/* Modify (for pending/confirmed) */}
                      {['pending', 'confirmed'].includes(order.status) && (
                        <Link
                          href={`/my-orders/${order.id}/modify`}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors hover:opacity-80"
                          style={{ 
                            backgroundColor: 'var(--color-brand-primary)',
                            color: 'white'
                          }}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Modify
                        </Link>
                      )}

                      {/* Cancel (for pending only) */}
                      {order.status === 'pending' && (
                        <button
                          onClick={() => setShowCancelModal(order.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors hover:opacity-80"
                          style={{ 
                            backgroundColor: 'rgba(255, 59, 48, 0.1)',
                            color: 'var(--color-error)'
                          }}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Cancel
                        </button>
                      )}

                      {/* Contact Support */}
                      <button
                        onClick={() => handleContactSupport(order)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors hover:opacity-80"
                        style={{ 
                          backgroundColor: 'var(--color-bg-tertiary)',
                          color: 'var(--color-text-secondary)'
                        }}
                      >
                        <Mail className="w-3.5 h-3.5" />
                        Support
                      </button>
                    </div>

                    <Link
                      href={`/my-orders/${order.id}`}
                      className="flex items-center gap-1 text-[13px] font-medium"
                      style={{ color: 'var(--color-brand-primary)' }}
                    >
                      View Details
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'rgba(255, 59, 48, 0.1)' }}
              >
                <AlertCircle className="w-5 h-5" style={{ color: 'var(--color-error)' }} />
              </div>
              <div>
                <h3 
                  className="text-[17px] font-semibold"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  Cancel Order
                </h3>
                <p className="text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
                  This action cannot be undone
                </p>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                Reason (optional)
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Why are you cancelling this order?"
                rows={3}
                className="input-field resize-none w-full"
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCancelModal(null)
                  setCancelReason('')
                }}
                className="flex-1 btn-secondary"
              >
                Keep Order
              </button>
              <button
                onClick={handleCancelOrder}
                className="flex-1 px-4 py-2 rounded-xl text-[14px] font-medium text-white transition-colors hover:opacity-90"
                style={{ backgroundColor: 'var(--color-error)' }}
              >
                Cancel Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}