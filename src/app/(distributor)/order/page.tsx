'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { 
  Loader2, Plus, Minus, Trash2, Settings2,
  Search, ChevronRight, ShoppingCart, Package, Filter,
  Grid3X3, Grid2X2, LayoutGrid, List, X, Folder,
  Heart, ArrowRight
} from 'lucide-react'
import { useDistributor, Product, SelectedProductOption } from '@/contexts/DistributorContext'
import { usePreview } from '@/contexts/PreviewContext'
import ProductOptionSelector from '@/components/ProductOptionSelector'
import { parseProductOptions } from '@/types/product-options'
import { formatNumber } from '@/lib/utils'

type ViewMode = 'list' | 'grid-small' | 'grid-medium' | 'grid-large'

interface Category {
  id: string
  name: string
  parentId: string | null
  isParent?: boolean
  hasChildren?: boolean
  children?: { id: string; nameEn: string }[]
  productCount?: number
}

const viewModes: { mode: ViewMode; icon: typeof List; label: string }[] = [
  { mode: 'list', icon: List, label: 'List' },
  { mode: 'grid-small', icon: Grid3X3, label: 'Small' },
  { mode: 'grid-medium', icon: Grid2X2, label: 'Medium' },
  { mode: 'grid-large', icon: LayoutGrid, label: 'Large' },
]

