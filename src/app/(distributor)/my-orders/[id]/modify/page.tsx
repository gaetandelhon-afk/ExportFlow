'use client'

import { use, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useMemo, useCallback } from 'react'
import OrderDiffView from '@/components/OrderDiffView'
import { useDistributor, CURRENCY_SYMBOLS, Product } from '@/contexts/DistributorContext'
import {
  calculateLateSurcharge,
  calculateOrderChanges,
  calculateModifiedTotals,
  canModifyOrder,
  ModifiedOrderItem,
} from '@/lib/orderModification'
import {
  ChevronLeft, Package, Trash2, Plus, Minus, Search, X,
  AlertTriangle, CheckCircle, Eye, RotateCcw, Loader2
} from 'lucide-react'
import { formatNumber } from '@/lib/utils'

// LocalStorage key for draft modifications
const getDraftKey = (orderId: string) => `order_modification_draft_${orderId}`

// Draft structure
interface ModificationDraft {
  orderId: string
  modifiedItems: ModifiedOrderItem[]
  reason: string
  savedAt: string
}

export default function ModifyOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { orders, modifyOrder, getInvoicePrice } = useDistributor()
  
  const order = orders.find(o => o.id === id)
  
  // Initialize modified items from order
  const getInitialItems = useCallback((): ModifiedOrderItem[] => {
    if (!order) return []
    return order.items.map(item => ({
      ...item,
      originalQuantity: item.quantity,
      isNew: false,
      isRemoved: false,
    }))
  }, [order])
  
  // State for modified items - will be initialized from localStorage if available
  const [modifiedItems, setModifiedItems] = useState<ModifiedOrderItem[]>(getInitialItems)
  const [reason, setReason] = useState('')
  const [hasDraft, setHasDraft] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  
  const [showPreview, setShowPreview] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddProducts, setShowAddProducts] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Products from API
  const [availableProducts, setAvailableProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  
  // Load draft from localStorage on mount
  useEffect(() => {
    if (!order || typeof window === 'undefined') {
      setIsHydrated(true)
      return
    }
    
    try {
      const draftJson = localStorage.getItem(getDraftKey(id))
      if (draftJson) {
        const draft: ModificationDraft = JSON.parse(draftJson)
        // Only load if it's for the same order
        if (draft.orderId === id) {
          setModifiedItems(draft.modifiedItems)
          setReason(draft.reason)
          setHasDraft(true)
        }
      }
    } catch (e) {
      console.error('Failed to load draft:', e)
    }
    setIsHydrated(true)
  }, [id, order])
  
  // Save draft to localStorage whenever modifiedItems or reason changes
  useEffect(() => {
    if (!isHydrated || !order || typeof window === 'undefined') return
    
    // Check if there are any changes
    const hasChanges = modifiedItems.some(item => 
      item.isNew || 
      item.isRemoved || 
      item.quantity !== item.originalQuantity
    ) || reason.trim() !== ''
    
    if (hasChanges) {
      const draft: ModificationDraft = {
        orderId: id,
        modifiedItems,
        reason,
        savedAt: new Date().toISOString()
      }
      localStorage.setItem(getDraftKey(id), JSON.stringify(draft))
      setHasDraft(true)
    } else {
      // No changes, remove draft
      localStorage.removeItem(getDraftKey(id))
      setHasDraft(false)
    }
  }, [modifiedItems, reason, id, order, isHydrated])
  
  // Load products from API when needed
  useEffect(() => {
    if (!showAddProducts) return
    
    const loadProducts = async () => {
      setLoadingProducts(true)
      try {
        const params = new URLSearchParams()
        if (searchQuery) params.set('search', searchQuery)
        params.set('limit', '50')
        
        const res = await fetch(`/api/distributor/products?${params.toString()}`)
        if (res.ok) {
          const data = await res.json()
          setAvailableProducts(data.products || [])
        }
      } catch (err) {
        console.error('Failed to load products:', err)
      } finally {
        setLoadingProducts(false)
      }
    }
    
    loadProducts()
  }, [showAddProducts, searchQuery])
  
  // Reset to original order items
  const handleResetDraft = useCallback(() => {
    if (!order) return
    setModifiedItems(getInitialItems())
    setReason('')
    localStorage.removeItem(getDraftKey(id))
    setHasDraft(false)
  }, [order, id, getInitialItems])
  
  // Get currency symbol
  const currencySymbol = order ? CURRENCY_SYMBOLS[order.currency] || '€' : '€'
  
  // Check if order can be modified
  const modifyCheck = order ? canModifyOrder(order) : { canModify: false, reason: 'Order not found' }
  
  // Calculate late surcharge - use order's requestedDate as proxy for loadingDate
  const surchargeResult = useMemo(() => {
    if (!order) return { 
      amount: 0, 
      message: '', 
      canModify: false, 
      daysUntilReference: null as number | null, 
      tier: 'free', 
      rule: null 
    }
    const subtotal = modifiedItems
      .filter(item => !item.isRemoved)
      .reduce((sum, item) => sum + (item.price * item.quantity), 0)
    return calculateLateSurcharge(order.requestedDate, subtotal)
  }, [order, modifiedItems])
  
  // Calculate changes
  const changes = useMemo(() => {
    if (!order) return []
    return calculateOrderChanges(order.items, modifiedItems)
  }, [order, modifiedItems])
  
  // Calculate totals
  const totals = useMemo(() => {
    const surcharge = surchargeResult.amount > 0 ? surchargeResult.amount : 0
    return calculateModifiedTotals(modifiedItems, surcharge)
  }, [modifiedItems, surchargeResult])
  
  // Filter products for adding (now uses API data)
  const filteredProducts = useMemo(() => {
    // Products are already filtered by the API, just slice
    return availableProducts.slice(0, 10)
  }, [availableProducts])
  
  // Check if item is already in order
  const isItemInOrder = (productId: string) => {
    return modifiedItems.some(item => item.id === productId && !item.isRemoved)
  }
  
  // Handlers
  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return
    setModifiedItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      )
    )
  }
  
  const handleRemoveItem = (itemId: string) => {
    setModifiedItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, isRemoved: true, quantity: 0 } : item
      )
    )
  }
  
  const handleRestoreItem = (itemId: string) => {
    setModifiedItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, isRemoved: false, quantity: item.originalQuantity || 1 } : item
      )
    )
  }
  
  const handleAddProduct = (product: Product) => {
    const price = getInvoicePrice(product)
    const existingItem = modifiedItems.find(item => item.id === product.id)
    
    if (existingItem) {
      // If it was removed, restore it
      if (existingItem.isRemoved) {
        handleRestoreItem(product.id)
      }
    } else {
      // Add new item
      setModifiedItems(prev => [
        ...prev,
        {
          id: product.id,
          ref: product.ref,
          name: product.nameEn,
          quantity: product.moq || 1,
          price,
          isNew: true,
          isRemoved: false,
        }
      ])
    }
    setSearchQuery('')
    setShowAddProducts(false)
  }
  
  const handleSubmit = async () => {
    if (!order || changes.length === 0 || !reason.trim()) return
    
    setIsSubmitting(true)
    
    // Prepare the new items (excluding removed ones)
    const newItems = modifiedItems
      .filter(item => !item.isRemoved)
      .map(item => ({
        id: item.id,
        ref: item.ref,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      }))
    
    // Surcharge amount (only if positive, otherwise 0)
    const surcharge = surchargeResult.amount > 0 ? surchargeResult.amount : 0
    
    // Call the modifyOrder function
    const result = modifyOrder(order.id, newItems, reason, surcharge)
    
    if (result.success) {
      // Clear draft from localStorage (also done in context, but be safe)
      if (typeof window !== 'undefined') {
        localStorage.removeItem(getDraftKey(order.id))
      }
      router.push(`/my-orders/${order.id}`)
    } else {
      setIsSubmitting(false)
      alert('Failed to modify order. Please try again.')
    }
  }
  
  // Not found state
  if (!order) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center">
        <Package className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-text-tertiary)' }} />
        <h1 className="text-[20px] font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
          Order not found
        </h1>
        <Link href="/my-orders" className="btn-primary">
          Back to My Orders
        </Link>
      </div>
    )
  }
  
  // Cannot modify state
  if (!modifyCheck.canModify) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-warning)' }} />
        <h1 className="text-[20px] font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
          Cannot Modify Order
        </h1>
        <p className="text-[14px] mb-6" style={{ color: 'var(--color-text-secondary)' }}>
          {modifyCheck.reason}
        </p>
        <Link href={`/my-orders/${id}`} className="btn-primary">
          Back to Order
        </Link>
      </div>
    )
  }
  
  // Modification blocked (loading date passed)
  if (!surchargeResult.canModify) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-error)' }} />
        <h1 className="text-[20px] font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
          Modification Blocked
        </h1>
        <p className="text-[14px] mb-6" style={{ color: 'var(--color-text-secondary)' }}>
          {surchargeResult.message}
        </p>
        <Link href={`/my-orders/${id}`} className="btn-primary">
          Back to Order
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Back Link */}
      <Link 
        href={`/my-orders/${id}`}
        className="inline-flex items-center gap-1 text-[13px] mb-6"
        style={{ color: 'var(--color-brand-primary)' }}
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Order
      </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-[28px] font-semibold tracking-tight mb-1" style={{ color: 'var(--color-text-primary)' }}>
              Modify Order {order.number}
            </h1>
            <p className="text-[14px]" style={{ color: 'var(--color-text-secondary)' }}>
              Edit quantities, add or remove products
            </p>
          </div>
          {hasDraft && (
            <button
              onClick={handleResetDraft}
              className="btn-secondary text-[13px]"
            >
              <RotateCcw className="w-4 h-4" />
              Reset Changes
            </button>
          )}
        </div>

        {/* Draft restored notice */}
        {hasDraft && isHydrated && (
          <div 
            className="card p-3 mb-6 flex items-center gap-2"
            style={{ backgroundColor: 'rgba(0, 113, 227, 0.05)' }}
          >
            <CheckCircle className="w-4 h-4 shrink-0" style={{ color: 'var(--color-brand-primary)' }} />
            <p className="text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
              Your previous modifications have been restored. Changes are saved automatically.
            </p>
          </div>
        )}

        {/* Late Surcharge Warning */}
        {surchargeResult.tier !== 'free' && (
          <div 
            className="card p-4 mb-6 flex items-start gap-3"
            style={{ 
              backgroundColor: surchargeResult.tier === 'urgent' ? 'rgba(255, 59, 48, 0.05)' : 
                              surchargeResult.tier === 'late' ? 'rgba(255, 149, 0, 0.05)' : 
                              'rgba(0, 113, 227, 0.05)',
            }}
          >
            <AlertTriangle 
              className="w-5 h-5 mt-0.5 shrink-0"
              style={{ 
                color: surchargeResult.tier === 'urgent' ? 'var(--color-error)' :
                       surchargeResult.tier === 'late' ? 'var(--color-warning)' :
                       'var(--color-brand-primary)'
              }}
            />
            <div>
              <p 
                className="text-[14px] font-medium"
                style={{ 
                  color: surchargeResult.tier === 'urgent' ? 'var(--color-error)' :
                         surchargeResult.tier === 'late' ? 'var(--color-warning)' :
                         'var(--color-brand-primary)'
                }}
              >
                {surchargeResult.tier === 'urgent' ? 'Urgent Modification' :
                 surchargeResult.tier === 'late' ? 'Late Modification' :
                 'Modification Notice'}
              </p>
              <p className="text-[13px] mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                {surchargeResult.message}
                {surchargeResult.amount > 0 && (
                  <span className="font-medium" style={{ color: 'var(--color-warning)' }}>
                    {' '}A surcharge of {currencySymbol}{surchargeResult.amount} will be applied.
                  </span>
                )}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Current Items */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current Items */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[15px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  Order Items ({modifiedItems.filter(i => !i.isRemoved).length})
                </h2>
                <button
                  onClick={() => setShowAddProducts(!showAddProducts)}
                  className="btn-secondary text-[13px] px-3 py-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Add Products
                </button>
              </div>

              {/* Add Products Panel */}
              {showAddProducts && (
                <div className="mb-4 p-4 rounded-xl" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-tertiary)' }} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search products by name or reference..."
                      className="input-field pl-10 w-full"
                      autoFocus
                    />
                    <button
                      onClick={() => { setShowAddProducts(false); setSearchQuery(''); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      <X className="w-4 h-4" style={{ color: 'var(--color-text-tertiary)' }} />
                    </button>
                  </div>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {filteredProducts.map(product => (
                      <div
                        key={product.id}
                        className="flex items-center justify-between p-3 rounded-lg"
                        style={{ backgroundColor: 'var(--color-bg-secondary)' }}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                            {product.nameEn}
                          </p>
                          <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                            {product.ref} · {currencySymbol}{getInvoicePrice(product)}
                          </p>
                        </div>
                        <button
                          onClick={() => handleAddProduct(product)}
                          disabled={isItemInOrder(product.id)}
                          className="btn-primary text-[12px] px-3 py-1.5 ml-3 disabled:opacity-50"
                        >
                          {isItemInOrder(product.id) ? 'In Order' : 'Add'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Items List */}
              <div className="space-y-3">
                {modifiedItems.map((item) => (
                  <div 
                    key={item.id}
                    className="flex items-center gap-4 p-3 rounded-xl transition-all"
                    style={{ 
                      backgroundColor: item.isRemoved ? 'rgba(255, 59, 48, 0.05)' : 
                                       item.isNew ? 'rgba(52, 199, 89, 0.05)' :
                                       item.quantity !== item.originalQuantity ? 'rgba(255, 149, 0, 0.05)' :
                                       'var(--color-bg-tertiary)',
                      border: `1px solid ${
                        item.isRemoved ? 'rgba(255, 59, 48, 0.2)' :
                        item.isNew ? 'rgba(52, 199, 89, 0.2)' :
                        item.quantity !== item.originalQuantity ? 'rgba(255, 149, 0, 0.2)' :
                        'transparent'
                      }`,
                      opacity: item.isRemoved ? 0.6 : 1
                    }}
                  >
                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p 
                          className={`text-[14px] font-medium ${item.isRemoved ? 'line-through' : ''}`}
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          {item.name}
                        </p>
                        {item.isNew && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: 'rgba(52, 199, 89, 0.2)', color: 'var(--color-success)' }}>
                            NEW
                          </span>
                        )}
                      </div>
                      <p className="text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>
                        {item.ref} · {currencySymbol}{item.price} each
                      </p>
                      {!item.isNew && item.originalQuantity && item.quantity !== item.originalQuantity && !item.isRemoved && (
                        <p className="text-[11px] mt-1" style={{ color: 'var(--color-warning)' }}>
                          Original: {item.originalQuantity} → {item.quantity}
                        </p>
                      )}
                    </div>

                    {/* Quantity Controls */}
                    {!item.isRemoved ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-40"
                          style={{ backgroundColor: 'var(--color-bg-secondary)' }}
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 1)}
                          className="w-16 text-center text-[14px] font-medium rounded-lg py-1.5"
                          style={{ backgroundColor: 'var(--color-bg-secondary)', border: 'none' }}
                          min={1}
                        />
                        <button
                          onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                          style={{ backgroundColor: 'var(--color-bg-secondary)' }}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    ) : null}

                    {/* Line Total */}
                    <div className="text-right min-w-[80px]">
                      <p className="text-[14px] font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        {item.isRemoved ? '-' : `${currencySymbol}${formatNumber(item.price * item.quantity)}`}
                      </p>
                    </div>

                    {/* Remove/Restore Button */}
                    {item.isRemoved ? (
                      <button
                        onClick={() => handleRestoreItem(item.id)}
                        className="p-2 rounded-lg transition-colors"
                        style={{ backgroundColor: 'rgba(52, 199, 89, 0.1)' }}
                        title="Restore item"
                      >
                        <Plus className="w-4 h-4" style={{ color: 'var(--color-success)' }} />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-2 rounded-lg transition-colors hover:bg-red-50"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" style={{ color: 'var(--color-error)' }} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Running Totals */}
              <div className="mt-6 pt-4" style={{ borderTop: '1px solid rgba(210, 210, 215, 0.3)' }}>
                <div className="flex justify-between text-[13px] mb-2">
                  <span style={{ color: 'var(--color-text-secondary)' }}>Original Total:</span>
                  <span style={{ color: 'var(--color-text-primary)' }}>{currencySymbol}{formatNumber(order.total)}</span>
                </div>
                <div className="flex justify-between text-[13px] mb-2">
                  <span style={{ color: 'var(--color-text-secondary)' }}>New Subtotal:</span>
                  <span style={{ color: 'var(--color-text-primary)' }}>{currencySymbol}{formatNumber(totals.subtotal)}</span>
                </div>
                {surchargeResult.amount > 0 && (
                  <div className="flex justify-between text-[13px] mb-2">
                    <span style={{ color: 'var(--color-warning)' }}>Late Surcharge:</span>
                    <span style={{ color: 'var(--color-warning)' }}>+{currencySymbol}{formatNumber(surchargeResult.amount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[15px] font-semibold pt-2" style={{ borderTop: '1px solid rgba(210, 210, 215, 0.3)' }}>
                  <span style={{ color: 'var(--color-text-primary)' }}>New Total:</span>
                  <span style={{ color: 'var(--color-text-primary)' }}>{currencySymbol}{formatNumber(totals.total)}</span>
                </div>
                <div className="flex justify-between text-[13px] mt-2">
                  <span style={{ color: 'var(--color-text-secondary)' }}>Difference:</span>
                  <span 
                    className="font-medium"
                    style={{ color: totals.total >= order.total ? 'var(--color-success)' : 'var(--color-error)' }}
                  >
                    {totals.total >= order.total ? '+' : ''}{currencySymbol}{formatNumber(totals.total - order.total)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Preview & Actions */}
          <div className="space-y-6">
            {/* Preview Changes Button */}
            <button
              onClick={() => setShowPreview(true)}
              disabled={changes.length === 0}
              className="w-full btn-secondary disabled:opacity-50"
            >
              <Eye className="w-4 h-4" />
              Preview Changes ({changes.length})
            </button>

            {/* Reason Input */}
            <div className="card p-4">
              <label className="block text-[13px] font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                Reason for Modification *
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Please explain why you're modifying this order..."
                rows={3}
                className="input-field w-full resize-none"
              />
              <p className="text-[11px] mt-2" style={{ color: 'var(--color-text-tertiary)' }}>
                This will be recorded in the order history
              </p>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={changes.length === 0 || !reason.trim() || isSubmitting}
              className="w-full btn-primary disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Confirm Modification
                </>
              )}
            </button>

            {changes.length === 0 && (
              <p className="text-[12px] text-center" style={{ color: 'var(--color-text-tertiary)' }}>
                Make changes to the order to continue
              </p>
            )}
          </div>
        </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white p-4 border-b" style={{ borderColor: 'rgba(210, 210, 215, 0.3)' }}>
              <div className="flex items-center justify-between">
                <h2 className="text-[17px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  Review Changes
                </h2>
                <button onClick={() => setShowPreview(false)}>
                  <X className="w-5 h-5" style={{ color: 'var(--color-text-tertiary)' }} />
                </button>
              </div>
            </div>
            <div className="p-4">
              <OrderDiffView
                changes={changes}
                originalTotal={order.total}
                newSubtotal={totals.subtotal}
                surchargeResult={surchargeResult}
                currency={order.currency}
              />
            </div>
            <div className="sticky bottom-0 bg-white p-4 border-t flex gap-3" style={{ borderColor: 'rgba(210, 210, 215, 0.3)' }}>
              <button onClick={() => setShowPreview(false)} className="flex-1 btn-secondary">
                Continue Editing
              </button>
              <button 
                onClick={() => { setShowPreview(false); handleSubmit(); }}
                disabled={!reason.trim() || isSubmitting}
                className="flex-1 btn-primary disabled:opacity-50"
              >
                Confirm Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
