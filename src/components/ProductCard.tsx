'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useDistributor, SelectedProductOption, type Product } from '@/contexts/DistributorContext'
import { usePreferences, formatIndicativePrice } from '@/hooks/usePreferences'
import { Heart, ShoppingCart, Plus, Minus, Package, Info, Settings2 } from 'lucide-react'
import ProductOptionSelector from './ProductOptionSelector'
import { parseProductOptions } from '@/types/product-options'

type ViewMode = 'grid-small' | 'grid-medium' | 'grid-large'

interface ProductCardProps {
  product: Product
  viewMode?: ViewMode
}

export default function ProductCard({ product, viewMode = 'grid-large' }: ProductCardProps) {
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
  const [inputQty, setInputQty] = useState('1')
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

  const handleAddToCart = async (overrideQty?: number) => {
    if (hasOptions) {
      setShowOptionsModal(true)
      return
    }
    
    setIsAdding(true)
    addToCart(product, overrideQty ?? quantity)
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

  const incrementQty = () => {
    const next = quantity + 1
    setQuantity(next)
    setInputQty(String(next))
  }
  const decrementQty = () => {
    const next = Math.max(1, quantity - 1)
    setQuantity(next)
    setInputQty(String(next))
  }

  return (
    <div className="card group hover:shadow-lg transition-all duration-200 flex flex-col">
      {/* Image */}
      <Link href={`/catalog/${product.id}`}>
        <div 
          className="aspect-square rounded-t-2xl flex items-center justify-center relative overflow-hidden"
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
              className="w-12 h-12" 
              style={{ color: 'var(--color-text-tertiary)' }} 
            />
          )}
          
          {/* Stock Badge */}
          {effectiveSettings.stockVisible && (
            <div 
              className="absolute top-3 left-3 px-2 py-1 rounded-lg text-[11px] font-medium"
              style={{ 
                backgroundColor: product.stock > 10 
                  ? 'rgba(52, 199, 89, 0.9)' 
                  : product.stock > 0 
                    ? 'rgba(255, 149, 0, 0.9)' 
                    : 'rgba(255, 59, 48, 0.9)',
                color: 'white'
              }}
            >
              {product.stock > 10 ? 'In Stock' : product.stock > 0 ? `${product.stock} left` : 'Out of Stock'}
            </div>
          )}

          {/* Favorite Button */}
          {effectiveSettings.hasFavorites && (
            <button
              onClick={(e) => {
                e.preventDefault()
                toggleFavorite(product.id)
              }}
              className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all"
              style={{ 
                backgroundColor: favorite ? 'rgba(255, 59, 48, 0.1)' : 'rgba(255, 255, 255, 0.9)',
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
        </div>
      </Link>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        {/* Ref & Category */}
        <div className="flex items-center justify-between mb-1">
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
        </div>

        {/* Name */}
        <Link href={`/catalog/${product.id}`}>
          <h3 
            className="text-[14px] font-medium leading-tight mb-1 hover:underline line-clamp-2"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {product.nameEn}
          </h3>
        </Link>

        {/* Chinese Name */}
        {product.nameCn && (
          <p 
            className="text-[12px] mb-2"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {product.nameCn}
          </p>
        )}

        {/* Price */}
        <div className="mb-0">
          <div className="flex items-center gap-2">
            <p 
              className="text-[18px] font-semibold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {formatDisplayPrice(product)}
            </p>
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
          </div>
          
          {/* Indicative Prices */}
          {isLoaded && preferences.showIndicativePrice && preferences.indicativeCurrencies.length > 0 && (
            <div className="mt-1 space-y-0.5">
              {preferences.indicativeCurrencies.map(currency => (
                <p 
                  key={currency}
                  className="text-[11px] flex items-center gap-1"
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  <span>≈ {formatIndicativePrice(displayPrice, displayCurrency, currency)} {currency}</span>
                </p>
              ))}
              <p 
                className="text-[10px] flex items-center gap-1 mt-1"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                <Info className="w-3 h-3" />
                Indicative only
              </p>
            </div>
          )}
        </div>

        {/* Quantity & Add to Cart — toujours en bas, stepper dans toutes les vues */}
        <div className="mt-auto pt-3 flex items-center gap-2">
          {/* Stepper − / n / + : taille adaptée à la vue */}
          <div className={`qty-stepper flex items-center bg-[#f0f0f5] border border-[#d2d2d7]/60 overflow-hidden ${
            viewMode === 'grid-small'
              ? 'rounded-lg'
              : viewMode === 'grid-medium'
              ? 'rounded-xl'
              : 'rounded-xl'
          }`}>
            <button
              onClick={decrementQty}
              disabled={quantity <= 1}
              className={`flex items-center justify-center transition-colors ${
                viewMode === 'grid-small' ? 'w-6 h-7' : viewMode === 'grid-medium' ? 'w-7 h-8' : 'w-9 h-10'
              }`}
              style={{ color: '#1d1d1f' }}
            >
              <Minus className={viewMode === 'grid-small' ? 'w-3 h-3' : 'w-3.5 h-3.5'} strokeWidth={2.5} />
            </button>
            <input
              type="text"
              inputMode="numeric"
              value={inputQty}
              onChange={(e) => {
                const raw = e.target.value
                setInputQty(raw)
                const val = parseInt(raw, 10)
                if (!isNaN(val) && val >= 1) setQuantity(val)
              }}
              onBlur={() => {
                const val = parseInt(inputQty, 10)
                const valid = isNaN(val) || val < 1 ? 1 : val
                setQuantity(valid)
                setInputQty(String(valid))
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  const val = parseInt(inputQty, 10)
                  const valid = isNaN(val) || val < 1 ? 1 : val
                  setQuantity(valid)
                  setInputQty(String(valid))
                  handleAddToCart(valid)
                }
              }}
              className={`text-center font-semibold bg-transparent focus:outline-none flex-shrink-0 ${
                viewMode === 'grid-small' ? 'w-6 h-7 text-[12px]' : viewMode === 'grid-medium' ? 'w-7 h-8 text-[13px]' : 'w-10 h-10 text-[15px]'
              }`}
              style={{ color: '#1d1d1f' }}
            />
            <button
              onClick={incrementQty}
              className={`flex items-center justify-center transition-colors ${
                viewMode === 'grid-small' ? 'w-6 h-7' : viewMode === 'grid-medium' ? 'w-7 h-8' : 'w-9 h-10'
              }`}
              style={{ color: '#1d1d1f' }}
            >
              <Plus className={viewMode === 'grid-small' ? 'w-3 h-3' : 'w-3.5 h-3.5'} strokeWidth={2.5} />
            </button>
          </div>

          <button
            onClick={handleAddToCart}
            disabled={isAdding || product.stock === 0}
            className={`flex-1 rounded-xl flex items-center justify-center gap-1.5 font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 ${
              viewMode === 'grid-small' ? 'h-7 text-[11px]' : viewMode === 'grid-medium' ? 'h-8 text-[12px]' : 'h-10 text-[13px]'
            }`}
            style={{ backgroundColor: 'var(--color-brand-primary)' }}
          >
            {hasOptions ? (
              <>
                <Settings2 className={viewMode === 'grid-small' ? 'w-3 h-3' : 'w-4 h-4'} />
                {viewMode === 'grid-large' && (isAdding ? 'Adding...' : 'Options')}
              </>
            ) : (
              <>
                <ShoppingCart className={viewMode === 'grid-small' ? 'w-3 h-3' : 'w-4 h-4'} />
                {viewMode !== 'grid-small' && (isAdding ? '...' : 'Add')}
              </>
            )}
          </button>
        </div>
        
        {/* Options badge */}
        {hasOptions && (
          <div 
            className="mt-2 flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-lg"
            style={{ 
              backgroundColor: 'rgba(0, 113, 227, 0.1)',
              color: 'var(--color-brand-primary)'
            }}
          >
            <Settings2 className="w-3 h-3" />
            {productOptions.optionGroups.length} option{productOptions.optionGroups.length !== 1 ? 's' : ''} available
          </div>
        )}
      </div>
      
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