export default function OrderPage() {
  const router = useRouter()
  const { isPreviewMode, previewCustomer } = usePreview()
  const {
    cart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    getCartTotal,
    getCartItemCount,
    favorites,
    toggleFavorite,
    isFavorite,
    effectiveSettings,
    formatDisplayPrice,
    getDisplayPrice,
    displayCurrencySymbol,
  } = useDistributor()

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [viewMode, setViewMode] = useState<ViewMode>('grid-medium')
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  
  const [productQuantities, setProductQuantities] = useState<Record<string, number>>({})
  const [inputQuantities, setInputQuantities] = useState<Record<string, string>>({})
  const [showMobileCart, setShowMobileCart] = useState(false)
  
  const [showOptionsModal, setShowOptionsModal] = useState(false)
  const [selectedProductForOptions, setSelectedProductForOptions] = useState<Product | null>(null)

  const loadProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.set('search', searchQuery)
      if (selectedCategory) params.set('categoryId', selectedCategory)
      if (isPreviewMode && previewCustomer?.id) {
        params.set('previewCustomerId', previewCustomer.id)
      }
      
      const res = await fetch(`/api/distributor/products?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setProducts(data.products || [])
        setCategories(data.categories || [])
      }
    } catch (error) {
      console.error('Error loading products:', error)
    } finally {
      setLoading(false)
    }
  }, [searchQuery, selectedCategory, isPreviewMode, previewCustomer])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  useEffect(() => {
    const saved = localStorage.getItem('order_view_mode')
    if (saved && ['list', 'grid-small', 'grid-medium', 'grid-large'].includes(saved)) {
      setViewMode(saved as ViewMode)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('order_view_mode', viewMode)
  }, [viewMode])

  const parentCategories = useMemo(() => {
    return categories.filter(c => c.isParent || !c.parentId)
  }, [categories])

  const subcategories = useMemo(() => {
    if (!selectedCategory) return []
    const parent = categories.find(c => c.id === selectedCategory)
    if (parent?.hasChildren) {
      return categories.filter(c => c.parentId === selectedCategory)
    }
    return []
  }, [categories, selectedCategory])

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesFavorites = !showFavoritesOnly || favorites.includes(product.id)
      return matchesFavorites
    })
  }, [products, showFavoritesOnly, favorites])

  const getProductQuantity = (productId: string) => productQuantities[productId] || 1
  const setProductQuantity = (productId: string, qty: number) => {
    const validQty = Math.max(1, qty)
    setProductQuantities(prev => ({ ...prev, [productId]: validQty }))
    setInputQuantities(prev => ({ ...prev, [productId]: String(validQty) }))
  }
  const getInputQty = (productId: string) =>
    inputQuantities[productId] ?? String(productQuantities[productId] || 1)
  const handleQtyInputChange = (productId: string, raw: string) => {
    setInputQuantities(prev => ({ ...prev, [productId]: raw }))
    const val = parseInt(raw, 10)
    if (!isNaN(val) && val >= 1) setProductQuantities(prev => ({ ...prev, [productId]: val }))
  }
  const handleQtyInputBlur = (productId: string) => {
    const val = parseInt(inputQuantities[productId] || '', 10)
    const validQty = isNaN(val) || val < 1 ? (productQuantities[productId] || 1) : val
    setProductQuantities(prev => ({ ...prev, [productId]: validQty }))
    setInputQuantities(prev => ({ ...prev, [productId]: String(validQty) }))
  }

  const productHasOptions = (product: Product): boolean => {
    const options = parseProductOptions(product.customFields)
    return options.optionGroups.length > 0
  }

  const handleProductClick = (product: Product, overrideQty?: number) => {
    const qty = overrideQty ?? getProductQuantity(product.id)
    if (productHasOptions(product)) {
      setSelectedProductForOptions(product)
      setShowOptionsModal(true)
    } else {
      addToCart(product, qty)
      setProductQuantities(prev => ({ ...prev, [product.id]: 1 }))
      setInputQuantities(prev => ({ ...prev, [product.id]: '1' }))
    }
  }

  const handleOptionsConfirm = (selectedOptions: SelectedProductOption[], totalPriceModifier: number) => {
    if (selectedProductForOptions) {
      const qty = getProductQuantity(selectedProductForOptions.id)
      addToCart(selectedProductForOptions, qty, undefined, selectedOptions, totalPriceModifier)
      setProductQuantities(prev => ({ ...prev, [selectedProductForOptions.id]: 1 }))
      setShowOptionsModal(false)
      setSelectedProductForOptions(null)
    }
  }

  const getInCartQuantity = (productId: string): number => {
    return cart.filter(item => item.product.id === productId).reduce((sum, item) => sum + item.quantity, 0)
  }

  const total = getCartTotal()
  const cartItemCount = getCartItemCount()

  const getGridClasses = () => {
    switch (viewMode) {
      case 'list':
        return 'flex flex-col gap-2'
      case 'grid-small':
        return 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3'
      case 'grid-medium':
        return 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4'
      case 'grid-large':
        return 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5'
      default:
        return 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4'
    }
  }

  const formatPrice = (amount: number) => `${displayCurrencySymbol}${formatNumber(amount)}`

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
      {/* Header */}
      <header 
        className="bg-white backdrop-blur-xl border-b border-[#d2d2d7]/30 sticky top-0 z-40"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="h-14 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link 
                href="/catalog" 
                className="flex items-center gap-1 text-[13px]"
                style={{ color: 'var(--color-brand-primary)' }}
              >
                <Package className="w-4 h-4" />
                <span className="hidden sm:inline">Catalog</span>
              </Link>
              <h1 
                className="text-[17px] font-semibold"
                style={{ color: 'var(--color-text-primary)' }}
              >
                New Order
              </h1>
            </div>

            <button
              onClick={() => setShowMobileCart(true)}
              className="lg:hidden relative h-10 w-10 text-white rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'var(--color-brand-primary)' }}
            >
              <ShoppingCart className="w-5 h-5" />
              {cartItemCount > 0 && (
                <span 
                  className="absolute -top-1 -right-1 w-5 h-5 text-white text-[11px] font-bold rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'var(--color-error)' }}
                >
                  {cartItemCount > 99 ? '99+' : cartItemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex gap-6">
          {/* Main Content - Products */}
          <main className="flex-1 min-w-0">
            {/* Filters Bar */}
            <div 
              className="rounded-2xl p-3 sm:p-4 mb-6"
              style={{ 
                backgroundColor: 'var(--color-bg-primary)',
                border: '1px solid rgba(210, 210, 215, 0.3)'
              }}
            >
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search 
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                    style={{ color: 'var(--color-text-secondary)' }}
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search products..."
                    className="w-full h-10 pl-10 pr-4 border-0 rounded-xl text-[14px] focus:outline-none focus:ring-2"
                    style={{ 
                      backgroundColor: 'var(--color-bg-tertiary)',
                      color: 'var(--color-text-primary)'
                    }}
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

                {effectiveSettings.hasFavorites && favorites.length > 0 && (
                  <button
                    onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                    className="h-10 px-3 rounded-xl text-[13px] font-medium flex items-center gap-2 transition-colors"
                    style={{ 
                      backgroundColor: showFavoritesOnly ? 'rgba(255, 59, 48, 0.1)' : 'var(--color-bg-tertiary)',
                      color: showFavoritesOnly ? 'var(--color-error)' : 'var(--color-text-primary)'
                    }}
                  >
                    <Heart 
                      className="w-4 h-4" 
                      style={{ fill: showFavoritesOnly ? 'var(--color-error)' : 'none' }}
                    />
                    Favorites
                  </button>
                )}

                <div 
                  className="flex items-center gap-1 rounded-xl p-1"
                  style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
                >
                  {viewModes.map(({ mode, icon: Icon, label }) => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      title={label}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
                        viewMode === mode ? 'bg-white shadow-sm' : 'hover:bg-white/50'
                      }`}
                    >
                      <Icon 
                        className="w-4 h-4"
                        style={{ color: viewMode === mode ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Categories */}
            {parentCategories.length > 0 && (
              <div className="space-y-3 mb-6">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCategory('')}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium whitespace-nowrap transition-all"
                    style={{ 
                      backgroundColor: !selectedCategory ? 'var(--color-brand-primary)' : 'var(--color-bg-primary)',
                      color: !selectedCategory ? 'white' : 'var(--color-text-primary)',
                      border: !selectedCategory ? 'none' : '1px solid rgba(210, 210, 215, 0.3)'
                    }}
                  >
                    All Products
                    <span 
                      className="px-1.5 py-0.5 rounded text-[11px]"
                      style={{ backgroundColor: !selectedCategory ? 'rgba(255,255,255,0.2)' : 'var(--color-bg-tertiary)' }}
                    >
                      {products.length}
                    </span>
                  </button>
                  {parentCategories.map(cat => {
                    const isSelected = selectedCategory === cat.id
                    const totalProducts = (cat.productCount || 0) + 
                      (cat.children?.reduce((sum, child) => {
                        const childCat = categories.find(c => c.id === child.id)
                        return sum + (childCat?.productCount || 0)
                      }, 0) || 0)
                    
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium whitespace-nowrap transition-all"
                        style={{ 
                          backgroundColor: isSelected ? 'var(--color-brand-primary)' : 'var(--color-bg-primary)',
                          color: isSelected ? 'white' : 'var(--color-text-primary)',
                          border: isSelected ? 'none' : '1px solid rgba(210, 210, 215, 0.3)'
                        }}
                      >
                        <Folder className="w-4 h-4" />
                        {cat.name}
                        {cat.hasChildren && (
                          <ChevronRight 
                            className="w-3 h-3 transition-transform"
                            style={{ transform: isSelected ? 'rotate(90deg)' : 'none' }}
                          />
                        )}
                        <span 
                          className="px-1.5 py-0.5 rounded text-[11px]"
                          style={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : 'var(--color-bg-tertiary)' }}
                        >
                          {totalProducts}
                        </span>
                      </button>
                    )
                  })}
                </div>

                {subcategories.length > 0 && (
                  <div 
                    className="flex flex-wrap gap-2 pl-4"
                    style={{ borderLeft: '2px solid var(--color-brand-primary)' }}
                  >
                    {subcategories.map(subcat => (
                      <button
                        key={subcat.id}
                        onClick={() => setSelectedCategory(subcat.id)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-medium whitespace-nowrap transition-all"
                        style={{ 
                          backgroundColor: selectedCategory === subcat.id ? 'rgba(0, 113, 227, 0.1)' : 'var(--color-bg-tertiary)',
                          color: selectedCategory === subcat.id ? 'var(--color-brand-primary)' : 'var(--color-text-primary)'
                        }}
                      >
                        {subcat.name}
                        <span 
                          className="px-1 py-0.5 rounded text-[10px]"
                          style={{ backgroundColor: 'rgba(255,255,255,0.5)' }}
                        >
                          {subcat.productCount || 0}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Products count */}
            <div className="mb-4 text-[14px]" style={{ color: 'var(--color-text-secondary)' }}>
              {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
            </div>

            {/* Products Grid */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 
                  className="w-8 h-8 animate-spin"
                  style={{ color: 'var(--color-brand-primary)' }}
                />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div 
                className="rounded-2xl p-12 text-center"
                style={{ 
                  backgroundColor: 'var(--color-bg-primary)',
                  border: '1px solid rgba(210, 210, 215, 0.3)'
                }}
              >
                <Package className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-text-tertiary)' }} />
                <p className="text-[15px] font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  No products found
                </p>
                <p className="text-[14px] mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                  Try adjusting your search or filters
                </p>
              </div>
            ) : (
              <div className={getGridClasses()}>
                {filteredProducts.map((product) => {
                  const hasOptions = productHasOptions(product)
                  const inCartQty = getInCartQuantity(product.id)
                  const qty = getProductQuantity(product.id)
                  const displayPrice = getDisplayPrice(product)

                  if (viewMode === 'list') {
                    return (
                      <div
                        key={product.id}
                        className="rounded-xl p-3 transition-all flex items-center gap-3"
                        style={{ 
                          backgroundColor: 'var(--color-bg-primary)',
                          border: inCartQty > 0 
                            ? '1px solid var(--color-brand-primary)' 
                            : '1px solid rgba(210, 210, 215, 0.3)'
                        }}
                      >
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden relative"
                          style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
                        >
                          {product.imageUrl ? (
                            <Image src={product.imageUrl} alt={product.nameEn} width={40} height={40} className="object-cover" unoptimized />
                          ) : (
                            <Package className="w-5 h-5" style={{ color: 'var(--color-text-tertiary)' }} />
                          )}
                        </div>
                        
                        <div className="w-20 flex-shrink-0">
                          <p className="text-[11px] font-mono truncate" style={{ color: 'var(--color-text-secondary)' }}>
                            {product.ref}
                          </p>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                            {product.nameEn}
                          </p>
                        </div>
                        
                        {hasOptions && (
                          <span 
                            className="hidden sm:inline-block text-[10px] font-medium px-2 py-1 rounded"
                            style={{ backgroundColor: 'rgba(255, 149, 0, 0.1)', color: 'var(--color-warning)' }}
                          >
                            Options
                          </span>
                        )}
                        
                        {inCartQty > 0 && (
                          <span 
                            className="text-[10px] font-medium px-2 py-1 rounded"
                            style={{ backgroundColor: 'rgba(52, 199, 89, 0.1)', color: 'var(--color-success)' }}
                          >
                            {inCartQty} in cart
                          </span>
                        )}
                        
                        <p 
                          className="text-[14px] font-semibold flex-shrink-0 w-20 text-right"
                          style={{ color: 'var(--color-brand-primary)' }}
                        >
                          {formatPrice(displayPrice)}
                        </p>
                        
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div 
                            className="flex items-center rounded-lg overflow-hidden"
                            style={{ border: '1px solid rgba(210, 210, 215, 0.5)' }}
                          >
                            <button
                              onClick={() => setProductQuantity(product.id, qty - 1)}
                              className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 transition-colors"
                              disabled={qty <= 1}
                            >
                              <Minus className="w-3 h-3" style={{ color: 'var(--color-text-secondary)' }} />
                            </button>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={getInputQty(product.id)}
                              onChange={(e) => handleQtyInputChange(product.id, e.target.value)}
                              onBlur={() => handleQtyInputBlur(product.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  const val = parseInt(getInputQty(product.id), 10)
                                  const valid = isNaN(val) || val < 1 ? 1 : val
                                  handleQtyInputBlur(product.id)
                                  handleProductClick(product, valid)
                                }
                              }}
                              className="w-10 h-8 text-center text-[12px] font-medium bg-transparent outline-none"
                              style={{ color: 'var(--color-text-primary)' }}
                            />
                            <button
                              onClick={() => setProductQuantity(product.id, qty + 1)}
                              className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 transition-colors"
                            >
                              <Plus className="w-3 h-3" style={{ color: 'var(--color-text-secondary)' }} />
                            </button>
                          </div>
                          
                          <button
                            onClick={() => handleProductClick(product)}
                            className="h-8 px-3 rounded-lg text-[12px] font-medium text-white transition-all hover:opacity-90 flex items-center gap-1"
                            style={{ backgroundColor: 'var(--color-brand-primary)' }}
                          >
                            {hasOptions ? <Settings2 className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                            Add
                          </button>
                        </div>
                      </div>
                    )
                  }

                  return (
                    <div
                      key={product.id}
                      className="rounded-xl overflow-hidden transition-all hover:shadow-lg"
                      style={{ 
                        backgroundColor: 'var(--color-bg-primary)',
                        border: inCartQty > 0 
                          ? '2px solid var(--color-brand-primary)' 
                          : '1px solid rgba(210, 210, 215, 0.3)'
                      }}
                    >
                      {inCartQty > 0 && (
                        <div 
                          className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full text-white text-[11px] font-bold flex items-center justify-center"
                          style={{ backgroundColor: 'var(--color-brand-primary)' }}
                        >
                          {inCartQty}
                        </div>
                      )}
                      
                      <div 
                        className="aspect-square flex items-center justify-center relative"
                        style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
                      >
                        {product.imageUrl ? (
                          <Image src={product.imageUrl} alt={product.nameEn} fill className="object-cover" unoptimized />
                        ) : (
                          <Package 
                            className={viewMode === 'grid-small' ? 'w-8 h-8' : 'w-12 h-12'} 
                            style={{ color: 'var(--color-text-tertiary)' }}
                          />
                        )}
                        
                        {effectiveSettings.hasFavorites && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleFavorite(product.id)
                            }}
                            className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: 'rgba(255, 255, 255, 0.9)' }}
                          >
                            <Heart 
                              className="w-4 h-4" 
                              style={{ 
                                color: isFavorite(product.id) ? 'var(--color-error)' : 'var(--color-text-tertiary)',
                                fill: isFavorite(product.id) ? 'var(--color-error)' : 'none'
                              }}
                            />
                          </button>
                        )}
                      </div>
                      
                      <div className={viewMode === 'grid-small' ? 'p-2' : 'p-3'}>
                        <p 
                          className={`font-mono truncate ${viewMode === 'grid-small' ? 'text-[9px]' : 'text-[11px]'}`}
                          style={{ color: 'var(--color-text-tertiary)' }}
                        >
                          {product.ref}
                        </p>
                        <p 
                          className={`font-medium line-clamp-2 ${viewMode === 'grid-small' ? 'text-[11px]' : 'text-[13px]'}`}
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          {product.nameEn}
                        </p>
                        
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1">
                            {inCartQty > 0 && (
                              <span 
                                className="text-[9px] font-medium px-1.5 py-0.5 rounded"
                                style={{ backgroundColor: 'rgba(52, 199, 89, 0.1)', color: 'var(--color-success)' }}
                              >
                                {inCartQty}
                              </span>
                            )}
                            <p 
                              className={`font-semibold ${viewMode === 'grid-small' ? 'text-[12px]' : 'text-[15px]'}`}
                              style={{ color: 'var(--color-brand-primary)' }}
                            >
                              {formatPrice(displayPrice)}
                            </p>
                          </div>
                          {hasOptions && (
                            <Settings2 
                              className="w-3.5 h-3.5"
                              style={{ color: 'var(--color-warning)' }}
                            />
                          )}
                        </div>
                        
                        {/* Stepper − / n / + dans toutes les vues, taille adaptée */}
                        <div className="flex items-center gap-1 mt-2">
                          <div 
                            className={`flex items-center overflow-hidden flex-1 ${viewMode === 'grid-small' ? 'rounded-md' : 'rounded-lg'}`}
                            style={{ border: '1px solid rgba(210, 210, 215, 0.5)' }}
                          >
                            <button
                              onClick={() => setProductQuantity(product.id, qty - 1)}
                              className={`flex items-center justify-center hover:bg-gray-100 flex-shrink-0 ${viewMode === 'grid-small' ? 'w-5 h-6' : 'w-7 h-7'}`}
                              disabled={qty <= 1}
                            >
                              <Minus className={viewMode === 'grid-small' ? 'w-2 h-2' : 'w-2.5 h-2.5'} style={{ color: 'var(--color-text-secondary)' }} />
                            </button>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={getInputQty(product.id)}
                              onChange={(e) => handleQtyInputChange(product.id, e.target.value)}
                              onBlur={() => handleQtyInputBlur(product.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  const val = parseInt(getInputQty(product.id), 10)
                                  const valid = isNaN(val) || val < 1 ? 1 : val
                                  handleQtyInputBlur(product.id)
                                  handleProductClick(product, valid)
                                }
                              }}
                              className={`text-center font-medium bg-transparent outline-none flex-1 min-w-0 ${viewMode === 'grid-small' ? 'text-[11px] h-6' : 'text-[12px] h-7'}`}
                              style={{ color: 'var(--color-text-primary)' }}
                            />
                            <button
                              onClick={() => setProductQuantity(product.id, qty + 1)}
                              className={`flex items-center justify-center hover:bg-gray-100 flex-shrink-0 ${viewMode === 'grid-small' ? 'w-5 h-6' : 'w-7 h-7'}`}
                            >
                              <Plus className={viewMode === 'grid-small' ? 'w-2 h-2' : 'w-2.5 h-2.5'} style={{ color: 'var(--color-text-secondary)' }} />
                            </button>
                          </div>
                          <button
                            onClick={() => handleProductClick(product)}
                            className={`rounded-lg text-white font-medium flex items-center justify-center gap-1 flex-shrink-0 ${viewMode === 'grid-small' ? 'h-6 px-1.5 text-[10px]' : 'h-7 px-2 text-[11px]'}`}
                            style={{ backgroundColor: 'var(--color-brand-primary)' }}
                          >
                            {hasOptions ? <Settings2 className={viewMode === 'grid-small' ? 'w-2.5 h-2.5' : 'w-3 h-3'} /> : <Plus className={viewMode === 'grid-small' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />}
                            {viewMode !== 'grid-small' && 'Add'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </main>

          {/* Cart Sidebar - Desktop */}
          <aside 
            className="hidden lg:block w-80 flex-shrink-0"
          >
            <div 
              className="sticky top-20 rounded-2xl overflow-hidden"
              style={{ 
                backgroundColor: 'var(--color-bg-primary)',
                border: '1px solid rgba(210, 210, 215, 0.3)'
              }}
            >
              <div className="p-4 border-b" style={{ borderColor: 'rgba(210, 210, 215, 0.3)' }}>
                <div className="flex items-center justify-between">
                  <h2 className="text-[15px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    Cart ({cartItemCount})
                  </h2>
                  {cart.length > 0 && (
                    <button 
                      onClick={clearCart}
                      className="text-[12px]"
                      style={{ color: 'var(--color-error)' }}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div className="max-h-[400px] overflow-y-auto p-4 space-y-3">
                {cart.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart className="w-10 h-10 mx-auto mb-2" style={{ color: 'var(--color-text-tertiary)' }} />
                    <p className="text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
                      Your cart is empty
                    </p>
                  </div>
                ) : (
                  cart.map((item, index) => {
                    const basePrice = getDisplayPrice(item.product)
                    const optionsPrice = item.optionsPriceModifier || 0
                    const itemPrice = basePrice + optionsPrice
                    const itemKey = item.selectedOptions && item.selectedOptions.length > 0
                      ? `${item.product.id}-${item.selectedOptions.map(o => o.optionId).join('-')}`
                      : `${item.product.id}-${index}`

                    return (
                      <div 
                        key={itemKey}
                        className="flex gap-3 p-2 rounded-lg"
                        style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
                      >
                        <div 
                          className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden relative"
                          style={{ backgroundColor: 'var(--color-bg-secondary)' }}
                        >
                          {item.product.imageUrl ? (
                            <Image src={item.product.imageUrl} alt="" width={48} height={48} className="object-cover" unoptimized />
                          ) : (
                            <Package className="w-5 h-5" style={{ color: 'var(--color-text-tertiary)' }} />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                            {item.product.nameEn}
                          </p>
                          <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                            {formatPrice(itemPrice)} × {item.quantity}
                          </p>
                          {item.selectedOptions && item.selectedOptions.length > 0 && (
                            <p className="text-[10px] truncate" style={{ color: 'var(--color-text-tertiary)' }}>
                              {item.selectedOptions.map(o => o.optionName).join(', ')}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex flex-col items-end gap-1">
                          <p className="text-[12px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                            {formatPrice(itemPrice * item.quantity)}
                          </p>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => updateCartItem(item.product.id, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                              className="w-5 h-5 rounded flex items-center justify-center"
                              style={{ backgroundColor: 'var(--color-bg-secondary)' }}
                            >
                              <Minus className="w-2.5 h-2.5" style={{ color: 'var(--color-text-secondary)' }} />
                            </button>
                            <span className="text-[11px] w-5 text-center" style={{ color: 'var(--color-text-primary)' }}>
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateCartItem(item.product.id, item.quantity + 1)}
                              className="w-5 h-5 rounded flex items-center justify-center"
                              style={{ backgroundColor: 'var(--color-bg-secondary)' }}
                            >
                              <Plus className="w-2.5 h-2.5" style={{ color: 'var(--color-text-secondary)' }} />
                            </button>
                            <button
                              onClick={() => removeFromCart(item.product.id, item.selectedOptions)}
                              className="w-5 h-5 rounded flex items-center justify-center ml-1"
                            >
                              <Trash2 className="w-3 h-3" style={{ color: 'var(--color-error)' }} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {cart.length > 0 && (
                <div className="p-4 border-t" style={{ borderColor: 'rgba(210, 210, 215, 0.3)' }}>
                  <div className="flex justify-between mb-4">
                    <span className="text-[14px]" style={{ color: 'var(--color-text-secondary)' }}>Total</span>
                    <span className="text-[18px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      {formatPrice(total)}
                    </span>
                  </div>
                  
                  <Link 
                    href="/checkout"
                    className="w-full h-10 rounded-xl text-white font-medium flex items-center justify-center gap-2 transition-all hover:opacity-90"
                    style={{ backgroundColor: 'var(--color-brand-primary)' }}
                  >
                    Checkout
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  
                  <Link 
                    href="/checkout?quote=true"
                    className="w-full h-10 rounded-xl font-medium flex items-center justify-center gap-2 mt-2 transition-all"
                    style={{ 
                      backgroundColor: 'var(--color-bg-tertiary)',
                      color: 'var(--color-text-primary)'
                    }}
                  >
                    Generate Quote
                  </Link>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile Cart Modal */}
      {showMobileCart && (
        <div className="fixed inset-0 bg-black/50 z-50 lg:hidden">
          <div 
            className="absolute right-0 top-0 bottom-0 w-full max-w-md overflow-y-auto"
            style={{ backgroundColor: 'var(--color-bg-primary)' }}
          >
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'rgba(210, 210, 215, 0.3)' }}>
              <h2 className="text-[17px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                Cart ({cartItemCount})
              </h2>
              <button onClick={() => setShowMobileCart(false)}>
                <X className="w-6 h-6" style={{ color: 'var(--color-text-secondary)' }} />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--color-text-tertiary)' }} />
                  <p className="text-[15px]" style={{ color: 'var(--color-text-secondary)' }}>
                    Your cart is empty
                  </p>
                </div>
              ) : (
                cart.map((item, index) => {
                  const basePrice = getDisplayPrice(item.product)
                  const optionsPrice = item.optionsPriceModifier || 0
                  const itemPrice = basePrice + optionsPrice
                  const itemKey = `mobile-${item.product.id}-${index}`

                  return (
                    <div 
                      key={itemKey}
                      className="flex gap-3 p-3 rounded-xl"
                      style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
                    >
                      <div 
                        className="w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: 'var(--color-bg-secondary)' }}
                      >
                        <Package className="w-6 h-6" style={{ color: 'var(--color-text-tertiary)' }} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium" style={{ color: 'var(--color-text-primary)' }}>
                          {item.product.nameEn}
                        </p>
                        <p className="text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>
                          {formatPrice(itemPrice)} each
                        </p>
                        
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateCartItem(item.product.id, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                              className="w-7 h-7 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: 'var(--color-bg-secondary)' }}
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-8 text-center text-[13px] font-medium">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateCartItem(item.product.id, item.quantity + 1)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: 'var(--color-bg-secondary)' }}
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          
                          <button
                            onClick={() => removeFromCart(item.product.id, item.selectedOptions)}
                          >
                            <Trash2 className="w-4 h-4" style={{ color: 'var(--color-error)' }} />
                          </button>
                        </div>
                      </div>
                      
                      <p className="text-[14px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        {formatPrice(itemPrice * item.quantity)}
                      </p>
                    </div>
                  )
                })
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-4 border-t" style={{ borderColor: 'rgba(210, 210, 215, 0.3)' }}>
                <div className="flex justify-between mb-4">
                  <span className="text-[15px]" style={{ color: 'var(--color-text-secondary)' }}>Total</span>
                  <span className="text-[20px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    {formatPrice(total)}
                  </span>
                </div>
                
                <Link 
                  href="/checkout"
                  onClick={() => setShowMobileCart(false)}
                  className="w-full h-12 rounded-xl text-white font-medium flex items-center justify-center gap-2"
                  style={{ backgroundColor: 'var(--color-brand-primary)' }}
                >
                  Checkout
                  <ArrowRight className="w-4 h-4" />
                </Link>
                
                <button 
                  onClick={clearCart}
                  className="w-full text-center mt-3 text-[13px]"
                  style={{ color: 'var(--color-error)' }}
                >
                  Clear cart
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Options Modal */}
      {showOptionsModal && selectedProductForOptions && (
        <ProductOptionSelector
          productName={selectedProductForOptions.nameEn}
          productImage={selectedProductForOptions.imageUrl}
          customFields={selectedProductForOptions.customFields}
          basePrice={getDisplayPrice(selectedProductForOptions)}
          currency={displayCurrencySymbol}
          onConfirm={handleOptionsConfirm}
          onCancel={() => {
            setShowOptionsModal(false)
            setSelectedProductForOptions(null)
          }}
        />
      )}
    </div>
  )
}
