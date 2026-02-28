'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { 
  Package, Plus, Search, Filter, Grid3X3, Grid2X2, 
  LayoutGrid, List, FolderPlus, Folder, ChevronRight, Trash2, 
  CheckSquare, Square, X, Loader2, AlertTriangle, Download
} from 'lucide-react'
import { formatNumber } from '@/lib/utils'
import { useLocalization } from '@/hooks/useLocalization'
import { useProductSettings } from '@/hooks/useProductSettings'
import Portal from '@/components/Portal'
import { ExportModal, productExportColumns } from '@/components/ExportModal'
import { LimitGate } from '@/components/FeatureGate'
import { usePlan } from '@/hooks/usePlan'

interface Product {
  id: string
  ref: string
  nameEn: string
  nameCn: string | null
  priceDistributor: number
  photoUrl: string | null
  category: { id: string; nameEn: string } | null
}

interface Category {
  id: string
  nameEn: string
  parentId: string | null
  parent?: { id: string; nameEn: string } | null
  children?: { id: string; nameEn: string }[]
  isParent: boolean
  hasChildren: boolean
  _count: { products: number }
}

type ViewMode = 'list' | 'grid-small' | 'grid-medium' | 'grid-large'

const viewModes: { mode: ViewMode; icon: typeof List; label: string }[] = [
  { mode: 'list', icon: List, label: 'List' },
  { mode: 'grid-small', icon: Grid3X3, label: 'Small' },
  { mode: 'grid-medium', icon: Grid2X2, label: 'Medium' },
  { mode: 'grid-large', icon: LayoutGrid, label: 'Large' },
]

