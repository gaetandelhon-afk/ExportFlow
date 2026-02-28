'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import ProductCard from '@/components/ProductCard'
import ProductListItem from '@/components/ProductListItem'
import { useDistributor, Product } from '@/contexts/DistributorContext'
import { usePreview } from '@/contexts/PreviewContext'
import { Search, SlidersHorizontal, Grid3X3, Grid2X2, List, X, Heart, LayoutGrid, Loader2, ChevronRight, Folder } from 'lucide-react'

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

export default function CatalogPage() {
  const { favorites, effectiveSettings } = useDistributor()
  const { isPreviewMode, previewCustomer } = usePreview()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('grid-medium')
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)

  // Products from API
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load products from API
  const loadProducts = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.set('search', searchQuery)
      if (selectedCategory !== 'all') params.set('categoryId', selectedCategory)
      if (isPreviewMode && previewCustomer?.id) {
        params.set('previewCustomerId', previewCustomer.id)
      }
      
      const res = await fetch(`/api/distributor/products?${params.toString()}`)
      
      if (res.ok) {
        const data = await res.json()
        setProducts(data.products || [])
        setCategories(data.categories || [])
      } else {
        console.error('API failed to load products')
        setError('Failed to load products')
        setProducts([])
        setCategories([])
      }
    } catch (err) {
      console.error('Failed to load products:', err)
      setError('Failed to load products')
      setProducts([])
      setCategories([])
    } finally {
      setLoading(false)
    }
  }, [searchQuery, selectedCategory, isPreviewMode, previewCustomer])

  // Load products on mount and when filters change
  useEffect(() => {
    loadProducts()
  }, [loadProducts])


  // Load saved view mode
  useEffect(() => {
    const savedView = localStorage.getItem('catalog_view_mode')
    if (savedView && ['list', 'grid-small', 'grid-medium', 'grid-large'].includes(savedView)) {
      setViewMode(savedView as ViewMode)
    }
    setIsHydrated(true)
  }, [])

  // Save view mode when it changes
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem('catalog_view_mode', viewMode)
    }
  }, [viewMode, isHydrated])

  // Build parent categories list
  const parentCategories = useMemo(() => {
    return categories.filter(c => c.isParent || !c.parentId)
  }, [categories])

  // Get subcategories for selected parent
  const subcategories = useMemo(() => {
    if (selectedCategory === 'all') return []
    const parent = categories.find(c => c.id === selectedCategory)
    if (parent?.hasChildren) {
      return categories.filter(c => c.parentId === selectedCategory)
    }
    return []
  }, [categories, selectedCategory])

  // Filter products (local filtering for favorites)
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesFavorites = !showFavoritesOnly || favorites.includes(product.id)
      return matchesFavorites
    })
  }, [products, showFavoritesOnly, favorites])

  const getGridClass = () => {
    switch (viewMode) {
      case 'list':
        return 'flex flex-col gap-3'
      case 'grid-small':
        return 'grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3'
      case 'grid-medium':
        return 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
      case 'grid-large':
        return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 
            className="text-[28px] font-semibold tracking-tight"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Product Catalog
          </h1>
          <p 
            className="text-[15px] mt-1"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {filteredProducts.length} products {showFavoritesOnly && '(favorites only)'}
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search 
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: 'var(--color-text-secondary)' }}
          />
          <input
            type="text"
            placeholder="Search by name, reference, or Chinese name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field has-icon w-full"
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

        {/* Category Filter */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
            {/* All Products */}
            <button
              onClick={() => {
                setSelectedCategory('all')
                setShowFavoritesOnly(false)
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium whitespace-nowrap transition-colors"
              style={{ 
                backgroundColor: selectedCategory === 'all' 
                  ? 'var(--color-brand-primary)' 
                  : 'var(--color-bg-secondary)',
                color: selectedCategory === 'all' 
                  ? 'white' 
                  : 'var(--color-text-primary)',
                border: selectedCategory === 'all' 
                  ? 'none' 
                  : '1px solid rgba(210, 210, 215, 0.3)'
              }}
            >
              All Products
            </button>
            
            {/* Parent Categories */}
            {parentCategories.map((category) => {
              const isSelected = selectedCategory === category.id
              const totalProducts = (category.productCount || 0) + 
                (category.children?.reduce((sum, child) => {
                  const childCat = categories.find(c => c.id === child.id)
                  return sum + (childCat?.productCount || 0)
                }, 0) || 0)
              
              return (
                <button
                  key={category.id}
                  onClick={() => {
                    setSelectedCategory(category.id)
                    setShowFavoritesOnly(false)
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium whitespace-nowrap transition-colors capitalize"
                  style={{ 
                    backgroundColor: isSelected 
                      ? 'var(--color-brand-primary)' 
                      : 'var(--color-bg-secondary)',
                    color: isSelected 
                      ? 'white' 
                      : 'var(--color-text-primary)',
                    border: isSelected 
                      ? 'none' 
                      : '1px solid rgba(210, 210, 215, 0.3)'
                  }}
                >
                  <Folder className="w-3.5 h-3.5" />
                  {category.name}
                  {category.hasChildren && (
                    <ChevronRight 
                      className="w-3 h-3 transition-transform" 
                      style={{ transform: isSelected ? 'rotate(90deg)' : 'none' }}
                    />
                  )}
                  <span 
                    className="text-[11px] px-1.5 py-0.5 rounded"
                    style={{ 
                      backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : 'var(--color-bg-tertiary)'
                    }}
                  >
                    {totalProducts}
                  </span>
                </button>
              )
            })}
        </div>
        
        {/* Subcategories Row - Show when parent with children is selected */}
        {subcategories.length > 0 && (
          <div 
            className="flex flex-wrap items-center gap-2 mb-4 pl-4"
            style={{ borderLeft: '2px solid var(--color-brand-primary)', opacity: 0.8 }}
          >
            <span 
              className="text-[11px] font-medium uppercase tracking-wider mr-2"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Subcategories:
            </span>
            {subcategories.map((subcat) => (
              <button
                key={subcat.id}
                onClick={() => {
                  setSelectedCategory(subcat.id)
                  setShowFavoritesOnly(false)
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] font-medium whitespace-nowrap transition-colors capitalize"
                style={{ 
                  backgroundColor: selectedCategory === subcat.id 
                    ? 'rgba(0, 113, 227, 0.1)' 
                    : 'var(--color-bg-tertiary)',
                  color: selectedCategory === subcat.id 
                    ? 'var(--color-brand-primary)' 
                    : 'var(--color-text-primary)',
                  border: selectedCategory === subcat.id 
                    ? '1px solid rgba(0, 113, 227, 0.3)' 
                    : '1px solid transparent'
                }}
              >
                {subcat.name}
                <span 
                  className="text-[10px] px-1 py-0.5 rounded"
                  style={{ backgroundColor: 'rgba(255,255,255,0.5)' }}
                >
                  {subcat.productCount || 0}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* View Controls */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            {/* Favorites Toggle */}
            {effectiveSettings.hasFavorites && favorites.length > 0 && (
              <button
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors"
                style={{ 
                  backgroundColor: showFavoritesOnly 
                    ? 'rgba(255, 59, 48, 0.1)' 
                    : 'var(--color-bg-secondary)',
                  color: showFavoritesOnly 
                    ? 'var(--color-error)' 
                    : 'var(--color-text-primary)',
                  border: '1px solid rgba(210, 210, 215, 0.3)'
                }}
              >
                <Heart 
                  className="w-4 h-4" 
                  style={{ fill: showFavoritesOnly ? 'var(--color-error)' : 'none' }}
                />
                Favorites ({favorites.length})
              </button>
            )}
          </div>

          {/* View Mode Buttons - 4 options */}
          <div 
            className="flex items-center rounded-lg overflow-hidden"
            style={{ border: '1px solid rgba(210, 210, 215, 0.3)' }}
          >
            {/* List */}
            <button
              onClick={() => setViewMode('list')}
              className="w-9 h-9 flex items-center justify-center transition-colors"
              style={{ 
                backgroundColor: viewMode === 'list' 
                  ? 'var(--color-brand-primary)' 
                  : 'transparent',
              }}
              title="List View"
            >
              <List 
                className="w-4 h-4" 
                style={{ 
                  color: viewMode === 'list' ? 'white' : 'var(--color-text-secondary)'
                }} 
              />
            </button>
            
            {/* Small Grid */}
            <button
              onClick={() => setViewMode('grid-small')}
              className="w-9 h-9 flex items-center justify-center transition-colors"
              style={{ 
                backgroundColor: viewMode === 'grid-small' 
                  ? 'var(--color-brand-primary)' 
                  : 'transparent',
              }}
              title="Small Icons"
            >
              <Grid3X3 
                className="w-4 h-4" 
                style={{ 
                  color: viewMode === 'grid-small' ? 'white' : 'var(--color-text-secondary)'
                }} 
              />
            </button>
            
            {/* Medium Grid */}
            <button
              onClick={() => setViewMode('grid-medium')}
              className="w-9 h-9 flex items-center justify-center transition-colors"
              style={{ 
                backgroundColor: viewMode === 'grid-medium' 
                  ? 'var(--color-brand-primary)' 
                  : 'transparent',
              }}
              title="Medium Icons"
            >
              <Grid2X2 
                className="w-4 h-4" 
                style={{ 
                  color: viewMode === 'grid-medium' ? 'white' : 'var(--color-text-secondary)'
                }} 
              />
            </button>
            
            {/* Large Grid */}
            <button
              onClick={() => setViewMode('grid-large')}
              className="w-9 h-9 flex items-center justify-center transition-colors"
              style={{ 
                backgroundColor: viewMode === 'grid-large' 
                  ? 'var(--color-brand-primary)' 
                  : 'transparent',
              }}
              title="Large Icons"
            >
              <LayoutGrid 
                className="w-4 h-4" 
                style={{ 
                  color: viewMode === 'grid-large' ? 'white' : 'var(--color-text-secondary)'
                }} 
              />
            </button>
          </div>
        </div>

        {/* Products Grid/List */}
        {loading ? (
          <div className="text-center py-16">
            <Loader2 
              className="w-12 h-12 mx-auto mb-4 animate-spin"
              style={{ color: 'var(--color-brand-primary)' }}
            />
            <p 
              className="text-[15px]"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Loading products...
            </p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <SlidersHorizontal 
              className="w-12 h-12 mx-auto mb-4"
              style={{ color: 'var(--color-text-tertiary)' }}
            />
            <p 
              className="text-[15px] mb-2"
              style={{ color: 'var(--color-text-primary)' }}
            >
              No products found
            </p>
            <p 
              className="text-[13px]"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Try adjusting your search or filters
            </p>
          </div>
        ) : (
          <div className={getGridClass()}>
            {filteredProducts.map((product) => (
              viewMode === 'list' ? (
                <ProductListItem key={product.id} product={product} />
              ) : (
                <ProductCard key={product.id} product={product} viewMode={viewMode} />
              )
            ))}
          </div>
        )}
    </div>
  )
}