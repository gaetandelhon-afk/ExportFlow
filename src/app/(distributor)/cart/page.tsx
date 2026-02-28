'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useDistributor } from '@/contexts/DistributorContext'
import { 
  Minus, Plus, Trash2, ArrowRight, ShoppingCart, Save, 
  FileText, Package, X
} from 'lucide-react'
import { formatNumber } from '@/lib/utils'

export default function CartPage() {
  const { 
    cart, 
    updateCartItem, 
    removeFromCart, 
    clearCart, 
    getCartTotal,
    getCartItemCount,
    saveDraft,
    drafts,
    loadDraft,
    deleteDraft,
    config,
    user,
    getDisplayPrice,
    displayCurrencySymbol
  } = useDistributor()
  
  const [showDraftModal, setShowDraftModal] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [showDrafts, setShowDrafts] = useState(false)
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({})

  // Safe defaults
  const hasDrafts = config?.features?.drafts ?? true
  const hasOrderNotes = config?.features?.orderNotes ?? true

  const subtotal = getCartTotal()
  const itemCount = getCartItemCount()

  const handleSaveDraft = () => {
    if (draftName.trim()) {
      saveDraft(draftName.trim())
      setDraftName('')
      setShowDraftModal(false)
    }
  }

  const handleLoadDraft = (draftId: string) => {
    loadDraft(draftId)
    setShowDrafts(false)
  }

  const updateNote = (productId: string, note: string) => {
    setItemNotes(prev => ({ ...prev, [productId]: note }))
    const cartItem = cart.find(i => i.product.id === productId)
    if (cartItem) {
      updateCartItem(productId, cartItem.quantity, note)
    }
  }

  // Format price helper
  const formatPrice = (amount: number) => `${displayCurrencySymbol}${formatNumber(amount)}`

  return (
    <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 
              className="text-[28px] font-semibold tracking-tight"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Your Cart
            </h1>
            <p 
              className="text-[15px] mt-1"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {cart.length} product{cart.length !== 1 ? 's' : ''} · {itemCount} units · {formatPrice(subtotal)} total
            </p>
          </div>
          
          {cart.length > 0 && (
            <div className="flex gap-2">
              {hasDrafts && (
                <>
                  <button
                    onClick={() => setShowDrafts(true)}
                    className="btn-secondary text-[13px] h-9 px-3"
                  >
                    <FileText className="w-4 h-4" />
                    Drafts ({drafts?.length || 0})
                  </button>
                  <button
                    onClick={() => setShowDraftModal(true)}
                    className="btn-secondary text-[13px] h-9 px-3"
                  >
                    <Save className="w-4 h-4" />
                    Save Draft
                  </button>
                </>
              )}
              <button
                onClick={clearCart}
                className="text-[13px] h-9 px-3 rounded-xl transition-colors hover:bg-red-50"
                style={{ color: 'var(--color-error)' }}
              >
                Clear All
              </button>
            </div>
          )}
        </div>

        {cart.length === 0 ? (
          <div className="card p-12 text-center">
            <ShoppingCart className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-text-tertiary)' }} />
            <p 
              className="text-[15px] mb-2"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Your cart is empty
            </p>
            <p 
              className="text-[13px] mb-6"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Browse our catalog and add products to get started
            </p>
            <div className="flex gap-3 justify-center">
              <Link href="/catalog" className="btn-primary">
                Browse Catalog
              </Link>
              {hasDrafts && drafts && drafts.length > 0 && (
                <button
                  onClick={() => setShowDrafts(true)}
                  className="btn-secondary"
                >
                  Load a Draft
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cart.map((item, index) => {
                const basePrice = getDisplayPrice(item.product)
                const optionsPrice = item.optionsPriceModifier || 0
                const itemPrice = basePrice + optionsPrice
                const itemTotal = itemPrice * item.quantity
                
                // Generate unique key including options
                const itemKey = item.selectedOptions && item.selectedOptions.length > 0
                  ? `${item.product.id}-${item.selectedOptions.map(o => o.optionId).join('-')}`
                  : `${item.product.id}-${index}`
                
                return (
                  <div key={itemKey} className="card p-4">
                    <div className="flex items-start gap-4">
                      {/* Product Image */}
                      <Link 
                        href={`/catalog/${item.product.id}`}
                        className="w-20 h-20 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
                      >
                        <Package className="w-8 h-8" style={{ color: 'var(--color-text-tertiary)' }} />
                      </Link>
                      
                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <p 
                              className="text-[12px]"
                              style={{ color: 'var(--color-text-secondary)' }}
                            >
                              {item.product.ref}
                            </p>
                            <Link 
                              href={`/catalog/${item.product.id}`}
                              className="text-[15px] font-medium hover:underline"
                              style={{ color: 'var(--color-text-primary)' }}
                            >
                              {item.product.nameEn}
                            </Link>
                            
                            {/* Selected Options */}
                            {item.selectedOptions && item.selectedOptions.length > 0 && (
                              <div className="mt-1 space-y-0.5">
                                {item.selectedOptions.map(opt => (
                                  <p 
                                    key={opt.optionId}
                                    className="text-[12px]"
                                    style={{ color: 'var(--color-text-tertiary)' }}
                                  >
                                    {opt.groupName}: <span style={{ color: 'var(--color-text-secondary)' }}>{opt.optionName}</span>
                                    {opt.priceModifier !== 0 && (
                                      <span className={opt.priceModifier > 0 ? 'text-orange-500' : 'text-green-500'}>
                                        {' '}({opt.priceModifier > 0 ? '+' : ''}{formatPrice(opt.priceModifier)})
                                      </span>
                                    )}
                                  </p>
                                ))}
                              </div>
                            )}
                            
                            <p 
                              className="text-[14px] mt-1"
                              style={{ color: 'var(--color-brand-primary)' }}
                            >
                              {formatPrice(itemPrice)} each
                              {optionsPrice !== 0 && (
                                <span className="text-[11px] ml-1" style={{ color: 'var(--color-text-tertiary)' }}>
                                  (base {formatPrice(basePrice)})
                                </span>
                              )}
                            </p>
                          </div>
                          <button 
                            onClick={() => removeFromCart(item.product.id, item.selectedOptions)}
                            className="p-1 hover:opacity-70 transition-opacity"
                            style={{ color: 'var(--color-error)' }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        
                        {/* Quantity & Total */}
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => updateCartItem(item.product.id, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50"
                              style={{ 
                                backgroundColor: 'var(--color-bg-secondary)',
                                border: '1px solid rgba(210, 210, 215, 0.5)'
                              }}
                            >
                              <Minus className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
                            </button>
                            <input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(e) => {
                                const val = parseInt(e.target.value)
                                updateCartItem(item.product.id, isNaN(val) ? 1 : Math.max(1, val))
                              }}
                              className="w-16 h-8 text-center text-[14px] font-medium rounded-lg focus:outline-none focus:ring-2"
                              style={{ 
                                backgroundColor: 'var(--color-bg-secondary)',
                                border: '1px solid rgba(210, 210, 215, 0.5)',
                                color: 'var(--color-text-primary)'
                              }}
                            />
                            <button 
                              onClick={() => updateCartItem(item.product.id, item.quantity + 1)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-gray-100"
                              style={{ 
                                backgroundColor: 'var(--color-bg-secondary)',
                                border: '1px solid rgba(210, 210, 215, 0.5)'
                              }}
                            >
                              <Plus className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
                            </button>
                          </div>
                          
                          <p 
                            className="text-[16px] font-semibold"
                            style={{ color: 'var(--color-text-primary)' }}
                          >
                            {formatPrice(itemTotal)}
                          </p>
                        </div>

                        {/* Note */}
                        {hasOrderNotes && (
                          <div className="mt-3">
                            <input
                              type="text"
                              placeholder="Add a note for this item..."
                              value={itemNotes[item.product.id] ?? item.note ?? ''}
                              onChange={(e) => updateNote(item.product.id, e.target.value)}
                              className="w-full h-8 px-3 text-[12px] rounded-lg focus:outline-none focus:ring-2"
                              style={{ 
                                backgroundColor: 'var(--color-bg-tertiary)',
                                color: 'var(--color-text-primary)'
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="card p-6 sticky top-20">
                <h2 
                  className="text-[15px] font-semibold mb-4"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  Order Summary
                </h2>
                
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-[14px]">
                    <span style={{ color: 'var(--color-text-secondary)' }}>
                      Subtotal ({itemCount} units)
                    </span>
                    <span style={{ color: 'var(--color-text-primary)' }}>
                      {formatPrice(subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[14px]">
                    <span style={{ color: 'var(--color-text-secondary)' }}>Shipping</span>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Calculated at checkout</span>
                  </div>
                </div>
                
                <div 
                  className="flex justify-between py-4 mb-6"
                  style={{ borderTop: '1px solid rgba(210, 210, 215, 0.3)' }}
                >
                  <span 
                    className="text-[15px] font-semibold"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    Estimated Total
                  </span>
                  <span 
                    className="text-[20px] font-semibold"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {formatPrice(subtotal)}
                  </span>
                </div>

                {/* Currency Info */}
                {user && user.displayCurrency !== user.invoiceCurrency && (
                  <div 
                    className="p-3 rounded-lg mb-4 text-[12px]"
                    style={{ backgroundColor: 'rgba(0, 113, 227, 0.05)' }}
                  >
                    <p style={{ color: 'var(--color-text-secondary)' }}>
                      Catalog prices shown in <strong>{user.displayCurrency}</strong>
                    </p>
                    <p style={{ color: 'var(--color-text-secondary)' }}>
                      Invoice will be in <strong>{user.invoiceCurrency}</strong>
                    </p>
                  </div>
                )}
                
                <Link href="/checkout" className="btn-primary w-full mb-3">
                  Proceed to Checkout
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link href="/checkout?quote=true" className="btn-secondary w-full">
                  Generate Quote
                </Link>
                
                <Link 
                  href="/catalog"
                  className="block text-center text-[13px] mt-4"
                  style={{ color: 'var(--color-brand-primary)' }}
                >
                  Continue shopping
                </Link>
              </div>
            </div>
          </div>
        )}

      {/* Save Draft Modal */}
      {showDraftModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 
                className="text-[17px] font-semibold"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Save as Draft
              </h3>
              <button onClick={() => setShowDraftModal(false)}>
                <X className="w-5 h-5" style={{ color: 'var(--color-text-secondary)' }} />
              </button>
            </div>
            <input
              type="text"
              placeholder="Draft name (e.g., 'Summer Order 2025')"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              className="input-field mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={handleSaveDraft} className="btn-primary flex-1">
                Save Draft
              </button>
              <button onClick={() => setShowDraftModal(false)} className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drafts Modal */}
      {showDrafts && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 
                className="text-[17px] font-semibold"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Saved Drafts
              </h3>
              <button onClick={() => setShowDrafts(false)}>
                <X className="w-5 h-5" style={{ color: 'var(--color-text-secondary)' }} />
              </button>
            </div>
            
            {(!drafts || drafts.length === 0) ? (
              <p 
                className="text-center py-8"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                No saved drafts
              </p>
            ) : (
              <div className="space-y-3">
                {drafts.map((draft) => (
                  <div 
                    key={draft.id}
                    className="p-3 rounded-xl"
                    style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p 
                          className="text-[14px] font-medium"
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          {draft.name}
                        </p>
                        <p 
                          className="text-[12px]"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          {draft.items.length} products · {new Date(draft.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleLoadDraft(draft.id)}
                          className="text-[12px] font-medium px-3 py-1.5 rounded-lg"
                          style={{ 
                            backgroundColor: 'var(--color-brand-primary)',
                            color: 'white'
                          }}
                        >
                          Load
                        </button>
                        <button
                          onClick={() => deleteDraft(draft.id)}
                          className="p-1.5"
                          style={{ color: 'var(--color-error)' }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}