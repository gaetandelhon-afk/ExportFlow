'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import ProductCard from '@/components/ProductCard'
import ProductOptionSelector from '@/components/ProductOptionSelector'
import { useDistributor, Product, SelectedProductOption } from '@/contexts/DistributorContext'
import { parseProductOptions } from '@/types/product-options'
import { 
  ChevronLeft, Heart, ShoppingCart, Plus, Minus, Package, 
  Truck, Shield, Check, Loader2, Settings2
} from 'lucide-react'
import { formatNumber } from '@/lib/utils'

export default function ProductDetailPage() {
  const params = useParams()
  const productId = params.id as string
  
  const { 
    addToCart, 
    cart, 
    toggleFavorite, 
    isFavorite, 
    addToRecentlyViewed,
    effectiveSettings,
    config,
    user,
    getDisplayPrice,
    getInvoicePrice,
    displayCurrencySymbol,
    invoiceCurrencySymbol
  } = useDistributor()
  
  const [quantity, setQuantity] = useState(1)
  const [addedToCart, setAddedToCart] = useState(false)
  const [showOptionsModal, setShowOptionsModal] = useState(false)
  
  // Product from API
  const [product, setProduct] = useState<Product | null>(null)
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load product from API
  const loadProduct = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const res = await fetch(`/api/distributor/products/${productId}`)
      
      if (res.ok) {
        const data = await res.json()
        setProduct(data.product)
        setRelatedProducts(data.relatedProducts || [])
      } else {
        setError('Product not found')
      }
    } catch (err) {
      console.error('Failed to load product:', err)
      setError('Failed to load product')
    } finally {
      setLoading(false)
    }
  }, [productId])

  useEffect(() => {
    loadProduct()
  }, [loadProduct])

  // Check if product has options
  const productOptions = product ? parseProductOptions(product.customFields) : { optionGroups: [] }
  const hasOptions = productOptions.optionGroups.length > 0

  const favorite = product ? isFavorite(product.id) : false
  const cartItem = product ? cart.find(item => item.product.id === product.id) : null
  const inCart = cartItem ? cartItem.quantity : 0

  // Safe defaults
  const hasFavorites = config?.features?.favorites ?? true
  const stockVisible = effectiveSettings?.stockVisible ?? true
  const showDualCurrency = user?.displayCurrency !== user?.invoiceCurrency

  // Track recently viewed
  useEffect(() => {
    if (productId) {
      addToRecentlyViewed(productId)
    }
  }, [productId, addToRecentlyViewed])

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="card p-12 text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin" style={{ color: 'var(--color-brand-primary)' }} />
          <p style={{ color: 'var(--color-text-secondary)' }}>Loading product...</p>
        </div>
      </div>
    )
  }

  if (!product || error) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="card p-12 text-center">
          <Package className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-text-tertiary)' }} />
          <p style={{ color: 'var(--color-text-primary)' }}>{error || 'Product not found'}</p>
          <Link href="/catalog" className="btn-primary mt-4 inline-flex">
            Back to Catalog
          </Link>
        </div>
      </div>
    )
  }

  // Price calculations
  const displayPrice = getDisplayPrice(product)
  const invoicePrice = getInvoicePrice(product)
  const displayTotal = displayPrice * quantity

  const handleAddToCart = () => {
    if (hasOptions) {
      setShowOptionsModal(true)
      return
    }
    
    addToCart(product, quantity)
    setAddedToCart(true)
    setTimeout(() => setAddedToCart(false), 2000)
  }

  const handleOptionsConfirm = (selectedOptions: SelectedProductOption[], priceModifier: number) => {
    setShowOptionsModal(false)
    addToCart(product, quantity, undefined, selectedOptions, priceModifier)
    setAddedToCart(true)
    setTimeout(() => setAddedToCart(false), 2000)
  }

  const handleFavoriteClick = () => {
    toggleFavorite(product.id)
  }

  const lowStock = product.stock <= 10 && product.stock > 0
  const outOfStock = product.stock === 0

  return (
    <div className="max-w-6xl mx-auto">
      {/* Back Link */}
      <Link 
        href="/catalog"
        className="inline-flex items-center gap-1 text-[13px] mb-6 hover:underline"
        style={{ color: 'var(--color-brand-primary)' }}
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Catalog
      </Link>

        {/* Product Detail */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Image */}
          <div 
            className="aspect-square rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid rgba(210, 210, 215, 0.3)' }}
          >
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.nameEn} className="w-full h-full object-cover rounded-2xl" />
            ) : (
              <Package className="w-24 h-24" style={{ color: 'var(--color-text-tertiary)' }} />
            )}
          </div>

          {/* Info */}
          <div>
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <p 
                  className="text-[13px] mb-1"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {product.ref}
                </p>
                <h1 
                  className="text-[24px] font-semibold leading-tight"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {product.nameEn}
                </h1>
                {product.nameCn && (
                  <p 
                    className="text-[15px] mt-1"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {product.nameCn}
                  </p>
                )}
              </div>
              {hasFavorites && (
                <button
                  onClick={handleFavoriteClick}
                  className="p-2 rounded-full transition-all hover:scale-110"
                  style={{ 
                    backgroundColor: favorite ? 'var(--color-error)' : 'var(--color-bg-tertiary)',
                  }}
                >
                  <Heart 
                    className={`w-5 h-5 ${favorite ? 'fill-white text-white' : ''}`}
                    style={{ color: favorite ? 'white' : 'var(--color-text-secondary)' }}
                  />
                </button>
              )}
            </div>

            {/* Category & Stock */}
            <div className="flex items-center gap-3 mb-6">
              <span 
                className="text-[12px] font-medium px-2.5 py-1 rounded-lg"
                style={{ 
                  backgroundColor: 'rgba(0, 113, 227, 0.1)',
                  color: 'var(--color-brand-primary)'
                }}
              >
                {product.category}
              </span>
              {stockVisible && (
                <span 
                  className="text-[12px] font-medium px-2.5 py-1 rounded-lg"
                  style={{ 
                    backgroundColor: outOfStock 
                      ? 'rgba(255, 59, 48, 0.1)' 
                      : lowStock 
                      ? 'rgba(255, 149, 0, 0.1)' 
                      : 'rgba(52, 199, 89, 0.1)',
                    color: outOfStock 
                      ? 'var(--color-error)' 
                      : lowStock 
                      ? 'var(--color-warning)' 
                      : 'var(--color-success)'
                  }}
                >
                  {outOfStock ? 'Out of Stock' : `${product.stock} in stock`}
                </span>
              )}
            </div>

            {/* Price */}
            <div className="mb-6">
              <p 
                className="text-[32px] font-semibold"
                style={{ color: 'var(--color-brand-primary)' }}
              >
                {displayCurrencySymbol}{formatNumber(displayPrice)}
              </p>
              {showDualCurrency && (
                <p 
                  className="text-[14px] mt-1"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Invoice price: {invoiceCurrencySymbol}{formatNumber(invoicePrice)} {user?.invoiceCurrency}
                </p>
              )}
            </div>

            {/* Description */}
            {product.descriptionEn && (
              <div className="mb-6">
                <p 
                  className="text-[14px] leading-relaxed"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {product.descriptionEn}
                </p>
              </div>
            )}

            {/* Specs */}
            <div 
              className="grid grid-cols-2 gap-4 p-4 rounded-xl mb-6"
              style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
            >
              {product.material && (
                <div>
                  <p className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
                    Material
                  </p>
                  <p className="text-[13px] font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    {product.material}
                  </p>
                </div>
              )}
              {product.weight && (
                <div>
                  <p className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
                    Weight
                  </p>
                  <p className="text-[13px] font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    {product.weight} kg
                  </p>
                </div>
              )}
              {product.hsCode && (
                <div>
                  <p className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
                    HS Code
                  </p>
                  <p className="text-[13px] font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    {product.hsCode}
                  </p>
                </div>
              )}
              {config?.features?.moqEnforced && (
                <div>
                  <p className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
                    MOQ
                  </p>
                  <p className="text-[13px] font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    {product.moq} units
                  </p>
                </div>
              )}
            </div>

            {/* Product Options Indicator */}
            {hasOptions && (
              <div 
                className="mb-4 p-4 rounded-xl"
                style={{ backgroundColor: 'rgba(0, 113, 227, 0.05)', border: '1px solid rgba(0, 113, 227, 0.2)' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Settings2 className="w-5 h-5" style={{ color: 'var(--color-brand-primary)' }} />
                  <span className="text-[14px] font-medium" style={{ color: 'var(--color-brand-primary)' }}>
                    This product has {productOptions.optionGroups.length} option{productOptions.optionGroups.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>
                  {productOptions.optionGroups.map(g => g.name).join(', ')} - Click &quot;Choose Options&quot; to select
                </p>
              </div>
            )}

            {/* Add to Cart */}
            {!outOfStock && (
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors hover:bg-gray-100"
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
                    value={quantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value)
                      setQuantity(isNaN(val) ? 1 : Math.max(1, val))
                    }}
                    className="w-20 h-10 text-center text-[15px] font-medium rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ 
                      backgroundColor: 'var(--color-bg-secondary)',
                      border: '1px solid rgba(210, 210, 215, 0.5)',
                      color: 'var(--color-text-primary)'
                    }}
                  />
                  <button 
                    onClick={() => setQuantity(q => q + 1)}
                    className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors hover:bg-gray-100"
                    style={{ 
                      backgroundColor: 'var(--color-bg-secondary)',
                      border: '1px solid rgba(210, 210, 215, 0.5)'
                    }}
                  >
                    <Plus className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
                  </button>
                </div>
                
                <button 
                  onClick={handleAddToCart}
                  disabled={addedToCart}
                  className="btn-primary flex-1 h-10"
                  style={{ 
                    backgroundColor: addedToCart ? 'var(--color-success)' : 'var(--color-brand-primary)'
                  }}
                >
                  {addedToCart ? (
                    <>
                      <Check className="w-4 h-4" />
                      Added to Cart
                    </>
                  ) : hasOptions ? (
                    <>
                      <Settings2 className="w-4 h-4" />
                      Choose Options
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-4 h-4" />
                      Add to Cart — {displayCurrencySymbol}{formatNumber(displayTotal)}
                    </>
                  )}
                </button>
              </div>
            )}

            {inCart > 0 && (
              <p 
                className="text-[13px] mb-6"
                style={{ color: 'var(--color-success)' }}
              >
                ✓ {inCart} already in your cart
              </p>
            )}

            {/* Info badges */}
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
                <span className="text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>
                  Ships from China
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
                <span className="text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>
                  Quality Guaranteed
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div>
            <h2 
              className="text-[17px] font-semibold mb-4"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Related Products
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      
      {/* Options Modal */}
      {showOptionsModal && product && (
        <ProductOptionSelector
          productName={product.nameEn}
          productImage={product.imageUrl}
          customFields={product.customFields}
          basePrice={displayPrice}
          currency={user?.displayCurrency || 'RMB'}
          onConfirm={handleOptionsConfirm}
          onCancel={() => setShowOptionsModal(false)}
        />
      )}
    </div>
  )
}