export default function ProductsPage() {
  const { currencySymbol } = useLocalization()
  const { settings: productSettings, isLoaded: settingsLoaded } = useProductSettings()
  const { getLimit, hasReachedLimit } = usePlan()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [viewMode, setViewMode] = useState<ViewMode | null>(null)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [creatingCategory, setCreatingCategory] = useState(false)
  
  // Selection state
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Category deletion state
  const [showDeleteCategoryModal, setShowDeleteCategoryModal] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null)
  const [deleteAction, setDeleteAction] = useState<'delete_products' | 'move_to_uncategorized'>('move_to_uncategorized')
  const [isDeletingCategory, setIsDeletingCategory] = useState(false)
  
  // Move to category state
  const [showMoveToCategoryModal, setShowMoveToCategoryModal] = useState(false)
  const [selectedMoveCategory, setSelectedMoveCategory] = useState<string>('')
  const [isMovingProducts, setIsMovingProducts] = useState(false)
  
  // Export state
  const [showExportModal, setShowExportModal] = useState(false)

  // Initialize view mode from settings
  useEffect(() => {
    if (settingsLoaded && viewMode === null) {
      setViewMode(productSettings.defaultView)
    }
  }, [settingsLoaded, productSettings.defaultView, viewMode])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        fetch('/api/products/list'),
        fetch('/api/categories/list').catch(() => ({ ok: false, json: () => Promise.resolve({ categories: [] }) }))
      ])
      
      if (productsRes.ok) {
        const data = await productsRes.json()
        setProducts(data.products || [])
      }

      if (categoriesRes.ok) {
        const data = await categoriesRes.json()
        setCategories(data.categories || [])
      }
    } catch {
      console.error('Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode)
    localStorage.setItem('admin_products_view', mode)
  }

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return
    setCreatingCategory(true)
    
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nameEn: newCategoryName }),
      })

      if (res.ok) {
        setNewCategoryName('')
        setShowCategoryModal(false)
        fetchData()
      }
    } catch {
      console.error('Failed to create category')
    } finally {
      setCreatingCategory(false)
    }
  }

  // Selection handlers
  const toggleProductSelection = (productId: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    setSelectedProducts(prev => {
      const newSet = new Set(prev)
      if (newSet.has(productId)) {
        newSet.delete(productId)
      } else {
        newSet.add(productId)
      }
      return newSet
    })
  }

  const selectAll = () => {
    const allIds = new Set(filteredProducts.map(p => p.id))
    setSelectedProducts(allIds)
  }

  const deselectAll = () => {
    setSelectedProducts(new Set())
  }

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode)
    if (isSelectionMode) {
      setSelectedProducts(new Set())
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedProducts.size === 0) return
    setIsDeleting(true)
    
    try {
      const productIds = Array.from(selectedProducts)
      const batchSize = 50 // Process in batches to avoid timeout
      let totalDeleted = 0

      for (let i = 0; i < productIds.length; i += batchSize) {
        const batch = productIds.slice(i, i + batchSize)
        const res = await fetch('/api/products/bulk-delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productIds: batch }),
        })

        if (res.ok) {
          const data = await res.json()
          totalDeleted += data.deleted || 0
        } else {
          console.error('Batch delete failed:', await res.text())
        }
      }

      if (totalDeleted > 0) {
        setSelectedProducts(new Set())
        setShowDeleteConfirm(false)
        setIsSelectionMode(false)
        fetchData()
      }
    } catch (error) {
      console.error('Failed to delete products:', error)
      alert('An error occurred while deleting. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleMoveToCategory = async () => {
    if (selectedProducts.size === 0) return
    setIsMovingProducts(true)
    
    try {
      const productIds = Array.from(selectedProducts)
      const categoryId = selectedMoveCategory || null // empty string means uncategorized
      
      const res = await fetch('/api/products/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          productIds, 
          updates: { categoryId } 
        }),
      })

      if (res.ok) {
        setSelectedProducts(new Set())
        setShowMoveToCategoryModal(false)
        setSelectedMoveCategory('')
        setIsSelectionMode(false)
        fetchData()
      } else {
        console.error('Move failed:', await res.text())
        alert('An error occurred. Please try again.')
      }
    } catch (error) {
      console.error('Failed to move products:', error)
      alert('An error occurred. Please try again.')
    } finally {
      setIsMovingProducts(false)
    }
  }

  const openDeleteCategoryModal = (category: Category) => {
    setCategoryToDelete(category)
    setDeleteAction('move_to_uncategorized')
    setShowDeleteCategoryModal(true)
  }

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return
    setIsDeletingCategory(true)
    
    try {
      const res = await fetch(`/api/categories/${categoryToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          deleteProducts: deleteAction === 'delete_products' 
        }),
      })

      if (res.ok) {
        setShowDeleteCategoryModal(false)
        setCategoryToDelete(null)
        if (selectedCategory === categoryToDelete.id) {
          setSelectedCategory('')
        }
        fetchData()
      }
    } catch {
      console.error('Failed to delete category')
    } finally {
      setIsDeletingCategory(false)
    }
  }

  // Get all category IDs to filter (including subcategories)
  const getFilterCategoryIds = (categoryId: string): string[] => {
    const category = categories.find(c => c.id === categoryId)
    if (!category) return [categoryId]
    
    // If it's a parent with children, include all children IDs
    if (category.hasChildren && category.children) {
      return [categoryId, ...category.children.map(c => c.id)]
    }
    return [categoryId]
  }

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = !searchQuery || 
      product.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.ref.toLowerCase().includes(searchQuery.toLowerCase())
    
    // If a category is selected, check if product matches category or its subcategories
    const matchesCategory = !selectedCategory || 
      getFilterCategoryIds(selectedCategory).includes(product.category?.id || '')
    
    return matchesSearch && matchesCategory
  })

  const getGridClasses = () => {
    switch (viewMode) {
      case 'list':
        return 'flex flex-col gap-2'
      case 'grid-small':
        return 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-3'
      case 'grid-medium':
        return 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4'
      case 'grid-large':
        return 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5'
      default:
        return 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4'
    }
  }

  // Use effective view mode (with fallback)
  const effectiveViewMode: ViewMode = viewMode || productSettings.defaultView || 'grid-medium'

  if (loading) {
    return (
      <div className="w-full">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-[#e8e8ed] rounded w-48" />
          <div className="h-10 bg-[#e8e8ed] rounded" />
          <div className="grid grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="h-48 bg-[#e8e8ed] rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-full pb-24">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">Products</h1>
          <p className="text-[15px] text-[#86868b] mt-1">
            {products.length} product{products.length !== 1 ? 's' : ''} in your catalog
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSelectionMode}
            className={`inline-flex items-center gap-2 h-10 px-4 border text-[13px] font-medium rounded-xl transition-colors ${
              isSelectionMode 
                ? 'bg-[#ff3b30]/10 border-[#ff3b30]/30 text-[#ff3b30] hover:bg-[#ff3b30]/20' 
                : 'bg-white border-[#d2d2d7]/50 text-[#1d1d1f] hover:bg-[#f5f5f7]'
            }`}
          >
            {isSelectionMode ? <X className="w-4 h-4" /> : <CheckSquare className="w-4 h-4" />}
            {isSelectionMode ? 'Cancel' : 'Select'}
          </button>
          <button
            onClick={() => setShowExportModal(true)}
            className="inline-flex items-center gap-2 bg-[#34c759] hover:bg-[#2db350] text-white text-[13px] font-medium px-4 h-10 rounded-xl transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={() => setShowCategoryModal(true)}
            className="inline-flex items-center gap-2 h-10 px-4 bg-white border border-[#d2d2d7]/50 text-[#1d1d1f] text-[13px] font-medium rounded-xl hover:bg-[#f5f5f7] transition-colors"
          >
            <FolderPlus className="w-4 h-4" />
            Add Category
          </button>
          <LimitGate 
            feature="products" 
            currentCount={products.length}
            showBanner={false}
            fallback={
              <span className="inline-flex items-center gap-2 bg-gray-300 text-gray-500 text-[13px] font-medium px-4 h-10 rounded-xl cursor-not-allowed">
                <Plus className="w-4 h-4" />
                Limite atteinte ({products.length}/{getLimit('products')})
              </span>
            }
          >
            <Link
              href="/products/new"
              className="inline-flex items-center gap-2 bg-[#0071e3] hover:bg-[#0077ed] text-white text-[13px] font-medium px-4 h-10 rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Product
            </Link>
          </LimitGate>
        </div>
      </div>

      {/* Selection Action Bar - Visible when products are selected */}
      {isSelectionMode && (
        <div className="bg-[#1d1d1f] text-white rounded-2xl p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={selectedProducts.size === filteredProducts.length ? deselectAll : selectAll}
              className="text-[13px] font-medium hover:text-[#0071e3] transition-colors"
            >
              {selectedProducts.size === filteredProducts.length ? 'Deselect All' : `Select All (${filteredProducts.length})`}
            </button>
            <span className="text-[13px]">
              <span className="font-semibold">{selectedProducts.size}</span> product{selectedProducts.size !== 1 ? 's' : ''} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowMoveToCategoryModal(true)}
              disabled={selectedProducts.size === 0}
              className="inline-flex items-center gap-2 bg-[#0071e3] hover:bg-[#0077ed] text-white text-[13px] font-medium px-4 py-2 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Folder className="w-4 h-4" />
              Move to Category
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={selectedProducts.size === 0}
              className="inline-flex items-center gap-2 bg-[#ff3b30] hover:bg-[#ff453a] text-white text-[13px] font-medium px-4 py-2 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-3 sm:p-4 mb-6">
        {/* Search - Full width */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="w-full h-10 pl-10 pr-4 bg-[#f5f5f7] border-0 rounded-xl text-[14px] text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
          />
        </div>
        
        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Category Filter */}
          <div className="relative flex-shrink-0">
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-10 pl-3 pr-8 bg-[#f5f5f7] border-0 rounded-xl text-[13px] text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#0071e3] appearance-none cursor-pointer w-full sm:w-auto sm:min-w-[140px]"
            >
              <option value="">All Categories</option>
              {/* Parent categories */}
              {categories.filter(cat => cat.isParent).map(cat => (
                <optgroup key={cat.id} label={cat.nameEn}>
                  <option value={cat.id}>
                    All {cat.nameEn} ({cat._count.products + (cat.children?.reduce((sum, child) => {
                      const childCat = categories.find(c => c.id === child.id)
                      return sum + (childCat?._count.products || 0)
                    }, 0) || 0)})
                  </option>
                  {/* Subcategories */}
                  {categories.filter(subcat => subcat.parentId === cat.id).map(subcat => (
                    <option key={subcat.id} value={subcat.id}>
                      └ {subcat.nameEn} ({subcat._count.products})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b] pointer-events-none" />
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-[#f5f5f7] rounded-xl p-1">
            {viewModes.map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                onClick={() => handleViewModeChange(mode)}
                title={label}
                className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
                  effectiveViewMode === mode 
                    ? 'bg-white shadow-sm' 
                    : 'hover:bg-white/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${effectiveViewMode === mode ? 'text-[#1d1d1f]' : 'text-[#86868b]'}`} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Categories Row - Only show parent categories */}
      {categories.length > 0 && (
        <div className="space-y-3 mb-6">
          {/* Parent Categories */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedCategory('')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium whitespace-nowrap transition-all ${
                !selectedCategory 
                  ? 'bg-[#0071e3] text-white' 
                  : 'bg-white border border-[#d2d2d7]/30 text-[#1d1d1f] hover:bg-[#f5f5f7]'
              }`}
            >
              All Products
              <span className={`px-1.5 py-0.5 rounded text-[11px] ${
                !selectedCategory ? 'bg-white/20' : 'bg-[#f5f5f7]'
              }`}>
                {products.length}
              </span>
            </button>
            {categories.filter(cat => cat.isParent).map(cat => {
              // Count products in this category and its children
              const childIds = cat.children?.map(c => c.id) || []
              const totalProducts = cat._count.products + 
                categories.filter(c => childIds.includes(c.id))
                  .reduce((sum, c) => sum + c._count.products, 0)
              
              return (
                <div
                  key={cat.id}
                  className={`flex items-center gap-1 rounded-xl text-[13px] font-medium whitespace-nowrap transition-all group ${
                    selectedCategory === cat.id 
                      ? 'bg-[#0071e3] text-white' 
                      : 'bg-white border border-[#d2d2d7]/30 text-[#1d1d1f] hover:bg-[#f5f5f7]'
                  }`}
                >
                  <button
                    onClick={() => setSelectedCategory(cat.id)}
                    className="flex items-center gap-2 px-3 py-2"
                  >
                    <Folder className="w-4 h-4" />
                    {cat.nameEn}
                    {cat.hasChildren && (
                      <ChevronRight className={`w-3 h-3 transition-transform ${selectedCategory === cat.id ? 'rotate-90' : ''}`} />
                    )}
                    <span className={`px-1.5 py-0.5 rounded text-[11px] ${
                      selectedCategory === cat.id ? 'bg-white/20' : 'bg-[#f5f5f7]'
                    }`}>
                      {totalProducts}
                    </span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      openDeleteCategoryModal(cat)
                    }}
                    className={`p-1.5 mr-1 rounded-lg transition-colors ${
                      selectedCategory === cat.id 
                        ? 'hover:bg-white/20 text-white/70 hover:text-white' 
                        : 'hover:bg-[#ff3b30]/10 text-[#86868b] hover:text-[#ff3b30]'
                    }`}
                    title="Delete category"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )
            })}
          </div>
          
          {/* Subcategories Row - Show when a parent category with children is selected */}
          {selectedCategory && (() => {
            const selectedParent = categories.find(c => c.id === selectedCategory && c.hasChildren)
            if (!selectedParent) return null
            
            const subcategories = categories.filter(c => c.parentId === selectedCategory)
            if (subcategories.length === 0) return null
            
            return (
              <div className="flex gap-2 overflow-x-auto pb-2 pl-4 border-l-2 border-[#0071e3]/30">
                <span className="text-[11px] text-[#86868b] font-medium uppercase tracking-wider self-center mr-2">
                  Subcategories:
                </span>
                {subcategories.map(subcat => (
                  <button
                    key={subcat.id}
                    onClick={() => setSelectedCategory(subcat.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-medium whitespace-nowrap transition-all ${
                      selectedCategory === subcat.id 
                        ? 'bg-[#0071e3]/10 text-[#0071e3] border border-[#0071e3]/30' 
                        : 'bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed]'
                    }`}
                  >
                    {subcat.nameEn}
                    <span className="px-1 py-0.5 rounded text-[10px] bg-white/50">
                      {subcat._count.products}
                    </span>
                  </button>
                ))}
              </div>
            )
          })()}
        </div>
      )}

      {/* Products */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-12 text-center">
          <div className="w-16 h-16 bg-[#f5f5f7] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-[#86868b]" />
          </div>
          <h3 className="text-[17px] font-semibold text-[#1d1d1f] mb-2">
            {searchQuery || selectedCategory ? 'No products found' : 'No products yet'}
          </h3>
          <p className="text-[14px] text-[#86868b] mb-6">
            {searchQuery || selectedCategory 
              ? 'Try adjusting your search or filters' 
              : 'Add your first product to get started.'}
          </p>
          {!searchQuery && !selectedCategory && (
            <div className="flex justify-center gap-3">
              <Link
                href="/products/new"
                className="inline-flex items-center gap-2 bg-[#0071e3] hover:bg-[#0077ed] text-white text-[13px] font-medium px-5 h-10 rounded-xl transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Product
              </Link>
              <Link
                href="/import"
                className="inline-flex items-center gap-2 bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[#1d1d1f] text-[13px] font-medium px-5 h-10 rounded-xl transition-colors"
              >
                Import from Excel
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className={getGridClasses()}>
          {filteredProducts.map((product) => {
            const isSelected = selectedProducts.has(product.id)
            
            return effectiveViewMode === 'list' ? (
              // List View
              <div
                key={product.id}
                className={`bg-white rounded-xl border p-3 transition-all flex items-center gap-3 ${
                  isSelected 
                    ? 'border-[#0071e3] bg-[#0071e3]/5' 
                    : 'border-[#d2d2d7]/30 hover:border-[#0071e3]/40 hover:shadow-md'
                } ${isSelectionMode ? 'cursor-pointer' : ''}`}
                onClick={() => isSelectionMode && toggleProductSelection(product.id)}
              >
                {/* Selection Checkbox */}
                {isSelectionMode && (
                  <button
                    onClick={(e) => toggleProductSelection(product.id, e)}
                    className="flex-shrink-0"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-5 h-5 text-[#0071e3]" />
                    ) : (
                      <Square className="w-5 h-5 text-[#86868b] hover:text-[#0071e3]" />
                    )}
                  </button>
                )}
                
                <Link
                  href={isSelectionMode ? '#' : `/products/${product.id}`}
                  onClick={(e) => isSelectionMode && e.preventDefault()}
                  className="flex items-center gap-3 flex-1 min-w-0 overflow-hidden"
                >
                  {/* Image */}
                  <div className="w-10 h-10 bg-[#f5f5f7] rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden relative">
                    {product.photoUrl ? (
                      <Image src={product.photoUrl} alt={product.nameEn} width={40} height={40} className="object-cover" unoptimized />
                    ) : (
                      <Package className="w-5 h-5 text-[#86868b]" />
                    )}
                  </div>
                  
                  {/* Ref - fixed width */}
                  <div className="w-20 flex-shrink-0">
                    <p className="text-[11px] text-[#86868b] font-mono truncate">{product.ref}</p>
                  </div>
                  
                  {/* Name - takes remaining space */}
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <p className="text-[13px] font-medium text-[#1d1d1f] truncate">{product.nameEn}</p>
                  </div>
                  
                  {/* Category */}
                  {product.category && (
                    <span className="hidden sm:inline-block text-[10px] font-medium px-2 py-1 bg-[#f5f5f7] text-[#86868b] rounded flex-shrink-0 max-w-24 truncate">
                      {product.category.nameEn}
                    </span>
                  )}
                  
                  {/* Price */}
                  <p className="text-[14px] font-semibold text-[#0071e3] flex-shrink-0 w-20 text-right">
                    {currencySymbol}{formatNumber(product.priceDistributor)}
                  </p>
                  
                  {!isSelectionMode && <ChevronRight className="w-4 h-4 text-[#d2d2d7] flex-shrink-0" />}
                </Link>
              </div>
            ) : (
              // Grid Views
              <div
                key={product.id}
                className={`bg-white rounded-2xl border overflow-hidden transition-all duration-300 group relative ${
                  isSelected 
                    ? 'border-[#0071e3] ring-2 ring-[#0071e3]/20' 
                    : 'border-[#d2d2d7]/30 hover:border-[#0071e3]/40 hover:shadow-lg'
                } ${isSelectionMode ? 'cursor-pointer' : ''}`}
                onClick={() => isSelectionMode && toggleProductSelection(product.id)}
              >
                {/* Selection Checkbox Overlay */}
                {isSelectionMode && (
                  <button
                    onClick={(e) => toggleProductSelection(product.id, e)}
                    className={`absolute top-3 left-3 z-10 w-6 h-6 rounded-md flex items-center justify-center transition-colors ${
                      isSelected 
                        ? 'bg-[#0071e3] text-white' 
                        : 'bg-white/90 text-[#86868b] hover:text-[#0071e3] shadow-sm border border-[#d2d2d7]/50'
                    }`}
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                )}
                
                <Link
                  href={isSelectionMode ? '#' : `/products/${product.id}`}
                  onClick={(e) => isSelectionMode && e.preventDefault()}
                >
                  {/* Product Image */}
                  <div className={`bg-[#f5f5f7] flex items-center justify-center overflow-hidden group-hover:bg-[#f0f0f5] transition-colors relative ${
                    effectiveViewMode === 'grid-small' ? 'aspect-square' :
                    effectiveViewMode === 'grid-large' ? 'aspect-square' : 
                    'aspect-square'
                  }`}>
                    {product.photoUrl ? (
                      <Image 
                        src={product.photoUrl} 
                        alt={product.nameEn} 
                        fill
                        className="object-contain p-2" 
                        unoptimized
                      />
                    ) : (
                      <Package className={`text-[#86868b] ${
                        effectiveViewMode === 'grid-small' ? 'w-8 h-8' :
                        effectiveViewMode === 'grid-large' ? 'w-16 h-16' : 
                        'w-12 h-12'
                      }`} />
                    )}
                  </div>
                  
                  {/* Product Info */}
                  <div className={`${effectiveViewMode === 'grid-small' ? 'p-2' : 'p-4'} flex flex-col`}>
                    {/* Ref - fixed height, truncated */}
                    <p className={`text-[#86868b] font-mono truncate ${effectiveViewMode === 'grid-small' ? 'text-[9px] mb-0.5' : 'text-[11px] mb-1'}`}>
                      {product.ref}
                    </p>
                    
                    {/* Name - fixed height with line clamp */}
                    <h3 className={`font-medium text-[#1d1d1f] group-hover:text-[#0071e3] transition-colors overflow-hidden ${
                      effectiveViewMode === 'grid-small' ? 'text-[11px] line-clamp-2 min-h-[28px]' : 
                      effectiveViewMode === 'grid-large' ? 'text-[15px] line-clamp-2 min-h-[44px]' :
                      'text-[13px] line-clamp-2 min-h-[36px]'
                    }`}>
                      {product.nameEn}
                    </h3>
                    
                    {product.nameCn && effectiveViewMode === 'grid-large' && (
                      <p className="text-[12px] text-[#86868b] mt-1 truncate">{product.nameCn}</p>
                    )}
                    
                    {/* Price & Category */}
                    <div className={`flex items-center justify-between mt-auto ${effectiveViewMode === 'grid-small' ? 'pt-1' : 'pt-2 border-t border-[#d2d2d7]/30 mt-2'}`}>
                      <p className={`font-semibold text-[#0071e3] ${
                        effectiveViewMode === 'grid-small' ? 'text-[12px]' : 
                        effectiveViewMode === 'grid-large' ? 'text-[17px]' :
                        'text-[14px]'
                      }`}>
                        {currencySymbol}{formatNumber(product.priceDistributor)}
                      </p>
                      {product.category && effectiveViewMode !== 'grid-small' && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 bg-[#f5f5f7] text-[#86868b] rounded truncate max-w-[80px]">
                          {product.category.nameEn}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </div>
            )
          })}
        </div>
      )}


      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <Portal>
          <div 
            className="fixed inset-0 bg-black/30 backdrop-blur-sm"
            style={{ zIndex: 100000 }}
            onClick={() => !isDeleting && setShowDeleteConfirm(false)}
          />
          <div 
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl p-6"
            style={{ zIndex: 100001 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-[#ff3b30]/10 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-[#ff3b30]" />
              </div>
              <div>
                <h2 className="text-[17px] font-semibold text-[#1d1d1f]">Delete Products</h2>
                <p className="text-[14px] text-[#86868b]">This action cannot be undone</p>
              </div>
            </div>
            
            <p className="text-[14px] text-[#1d1d1f] mb-4">
              Are you sure you want to delete <strong>{selectedProducts.size}</strong> product{selectedProducts.size !== 1 ? 's' : ''}?
            </p>
            
            <div className="max-h-32 overflow-y-auto mb-4 p-3 bg-[#f5f5f7] rounded-xl">
              <ul className="text-[13px] text-[#86868b] space-y-1">
                {Array.from(selectedProducts).slice(0, 5).map(id => {
                  const product = products.find(p => p.id === id)
                  return product ? (
                    <li key={id} className="truncate">• {product.ref} - {product.nameEn}</li>
                  ) : null
                })}
                {selectedProducts.size > 5 && (
                  <li className="text-[#86868b]">...and {selectedProducts.size - 5} more</li>
                )}
              </ul>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 h-10 bg-[#f5f5f7] text-[#1d1d1f] text-[14px] font-medium rounded-xl hover:bg-[#e8e8ed] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSelected}
                disabled={isDeleting}
                className="flex-1 h-10 bg-[#ff3b30] text-white text-[14px] font-medium rounded-xl hover:bg-[#ff453a] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete {selectedProducts.size} Product{selectedProducts.size !== 1 ? 's' : ''}
                  </>
                )}
              </button>
            </div>
          </div>
        </Portal>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <Portal>
          <div 
            className="fixed inset-0 bg-black/30 backdrop-blur-sm"
            style={{ zIndex: 100000 }}
            onClick={() => setShowCategoryModal(false)}
          />
          <div 
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl p-6"
            style={{ zIndex: 100001 }}
          >
            <h2 className="text-[17px] font-semibold text-[#1d1d1f] mb-4">New Category</h2>
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Category name"
              autoFocus
              className="w-full h-11 px-4 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3] mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowCategoryModal(false)}
                className="flex-1 h-10 bg-[#f5f5f7] text-[#1d1d1f] text-[14px] font-medium rounded-xl hover:bg-[#e8e8ed] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCategory}
                disabled={!newCategoryName.trim() || creatingCategory}
                className="flex-1 h-10 bg-[#0071e3] text-white text-[14px] font-medium rounded-xl hover:bg-[#0077ed] transition-colors disabled:bg-[#86868b]"
              >
                {creatingCategory ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </Portal>
      )}

      {/* Delete Category Modal */}
      {showDeleteCategoryModal && categoryToDelete && (
        <Portal>
          <div 
            className="fixed inset-0 bg-black/30 backdrop-blur-sm"
            style={{ zIndex: 100000 }}
            onClick={() => !isDeletingCategory && setShowDeleteCategoryModal(false)}
          />
          <div 
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl p-6"
            style={{ zIndex: 100001 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-[#ff3b30]/10 rounded-full flex items-center justify-center">
                <Folder className="w-6 h-6 text-[#ff3b30]" />
              </div>
              <div>
                <h2 className="text-[17px] font-semibold text-[#1d1d1f]">Delete Category</h2>
                <p className="text-[14px] text-[#86868b]">{categoryToDelete.nameEn}</p>
              </div>
            </div>
            
            <p className="text-[14px] text-[#1d1d1f] mb-4">
              This category contains <strong>{categoryToDelete._count.products}</strong> product{categoryToDelete._count.products !== 1 ? 's' : ''}. 
              What do you want to do with them?
            </p>
            
            <div className="space-y-3 mb-6">
              <label 
                className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                  deleteAction === 'move_to_uncategorized' 
                    ? 'border-[#0071e3] bg-[#0071e3]/5' 
                    : 'border-[#d2d2d7]/30 hover:border-[#0071e3]/50'
                }`}
              >
                <input
                  type="radio"
                  name="deleteAction"
                  value="move_to_uncategorized"
                  checked={deleteAction === 'move_to_uncategorized'}
                  onChange={() => setDeleteAction('move_to_uncategorized')}
                  className="mt-0.5"
                />
                <div>
                  <p className="text-[14px] font-medium text-[#1d1d1f]">Keep products (recommended)</p>
                  <p className="text-[13px] text-[#86868b]">Products will be moved to &quot;Uncategorized&quot;</p>
                </div>
              </label>
              
              <label 
                className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                  deleteAction === 'delete_products' 
                    ? 'border-[#ff3b30] bg-[#ff3b30]/5' 
                    : 'border-[#d2d2d7]/30 hover:border-[#ff3b30]/50'
                }`}
              >
                <input
                  type="radio"
                  name="deleteAction"
                  value="delete_products"
                  checked={deleteAction === 'delete_products'}
                  onChange={() => setDeleteAction('delete_products')}
                  className="mt-0.5"
                />
                <div>
                  <p className="text-[14px] font-medium text-[#ff3b30]">Delete all products</p>
                  <p className="text-[13px] text-[#86868b]">Permanently delete {categoryToDelete._count.products} product{categoryToDelete._count.products !== 1 ? 's' : ''}</p>
                </div>
              </label>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteCategoryModal(false)}
                disabled={isDeletingCategory}
                className="flex-1 h-10 bg-[#f5f5f7] text-[#1d1d1f] text-[14px] font-medium rounded-xl hover:bg-[#e8e8ed] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCategory}
                disabled={isDeletingCategory}
                className={`flex-1 h-10 text-white text-[14px] font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
                  deleteAction === 'delete_products' 
                    ? 'bg-[#ff3b30] hover:bg-[#ff453a]' 
                    : 'bg-[#0071e3] hover:bg-[#0077ed]'
                }`}
              >
                {isDeletingCategory ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete Category
                  </>
                )}
              </button>
            </div>
          </div>
        </Portal>
      )}

      {/* Move to Category Modal */}
      {showMoveToCategoryModal && (
        <Portal>
          <div 
            className="fixed inset-0 bg-black/30 backdrop-blur-sm"
            style={{ zIndex: 100000 }}
            onClick={() => !isMovingProducts && setShowMoveToCategoryModal(false)}
          />
          <div 
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl p-6"
            style={{ zIndex: 100001 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-[#0071e3]/10 rounded-full flex items-center justify-center">
                <Folder className="w-6 h-6 text-[#0071e3]" />
              </div>
              <div>
                <h2 className="text-[17px] font-semibold text-[#1d1d1f]">Move to Category</h2>
                <p className="text-[14px] text-[#86868b]">{selectedProducts.size} product{selectedProducts.size !== 1 ? 's' : ''} selected</p>
              </div>
            </div>
            
            <p className="text-[14px] text-[#1d1d1f] mb-4">
              Select the category where you want to move these products:
            </p>
            
            <select
              value={selectedMoveCategory}
              onChange={(e) => setSelectedMoveCategory(e.target.value)}
              className="w-full h-12 px-4 bg-[#f5f5f7] border-0 rounded-xl text-[14px] text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#0071e3] mb-6"
            >
              <option value="">Uncategorized (no category)</option>
              {categories.filter(cat => cat.isParent).map(cat => (
                <optgroup key={cat.id} label={cat.nameEn}>
                  <option value={cat.id}>{cat.nameEn}</option>
                  {categories.filter(subcat => subcat.parentId === cat.id).map(subcat => (
                    <option key={subcat.id} value={subcat.id}>└ {subcat.nameEn}</option>
                  ))}
                </optgroup>
              ))}
              {/* Categories without parent */}
              {categories.filter(cat => !cat.isParent && !cat.parentId).map(cat => (
                <option key={cat.id} value={cat.id}>{cat.nameEn}</option>
              ))}
            </select>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowMoveToCategoryModal(false)
                  setSelectedMoveCategory('')
                }}
                disabled={isMovingProducts}
                className="flex-1 h-10 bg-[#f5f5f7] text-[#1d1d1f] text-[14px] font-medium rounded-xl hover:bg-[#e8e8ed] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleMoveToCategory}
                disabled={isMovingProducts}
                className="flex-1 h-10 bg-[#0071e3] text-white text-[14px] font-medium rounded-xl hover:bg-[#0077ed] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isMovingProducts ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Moving...
                  </>
                ) : (
                  <>
                    <Folder className="w-4 h-4" />
                    Move {selectedProducts.size} Product{selectedProducts.size !== 1 ? 's' : ''}
                  </>
                )}
              </button>
            </div>
          </div>
        </Portal>
      )}

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Products"
        entityType="products"
        data={filteredProducts}
        availableColumns={productExportColumns}
      />
    </div>
  )
}
