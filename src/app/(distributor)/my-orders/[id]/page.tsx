'use client'

import { use, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useDistributor, CURRENCY_SYMBOLS, Product } from '@/contexts/DistributorContext'
import { 
  ChevronLeft, Package, Clock, CheckCircle, Truck, XCircle,
  Download, RefreshCw, Mail, ExternalLink, MapPin, FileText,
  Calendar, Ship, Plane, Building2, AlertCircle, Edit3
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

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { orders, addresses, quotes, addToCart, cancelOrder, user, invoiceCurrencySymbol } = useDistributor()
  
  // Get company info for support email
  const companyInfo = getCompanyInfo()
  
  const [reordering, setReordering] = useState(false)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  const order = orders.find(o => o.id === id)
  
  if (!order) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center">
        <Package className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-text-tertiary)' }} />
        <h1 className="text-[20px] font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
          Order not found
        </h1>
        <p className="text-[14px] mb-6" style={{ color: 'var(--color-text-secondary)' }}>
          This order may have been deleted or doesn't exist.
        </p>
        <Link href="/my-orders" className="btn-primary">
          Back to My Orders
        </Link>
      </div>
    )
  }

  const status = statusConfig[order.status] || statusConfig.pending
  const StatusIcon = status.icon
  const ShippingIcon = shippingIcons[order.shippingMethod] || Ship
  const currencySymbol = CURRENCY_SYMBOLS[order.currency] || '€'
  const shippingAddress = addresses.find(a => a.id === order.shippingAddressId)
  const billingAddress = addresses.find(a => a.id === order.billingAddressId)
  const linkedQuote = order.fromQuoteId ? quotes.find(q => q.id === order.fromQuoteId) : null

  const handleReorder = useCallback(async () => {
    setReordering(true)
    await new Promise(resolve => setTimeout(resolve, 300))
    
    // Try to load products from API for accurate pricing
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
        addToCart(apiProduct, orderItem.quantity, undefined, orderItem.selectedOptions, orderItem.optionsPriceModifier)
      } else {
        const fallbackProduct: Product = {
          id: orderItem.id,
          ref: orderItem.ref || orderItem.id,
          nameEn: orderItem.name,
          prices: { RMB: orderItem.price * 7.8, EUR: orderItem.price, USD: orderItem.price * 1.1 },
          category: 'Products',
          stock: 100,
          moq: 1,
        }
        addToCart(fallbackProduct, orderItem.quantity, undefined, orderItem.selectedOptions, orderItem.optionsPriceModifier)
      }
    })
    
    setReordering(false)
    router.push('/cart')
  }, [addToCart, order, router])

  const handleDownloadInvoice = async () => {
    if (!user) return
    setDownloading('invoice')
    const { generateInvoicePdf } = await import('@/lib/generatePdf')
    generateInvoicePdf({ order: { ...order, date: order.createdAt }, user, invoiceCurrencySymbol })
    setDownloading(null)
  }

  const handleDownloadPackingList = async () => {
    if (!user) return
    setDownloading('packing')
    const { generatePackingListPdf } = await import('@/lib/generatePdf')
    generatePackingListPdf({ order, user, shippingAddress: shippingAddress || null })
    setDownloading(null)
  }

  const handleDownloadOrderSummary = async () => {
    if (!user) return
    setDownloading('summary')
    const { generateOrderSummaryPdf } = await import('@/lib/generatePdf')
    generateOrderSummaryPdf({
      order,
      user,
      currencySymbol,
      shippingAddress: shippingAddress || null,
    })
    setDownloading(null)
  }

  const handleCancelOrder = () => {
    cancelOrder(order.id, cancelReason || 'Cancelled by customer')
    setShowCancelModal(false)
    setCancelReason('')
  }

  const handleContactSupport = () => {
    const subject = encodeURIComponent(`Support Request - Order ${order.number}`)
    const body = encodeURIComponent(`Order Number: ${order.number}\nPO Number: ${order.poNumber || 'N/A'}\n\nPlease describe your issue:\n\n`)
    window.location.href = `mailto:${companyInfo.email}?subject=${subject}&body=${body}`
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Link 
        href="/my-orders"
        className="inline-flex items-center gap-1 text-[13px] mb-6"
        style={{ color: 'var(--color-brand-primary)' }}
      >
        <ChevronLeft className="w-4 h-4" />
        Back to My Orders
      </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-[28px] font-semibold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                {order.number}
              </h1>
              <span 
                className="text-[12px] font-medium px-3 py-1 rounded-full flex items-center gap-1.5"
                style={{ backgroundColor: status.bgColor, color: status.color }}
              >
                <StatusIcon className="w-4 h-4" />
                {status.label}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
              {order.poNumber && <span>PO: {order.poNumber}</span>}
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-[24px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {currencySymbol}{formatNumber(order.total)}
            </p>
            <p className="text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
              Total ({order.items.reduce((s, i) => s + i.quantity, 0)} units)
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 mb-8">
          <button onClick={handleReorder} disabled={reordering} className="btn-secondary">
            <RefreshCw className={`w-4 h-4 ${reordering ? 'animate-spin' : ''}`} />
            {reordering ? 'Adding...' : 'Reorder'}
          </button>

          {/* Export PDF — disponible pour tous les statuts */}
          <button onClick={handleDownloadOrderSummary} disabled={downloading === 'summary'} className="btn-secondary">
            <Download className={`w-4 h-4 ${downloading === 'summary' ? 'animate-pulse' : ''}`} />
            {downloading === 'summary' ? 'Generating...' : 'Export PDF'}
          </button>
          
          {['shipped', 'delivered'].includes(order.status) && (
            <>
              <button onClick={handleDownloadInvoice} disabled={downloading === 'invoice'} className="btn-secondary">
                <Download className={`w-4 h-4 ${downloading === 'invoice' ? 'animate-pulse' : ''}`} />
                Invoice
              </button>
              <button onClick={handleDownloadPackingList} disabled={downloading === 'packing'} className="btn-secondary">
                <Package className={`w-4 h-4 ${downloading === 'packing' ? 'animate-pulse' : ''}`} />
                Packing List
              </button>
            </>
          )}
          
          {order.trackingUrl && order.status === 'shipped' && (
            <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="btn-primary">
              <ExternalLink className="w-4 h-4" />
              Track Shipment
            </a>
          )}
          
          {['pending', 'confirmed'].includes(order.status) && (
            <Link
              href={`/my-orders/${order.id}/modify`}
              className="btn-primary"
            >
              <Edit3 className="w-4 h-4" />
              Modify Order
            </Link>
          )}
          
          {order.status === 'pending' && (
            <button 
              onClick={() => setShowCancelModal(true)}
              className="px-4 py-2 rounded-xl text-[14px] font-medium flex items-center gap-2 transition-colors hover:opacity-90"
              style={{ backgroundColor: 'rgba(255, 59, 48, 0.1)', color: 'var(--color-error)' }}
            >
              <XCircle className="w-4 h-4" />
              Cancel Order
            </button>
          )}
          
          <button onClick={handleContactSupport} className="btn-secondary">
            <Mail className="w-4 h-4" />
            Contact Support
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Timeline */}
            <div className="card p-6">
              <h2 className="text-[15px] font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                Order Timeline
              </h2>
              <div className="space-y-4">
                {order.statusHistory.map((entry, index) => {
                  const entryStatus = statusConfig[entry.status] || statusConfig.pending
                  const EntryIcon = entryStatus.icon
                  const isLast = index === order.statusHistory.length - 1
                  
                  return (
                    <div key={index} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: entryStatus.bgColor }}
                        >
                          <EntryIcon className="w-4 h-4" style={{ color: entryStatus.color }} />
                        </div>
                        {!isLast && (
                          <div className="w-0.5 h-full min-h-[20px] my-1" style={{ backgroundColor: 'rgba(210, 210, 215, 0.5)' }} />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="text-[14px] font-medium capitalize" style={{ color: 'var(--color-text-primary)' }}>
                          {entry.status}
                        </p>
                        <p className="text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>
                          {new Date(entry.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {entry.note && (
                          <p className="text-[12px] mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
                            {entry.note}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Products */}
            <div className="card p-6">
              <h2 className="text-[15px] font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                Products ({order.items.length})
              </h2>
              <div className="space-y-3">
                {order.items.map((item, index) => (
                  <div 
                    key={index} 
                    className="flex items-center gap-4 py-3"
                    style={{ borderBottom: index < order.items.length - 1 ? '1px solid rgba(210, 210, 215, 0.3)' : 'none' }}
                  >
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
                    >
                      <Package className="w-6 h-6" style={{ color: 'var(--color-text-tertiary)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        {item.name}
                      </p>
                      <p className="text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>
                        {item.ref} · Qty: {item.quantity}
                      </p>
                      {item.serials && item.serials.length > 0 && (
                        <p className="text-[11px] font-mono mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                          S/N: {item.serials.join(', ')}
                        </p>
                      )}
                      {/* Display selected options */}
                      {item.selectedOptions && item.selectedOptions.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.selectedOptions.map((opt) => (
                            <span 
                              key={opt.groupId}
                              className="text-[10px] px-1.5 py-0.5 rounded"
                              style={{ 
                                backgroundColor: 'rgba(0, 113, 227, 0.1)',
                                color: 'var(--color-brand-primary)'
                              }}
                            >
                              {opt.groupName}: {opt.optionName}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-[14px] font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        {currencySymbol}{formatNumber(item.price * item.quantity)}
                      </p>
                      <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                        {currencySymbol}{item.price} each
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Totals */}
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(210, 210, 215, 0.3)' }}>
                <div className="flex justify-between text-[13px] mb-2">
                  <span style={{ color: 'var(--color-text-secondary)' }}>Subtotal</span>
                  <span style={{ color: 'var(--color-text-primary)' }}>{currencySymbol}{formatNumber(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-[13px] mb-2">
                  <span style={{ color: 'var(--color-text-secondary)' }}>Shipping</span>
                  <span style={{ color: 'var(--color-text-primary)' }}>
                    {order.shipping > 0 ? `${currencySymbol}${formatNumber(order.shipping)}` : 'TBC'}
                  </span>
                </div>
                <div className="flex justify-between text-[15px] font-semibold pt-2" style={{ borderTop: '1px solid rgba(210, 210, 215, 0.3)' }}>
                  <span style={{ color: 'var(--color-text-primary)' }}>Total</span>
                  <span style={{ color: 'var(--color-text-primary)' }}>{currencySymbol}{formatNumber(order.total)}</span>
                </div>
              </div>
            </div>

            {/* Special Instructions */}
            {order.instructions && (
              <div className="card p-6">
                <h2 className="text-[15px] font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                  Special Instructions
                </h2>
                <p className="text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
                  {order.instructions}
                </p>
              </div>
            )}

            {/* Modification History */}
            {order.modifications && order.modifications.length > 0 && (
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[15px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    Modification History
                  </h2>
                  <span 
                    className="text-[12px] font-medium px-2 py-1 rounded-full"
                    style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}
                  >
                    Version {order.version || 1}
                  </span>
                </div>
                <div className="space-y-4">
                  {order.modifications.map((mod, index) => (
                    <div 
                      key={mod.id}
                      className="p-4 rounded-xl"
                      style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[12px] font-medium" style={{ color: 'var(--color-brand-primary)' }}>
                          Version {mod.version}
                        </span>
                        <span className="text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>
                          {new Date(mod.timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[13px] mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                        {mod.reason}
                      </p>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {mod.changes.filter(c => c.type === 'modified').length > 0 && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(255, 149, 0, 0.1)', color: 'var(--color-warning)' }}>
                            {mod.changes.filter(c => c.type === 'modified').length} modified
                          </span>
                        )}
                        {mod.changes.filter(c => c.type === 'removed').length > 0 && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(255, 59, 48, 0.1)', color: 'var(--color-error)' }}>
                            {mod.changes.filter(c => c.type === 'removed').length} removed
                          </span>
                        )}
                        {mod.changes.filter(c => c.type === 'added').length > 0 && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(52, 199, 89, 0.1)', color: 'var(--color-success)' }}>
                            {mod.changes.filter(c => c.type === 'added').length} added
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[12px]">
                        <span style={{ color: 'var(--color-text-tertiary)' }}>
                          {currencySymbol}{formatNumber(mod.previousTotal)} → {currencySymbol}{formatNumber(mod.newTotal)}
                        </span>
                        {mod.surchargeApplied > 0 && (
                          <span style={{ color: 'var(--color-warning)' }}>
                            +{currencySymbol}{mod.surchargeApplied} surcharge
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Shipping Info */}
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-4">
                <ShippingIcon className="w-5 h-5" style={{ color: 'var(--color-text-secondary)' }} />
                <h2 className="text-[15px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  {order.shippingMethod}
                </h2>
              </div>
              
              {order.trackingNumber && (
                <div className="mb-4">
                  <p className="text-[11px] uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-tertiary)' }}>
                    Tracking Number
                  </p>
                  <p className="text-[13px] font-mono" style={{ color: 'var(--color-text-primary)' }}>
                    {order.trackingNumber}
                  </p>
                </div>
              )}
              
              {order.requestedDate && (
                <div>
                  <p className="text-[11px] uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-tertiary)' }}>
                    Requested Delivery
                  </p>
                  <p className="text-[13px]" style={{ color: 'var(--color-text-primary)' }}>
                    {new Date(order.requestedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              )}
            </div>

            {/* Shipping Address */}
            {shippingAddress && (
              <div className="card p-6">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
                  <h2 className="text-[15px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    Ship To
                  </h2>
                </div>
                <p className="text-[13px] font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  {shippingAddress.company}
                </p>
                <p className="text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>
                  {shippingAddress.contactName}
                </p>
                <p className="text-[12px] mt-2" style={{ color: 'var(--color-text-secondary)' }}>
                  {shippingAddress.street}<br />
                  {shippingAddress.postalCode} {shippingAddress.city}<br />
                  {shippingAddress.country}
                </p>
                {shippingAddress.phone && (
                  <p className="text-[12px] mt-2" style={{ color: 'var(--color-text-secondary)' }}>
                    {shippingAddress.phone}
                  </p>
                )}
              </div>
            )}

            {/* Billing Address */}
            {billingAddress && billingAddress.id !== shippingAddress?.id && (
              <div className="card p-6">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
                  <h2 className="text-[15px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    Bill To
                  </h2>
                </div>
                <p className="text-[13px] font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  {billingAddress.company}
                </p>
                <p className="text-[12px] mt-2" style={{ color: 'var(--color-text-secondary)' }}>
                  {billingAddress.street}<br />
                  {billingAddress.postalCode} {billingAddress.city}<br />
                  {billingAddress.country}
                </p>
              </div>
            )}

            {/* Linked Quote */}
            {linkedQuote && (
              <div className="card p-6">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4" style={{ color: 'var(--color-brand-primary)' }} />
                  <h2 className="text-[15px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    From Quote
                  </h2>
                </div>
                <Link 
                  href="/my-quotes"
                  className="text-[13px] font-medium hover:underline"
                  style={{ color: 'var(--color-brand-primary)' }}
                >
                  {linkedQuote.number}
                </Link>
                <p className="text-[12px] mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                  Created {new Date(linkedQuote.createdAt).toLocaleDateString('en-GB')}
                </p>
              </div>
            )}
          </div>
        </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255, 59, 48, 0.1)' }}>
                <AlertCircle className="w-5 h-5" style={{ color: 'var(--color-error)' }} />
              </div>
              <div>
                <h3 className="text-[17px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>Cancel Order</h3>
                <p className="text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>This action cannot be undone</p>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Reason (optional)</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Why are you cancelling this order?"
                rows={3}
                className="input-field resize-none w-full"
              />
            </div>
            
            <div className="flex gap-3">
              <button onClick={() => setShowCancelModal(false)} className="flex-1 btn-secondary">Keep Order</button>
              <button onClick={handleCancelOrder} className="flex-1 px-4 py-2 rounded-xl text-[14px] font-medium text-white" style={{ backgroundColor: 'var(--color-error)' }}>
                Cancel Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}