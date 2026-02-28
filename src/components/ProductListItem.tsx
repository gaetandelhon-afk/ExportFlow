'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useDistributor, SelectedProductOption, type Product } from '@/contexts/DistributorContext'
import { usePreferences, formatIndicativePrice } from '@/hooks/usePreferences'
import { Heart, ShoppingCart, Plus, Minus, Package, Settings2 } from 'lucide-react'
import ProductOptionSelector from './ProductOptionSelector'
import { parseProductOptions } from '@/types/product-options'

interface ProductListItemProps {
  product: Product
}

export default function ProductListItem({ product }: ProductListItemProps) {
  const { 
    addToCart, 
    toggleFavorite, 
    isFavorite, 
    effectiveSettings,
    formatDisplayPrice,
    getDisplayPrice,
    user,
    cart
  } = useDistributor()
  
  const { preferences, isLoaded } = usePreferences()
  const [quantity, setQuantity] = useState(1)
  const [isAdding, setIsAdding] = useState(false)
  const [showOptionsModal, setShowOptionsModal] = useState(false)

  const favorite = isFavorite(product.id)
  const displayPrice = getDisplayPrice(product)
  const displayCurrency = user?.displayCurrency || 'RMB'

  // Check if product has options
  const productOptions = parseProductOptions(product.customFields)
  const hasOptions = productOptions.optionGroups.length > 0

  // Check quantity already in cart
  const inCartQuantity = cart.filter(item => item.product.id === product.id).reduce((sum, item) => sum + item.quantity, 0)

  const handleAddToCart = async () => {
    if (hasOptions) {
      setShowOptionsModal(true)
      return
    }
    
    setIsAdding(true)
    addToCart(product, quantity)
    await new Promise(resolve => setTimeout(resolve, 300))
    setIsAdding(false)
  }

  const handleOptionsConfirm = async (selectedOptions: SelectedProductOption[], priceModifier: number) => {
    setShowOptionsModal(false)
    setIsAdding(true)
    addToCart(product, quantity, undefined, selectedOptions, priceModifier)
    await new Promise(resolve => setTimeout(resolve, 300))
    setIsAdding(false)
  }

  const incrementQty = () => setQuantity(q => q + 1)
  const decrementQty = () => setQuantity(q => Math.max(1, q - 1))

  return (
    <div className="card p-4 flex items-center gap-4 hover:shadow-md transition-all">
      {/* Image */}
      <Link href={`/catalog/${product.id}`} className="shrink-0">
        <div 
          className="w-20 h-20 rounded-xl flex items-center justify-center overflow-hidden relative"
          style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
        >
          {product.imageUrl ? (
            <Image 
              src={product.imageUrl} 
              alt={product.nameEn}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <Package 
              className="w-8 h-8" 
              style={{ color: 'var(--color-text-tertiary)' }} 
            />
          )}
        </div>
      </Link>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span 
            className="text-[11px] font-medium"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            {product.ref}
          </span>
          <span 
            className="text-[10px] px-2 py-0.5 rounded-full"
            style={{ 
              backgroundColor: 'var(--color-bg-tertiary)',
              color: 'var(--color-text-secondary)'
            }}
          >
            {product.category}
          </span>
          {effectiveSettings.stockVisible && (
            <span 
              className="text-[10px] px-2 py-0.5 rounded-full"
              style={{ 
                backgroundColor: product.stock > 10 
                  ? 'rgba(52, 199, 89, 0.1)' 
                  : product.stock > 0 
                    ? 'rgba(255, 149, 0, 0.1)' 
                    : 'rgba(255, 59, 48, 0.1)',
                color: product.stock > 10 
                  ? 'var(--color-success)' 
                  : product.stock > 0 
                    ? 'var(--color-warning)' 
                    : 'var(--color-error)'
              }}
            >
              {product.stock > 10 ? 'In Stock' : product.stock > 0 ? `${product.stock} left` : 'Out of Stock'}
            </span>
          )}
        </div>

        <Link href={`/catalog/${product.id}`}>
          <h3 
            className="text-[14px] font-medium hover:underline truncate"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {product.nameEn}
          </h3>
        </Link>

        {product.nameCn && (
          <p 
            className="text-[12px] truncate"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {product.nameCn}
          </p>
        )}
      </div>

      {/* Price */}
      <div className="text-right shrink-0">
        <div className="flex items-center justify-end gap-2">
          {inCartQuantity > 0 && (
            <span 
              className="text-[10px] font-medium px-1.5 py-0.5 rounded"
              style={{ 
                backgroundColor: 'rgba(52, 199, 89, 0.1)',
                color: 'var(--color-success)'
              }}
            >
              {inCartQuantity} in cart
            </span>
          )}
          <p 
            className="text-[18px] font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {formatDisplayPrice(product)}
          </p>
        </div>
        
        {/* Indicative Prices - Affiche toutes les devises sélectionnées */}
        {isLoaded && preferences.showIndicativePrice && preferences.indicativeCurrencies.length > 0 && (
          <div className="mt-0.5">
            {preferences.indicativeCurrencies.map(currency => (
              <p 
                key={currency}
                className="text-[10px]"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                ≈ {formatIndicativePrice(displayPrice, displayCurrency, currency)}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {effectiveSettings.hasFavorites && (
          <button
            onClick={() => toggleFavorite(product.id)}
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
            style={{ 
              backgroundColor: favorite ? 'rgba(255, 59, 48, 0.1)' : 'var(--color-bg-tertiary)',
            }}
          >
            <Heart 
              className="w-4 h-4" 
              style={{ 
                color: favorite ? 'var(--color-error)' : 'var(--color-text-tertiary)',
                fill: favorite ? 'var(--color-error)' : 'none'
              }} 
            />
          </button>
        )}

        <div 
          className="flex items-center rounded-lg overflow-hidden"
          style={{ border: '1px solid rgba(210, 210, 215, 0.5)' }}
        >
          <button
            onClick={decrementQty}
            className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 transition-colors"
            disabled={quantity <= 1}
          >
            <Minus className="w-3 h-3" style={{ color: 'var(--color-text-secondary)' }} />
          </button>
          <input
            type="text"
            inputMode="numeric"
            value={quantity}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10)
              if (!isNaN(val) && val >= 1) setQuantity(val)
              else if (e.target.value === '') setQuantity(1)
            }}
            onBlur={(e) => {
              if (!e.target.value || parseInt(e.target.value, 10) < 1) setQuantity(1)
            }}
            className="w-8 text-center text-[12px] font-medium bg-transparent outline-none"
            style={{ color: 'var(--color-text-primary)' }}
          />
          <button
            onClick={incrementQty}
            className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            <Plus className="w-3 h-3" style={{ color: 'var(--color-text-secondary)' }} />
          </button>
        </div>

        <button
          onClick={handleAddToCart}
          disabled={isAdding || product.stock === 0}
          className="h-9 px-4 rounded-lg flex items-center justify-center gap-1.5 text-[12px] font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-brand-primary)' }}
        >
          {hasOptions ? (
            <>
              <Settings2 className="w-3.5 h-3.5" />
              {isAdding ? '...' : 'Options'}
            </>
          ) : (
            <>
              <ShoppingCart className="w-3.5 h-3.5" />
              {isAdding ? '...' : 'Add'}
            </>
          )}
        </button>
      </div>
      
      {/* Options badge */}
      {hasOptions && (
        <div 
          className="shrink-0 flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg"
          style={{ 
            backgroundColor: 'rgba(0, 113, 227, 0.1)',
            color: 'var(--color-brand-primary)'
          }}
        >
          <Settings2 className="w-3 h-3" />
          Options
        </div>
      )}
      
      {/* Options Modal */}
      {showOptionsModal && (
        <ProductOptionSelector
          productName={product.nameEn}
          productImage={product.imageUrl}
          customFields={product.customFields}
          basePrice={displayPrice}
          currency={displayCurrency}
          onConfirm={handleOptionsConfirm}
          onCancel={() => setShowOptionsModal(false)}
        />
      )}
    </div>
  )
}