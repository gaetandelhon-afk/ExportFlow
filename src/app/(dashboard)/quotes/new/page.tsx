'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ChevronLeft, Loader2, Plus, Minus, Trash2, Settings2,
  Search, ChevronRight, ShoppingCart, Package, Filter,
  Grid3X3, Grid2X2, LayoutGrid, List, X, Folder,
  User, UserPlus, Check, ClipboardList, Calendar
} from 'lucide-react'
import ProductOptionSelector from '@/components/ProductOptionSelector'
import { parseProductOptions, SelectedOption } from '@/types/product-options'
import { useLocalization } from '@/hooks/useLocalization'
import { useProductSettings, ViewMode } from '@/hooks/useProductSettings'
import Portal from '@/components/Portal'

interface Customer {
  id: string
  companyName: string
  country: string | null
}

interface Category {
  id: string
  nameEn: string
  nameCn?: string | null
  parentId: string | null
  isParent?: boolean
  hasChildren?: boolean
  _count?: { products: number }
  children?: { id: string; nameEn: string }[]
}

interface Product {
  id: string
  ref: string
  nameEn: string
  nameCn?: string | null
  priceDistributor: number | string | null
  photoUrl?: string | null
  customFields?: unknown
  categoryId?: string | null
  category?: { id: string; nameEn: string; parentId?: string | null } | null
}

interface CartItem {
  productId: string
  product: Product
  quantity: number
  unitPrice: number
  selectedOptions?: SelectedOption[]
  optionsPriceModifier?: number
  cartKey: string
}

const viewModes: { mode: ViewMode; icon: typeof List; label: string }[] = [
  { mode: 'list', icon: List, label: 'List' },
  { mode: 'grid-small', icon: Grid3X3, label: 'Small' },
  { mode: 'grid-medium', icon: Grid2X2, label: 'Medium' },
  { mode: 'grid-large', icon: LayoutGrid, label: 'Large' },
]

export default function NewQuotePage() {
  const router = useRouter()
  const { currencySymbol, isLoaded: localizationLoaded } = useLocalization()
  const { settings: productSettings, isLoaded: settingsLoaded } = useProductSettings()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dataLoading, setDataLoading] = useState(true)
  const dataFetched = useRef(false)
  
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [notes, setNotes] = useState('')
  const [validityDays, setValidityDays] = useState(30)
  
  // Quantity inputs for each product (before adding to cart)
  const [productQuantities, setProductQuantities] = useState<Record<string, number>>({})
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [viewMode, setViewMode] = useState<ViewMode | null>(null)
  
  // Customer selection
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [newCustomerMode, setNewCustomerMode] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerEmail, setNewCustomerEmail] = useState('')
  const [creatingCustomer, setCreatingCustomer] = useState(false)
  
  // Cart modal (mobile)
  const [showMobileCart, setShowMobileCart] = useState(false)
  
  // Options modal state
  const [showOptionsModal, setShowOptionsModal] = useState(false)
  const [selectedProductForOptions, setSelectedProductForOptions] = useState<Product | null>(null)

  // Initialize view mode from settings
  useEffect(() => {
    if (settingsLoaded && viewMode === null) {
      setViewMode(productSettings.defaultView)
    }
  }, [settingsLoaded, productSettings.defaultView, viewMode])

  // Use effective view mode (with fallback)
  const effectiveViewMode: ViewMode = viewMode || productSettings.defaultView || 'grid-medium'

  useEffect(() => {
    if (dataFetched.current) return
    dataFetched.current = true
    
    async function fetchData() {
      try {
        const [custRes, prodRes, catRes] = await Promise.all([
          fetch('/api/customers/list'),
          fetch('/api/products/list'),
          fetch('/api/categories/list'),
        ])
        
        if (custRes.ok) {
          const data = await custRes.json()
          setCustomers(data.customers || [])
        }
        
        if (prodRes.ok) {
          const data = await prodRes.json()
          setProducts(data.products || [])
        }
        
        if (catRes.ok) {
          const data = await catRes.json()
          setCategories(data.categories || [])
        }
      } catch (err) {
        console.error('Failed to fetch data', err)
      } finally {
        setDataLoading(false)
      }
    }
    fetchData()
  }, [])

  // Get all category IDs to filter (including subcategories)
  const getFilterCategoryIds = (categoryId: string): string[] => {
    const category = categories.find(c => c.id === categoryId)
    if (!category) return [categoryId]
    if (category.hasChildren && category.children) {
      return [categoryId, ...category.children.map(c => c.id)]
    }
    return [categoryId]
  }

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = !searchQuery || 
        product.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.ref.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesCategory = !selectedCategory || 
        getFilterCategoryIds(selectedCategory).includes(product.category?.id || '')
      
      return matchesSearch && matchesCategory
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, searchQuery, selectedCategory, categories])

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers
    const query = customerSearch.toLowerCase()
    return customers.filter(c => 
      c.companyName.toLowerCase().includes(query) ||
      (c.country && c.country.toLowerCase().includes(query))
    )
  }, [customers, customerSearch])

  const getPrice = (price: number | string | null): number => {
    if (price === null) return 0
    return typeof price === 'string' ? parseFloat(price) : Number(price)
  }

  const productHasOptions = (product: Product): boolean => {
    const options = parseProductOptions(product.customFields)
    return options.optionGroups.length > 0
  }

  const generateCartKey = (productId: string, selectedOptions?: SelectedOption[]): string => {
    if (!selectedOptions || selectedOptions.length === 0) return productId
    const optionsKey = selectedOptions.map(o => `${o.groupId}:${o.optionId}`).sort().join('|')
    return `${productId}_${optionsKey}`
  }

  const getProductQuantity = (productId: string) => productQuantities[productId] || 1

  const setProductQuantity = (productId: string, qty: number) => {
    setProductQuantities(prev => ({ ...prev, [productId]: Math.max(1, qty) }))
  }

  const handleProductClick = (product: Product) => {
    const qty = getProductQuantity(product.id)
    if (productHasOptions(product)) {
      setSelectedProductForOptions(product)
      setShowOptionsModal(true)
    } else {
      addToCartWithOptions(product, [], 0, qty)
    }
  }

  const addToCartWithOptions = (product: Product, selectedOptions: SelectedOption[], optionsPriceModifier: number, qty: number = 1) => {
    const cartKey = generateCartKey(product.id, selectedOptions)
    setCart(prev => {
      const existing = prev.find(item => item.cartKey === cartKey)
      if (existing) {
        return prev.map(item => 
          item.cartKey === cartKey ? { ...item, quantity: item.quantity + qty } : item
        )
      }
      const basePrice = getPrice(product.priceDistributor)
      return [...prev, {
        productId: product.id,
        product,
        quantity: qty,
        unitPrice: basePrice + optionsPriceModifier,
        selectedOptions,
        optionsPriceModifier,
        cartKey,
      }]
    })
    // Reset quantity input after adding
    setProductQuantities(prev => ({ ...prev, [product.id]: 1 }))
  }

  const handleOptionsConfirm = (selectedOptions: SelectedOption[], totalPriceModifier: number) => {
    if (selectedProductForOptions) {
      const qty = getProductQuantity(selectedProductForOptions.id)
      addToCartWithOptions(selectedProductForOptions, selectedOptions, totalPriceModifier, qty)
      setShowOptionsModal(false)
      setSelectedProductForOptions(null)
    }
  }

  const updateCartQuantity = (cartKey: string, delta: number) => {
    setCart(prev => prev.map(item => 
      item.cartKey === cartKey ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
    ))
  }

  const setCartQuantity = (cartKey: string, quantity: number) => {
    setCart(prev => prev.map(item => 
      item.cartKey === cartKey ? { ...item, quantity: Math.max(1, quantity) } : item
    ))
  }

  const removeFromCart = (cartKey: string) => {
    setCart(prev => prev.filter(item => item.cartKey !== cartKey))
  }

  const handleCreateCustomer = async () => {
    if (!newCustomerName.trim() || !newCustomerEmail.trim()) return
    setCreatingCustomer(true)
    
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName: newCustomerName, email: newCustomerEmail }),
      })
      
      if (res.ok) {
        const data = await res.json()
        setCustomers(prev => [...prev, data.customer])
        setSelectedCustomer(data.customer)
        setShowCustomerModal(false)
        setNewCustomerMode(false)
        setNewCustomerName('')
        setNewCustomerEmail('')
      }
    } catch {
      console.error('Failed to create customer')
    } finally {
      setCreatingCustomer(false)
    }
  }

  const total = cart.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!selectedCustomer || cart.length === 0) {
      setError('Please select a customer and add items')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomer.id,
          notes,
          validityDays,
          lines: cart.map(item => ({
            productId: item.productId,
            productRef: item.product.ref,
            productNameEn: item.product.nameEn,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            selectedOptions: item.selectedOptions,
          })),
        }),
      })

      const data = await res.json()
      
      if (res.ok) {
        router.push(`/quotes/${data.quote.id}`)
      } else {
        setError(data.error || 'Failed to create quote')
      }
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  // Grid classes matching products page exactly
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

  if (!localizationLoaded || dataLoading) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0071e3]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-xl border-b border-[#d2d2d7]/30 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="h-14 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href="/quotes" className="text-[#0071e3] hover:text-[#0077ed] flex items-center gap-1 text-[13px]">
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Quotes</span>
              </Link>
              <h1 className="text-[17px] font-semibold text-[#1d1d1f]">New Quote</h1>
            </div>

            <div className="flex items-center gap-3">
              {/* Validity Period */}
              <div className="hidden sm:flex items-center gap-2 h-10 px-3 bg-[#f5f5f7] rounded-xl">
                <Calendar className="w-4 h-4 text-[#86868b]" />
                <select
                  value={validityDays}
                  onChange={(e) => setValidityDays(Number(e.target.value))}
                  className="bg-transparent text-[13px] text-[#1d1d1f] focus:outline-none"
                >
                  <option value={7}>Valid 7 days</option>
                  <option value={14}>Valid 14 days</option>
                  <option value={30}>Valid 30 days</option>
                  <option value={60}>Valid 60 days</option>
                  <option value={90}>Valid 90 days</option>
                </select>
              </div>

              {/* Customer Selection Button */}
              <button
                onClick={() => setShowCustomerModal(true)}
                className={`h-10 px-4 rounded-xl text-[13px] font-medium flex items-center gap-2 transition-colors ${
                  selectedCustomer 
                    ? 'bg-[#34c759]/10 text-[#34c759] border border-[#34c759]/30' 
                    : 'bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed]'
                }`}
              >
                <User className="w-4 h-4" />
                <span className="hidden sm:inline max-w-[150px] truncate">
                  {selectedCustomer ? selectedCustomer.companyName : 'Select Customer'}
                </span>
              </button>

              {/* Mobile cart button */}
              <button
                onClick={() => setShowMobileCart(true)}
                className="lg:hidden relative h-10 w-10 bg-[#0071e3] text-white rounded-xl flex items-center justify-center"
              >
                <ShoppingCart className="w-5 h-5" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#ff3b30] text-white text-[11px] font-bold rounded-full flex items-center justify-center">
                    {cartItemCount > 99 ? '99+' : cartItemCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex gap-6">
          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {/* Validity Period - Always visible */}
            <div className="bg-gradient-to-r from-[#0071e3]/10 to-[#0071e3]/5 rounded-2xl border border-[#0071e3]/20 p-4 mb-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#0071e3] rounded-xl flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-[13px] text-[#86868b]">Quote Validity Period</p>
                    <p className="text-[15px] font-semibold text-[#1d1d1f]">{validityDays} days from today</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {[7, 14, 30, 60, 90].map(days => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setValidityDays(days)}
                      className={`h-9 px-3 rounded-lg text-[13px] font-medium transition-all ${
                        validityDays === days 
                          ? 'bg-[#0071e3] text-white' 
                          : 'bg-white text-[#1d1d1f] hover:bg-[#f5f5f7] border border-[#d2d2d7]/50'
                      }`}
                    >
                      {days}d
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-3 sm:p-4 mb-6">
              <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search products..."
                    className="w-full h-10 pl-10 pr-4 bg-[#f5f5f7] border-0 rounded-xl text-[14px] text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  />
                </div>
                
                {/* Category Filter */}
                <div className="relative flex-shrink-0">
                  <select 
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="h-10 pl-3 pr-8 bg-[#f5f5f7] border-0 rounded-xl text-[13px] text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#0071e3] appearance-none cursor-pointer w-full sm:w-auto sm:min-w-[140px]"
                  >
                    <option value="">All Categories</option>
                    {categories.filter(cat => cat.isParent || !cat.parentId).map(cat => (
                      <optgroup key={cat.id} label={cat.nameEn}>
                        <option value={cat.id}>All {cat.nameEn}</option>
                        {categories.filter(subcat => subcat.parentId === cat.id).map(subcat => (
                          <option key={subcat.id} value={subcat.id}>└ {subcat.nameEn}</option>
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
                      type="button"
                      onClick={() => setViewMode(mode)}
                      title={label}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
                        viewMode === mode ? 'bg-white shadow-sm' : 'hover:bg-white/50'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${viewMode === mode ? 'text-[#1d1d1f]' : 'text-[#86868b]'}`} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Categories Row */}
            {categories.length > 0 && (
              <div className="space-y-3 mb-6">
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
                    <span className={`px-1.5 py-0.5 rounded text-[11px] ${!selectedCategory ? 'bg-white/20' : 'bg-[#f5f5f7]'}`}>
                      {products.length}
                    </span>
                  </button>
                  {categories.filter(cat => cat.isParent || !cat.parentId).map(cat => {
                    const childIds = cat.children?.map(c => c.id) || []
                    const totalProducts = (cat._count?.products || 0) + 
                      categories.filter(c => childIds.includes(c.id)).reduce((sum, c) => sum + (c._count?.products || 0), 0)
                    
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium whitespace-nowrap transition-all ${
                          selectedCategory === cat.id 
                            ? 'bg-[#0071e3] text-white' 
                            : 'bg-white border border-[#d2d2d7]/30 text-[#1d1d1f] hover:bg-[#f5f5f7]'
                        }`}
                      >
                        <Folder className="w-4 h-4" />
                        {cat.nameEn}
                        {cat.hasChildren && <ChevronRight className={`w-3 h-3 transition-transform ${selectedCategory === cat.id ? 'rotate-90' : ''}`} />}
                        <span className={`px-1.5 py-0.5 rounded text-[11px] ${selectedCategory === cat.id ? 'bg-white/20' : 'bg-[#f5f5f7]'}`}>
                          {totalProducts}
                        </span>
                      </button>
                    )
                  })}
                </div>
                
                {/* Subcategories Row */}
                {selectedCategory && (() => {
                  const selectedParent = categories.find(c => c.id === selectedCategory && c.hasChildren)
                  if (!selectedParent) return null
                  const subcategories = categories.filter(c => c.parentId === selectedCategory)
                  if (subcategories.length === 0) return null
                  
                  return (
                    <div className="flex gap-2 overflow-x-auto pb-2 pl-4 border-l-2 border-[#0071e3]/30">
                      {subcategories.map(subcat => (
                        <button
                          key={subcat.id}
                          onClick={() => setSelectedCategory(subcat.id)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-medium whitespace-nowrap transition-all ${
                            selectedCategory === subcat.id 
                              ? 'bg-[#0071e3] text-white' 
                              : 'bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed]'
                          }`}
                        >
                          {subcat.nameEn}
                          <span className={`px-1 py-0.5 rounded text-[10px] ${selectedCategory === subcat.id ? 'bg-white/20' : 'bg-white'}`}>
                            {subcat._count?.products || 0}
                          </span>
                        </button>
                      ))}
                    </div>
                  )
                })()}
              </div>
            )}

            {/* Products Grid/List */}
            <div className="mb-4 text-[14px] text-[#86868b]">
              {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
            </div>

            {filteredProducts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-12 text-center">
                <Package className="w-12 h-12 text-[#86868b] mx-auto mb-4" />
                <p className="text-[15px] text-[#1d1d1f] font-medium">No products found</p>
                <p className="text-[14px] text-[#86868b] mt-1">Try adjusting your search or category filter</p>
              </div>
            ) : (
              <div className={getGridClasses()}>
                {filteredProducts.map((product) => {
                  const hasOptions = productHasOptions(product)
                  const inCart = cart.find(item => item.productId === product.id)
                  const qty = getProductQuantity(product.id)
                  
                  if (viewMode === 'list') {
                    return (
                      <div
                        key={product.id}
                        className={`bg-white rounded-xl border p-3 transition-all flex items-center gap-3 ${
                          inCart ? 'border-[#0071e3] bg-[#0071e3]/5' : 'border-[#d2d2d7]/30 hover:border-[#0071e3]/40 hover:shadow-md'
                        }`}
                      >
                        {/* Image */}
                        <div className="w-10 h-10 bg-[#f5f5f7] rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {product.photoUrl ? (
                            <img src={product.photoUrl} alt={product.nameEn} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-5 h-5 text-[#86868b]" />
                          )}
                        </div>
                        
                        {/* Ref */}
                        <div className="w-20 flex-shrink-0">
                          <p className="text-[11px] text-[#86868b] font-mono truncate">{product.ref}</p>
                        </div>
                        
                        {/* Name */}
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <p className="text-[13px] font-medium text-[#1d1d1f] truncate">{product.nameEn}</p>
                        </div>
                        
                        {/* Options badge */}
                        {hasOptions && (
                          <span className="hidden sm:inline-block text-[10px] font-medium px-2 py-1 bg-[#ff9500]/10 text-[#ff9500] rounded flex-shrink-0">
                            Options
                          </span>
                        )}
                        
                        {/* In cart indicator */}
                        {inCart && (
                          <span className="text-[10px] font-medium px-2 py-1 bg-[#0071e3]/10 text-[#0071e3] rounded flex-shrink-0">
                            {inCart.quantity} in cart
                          </span>
                        )}
                        
                        {/* Price */}
                        <p className="text-[14px] font-semibold text-[#0071e3] flex-shrink-0 w-20 text-right">
                          {currencySymbol}{getPrice(product.priceDistributor).toFixed(2)}
                        </p>
                        
                        {/* Quantity Input + Add Button */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {inCart ? (
                            // If in cart, show cart quantity controls
                            <div className="flex items-center rounded-lg overflow-hidden bg-[#0071e3]/5" style={{ border: '1px solid rgba(0, 113, 227, 0.3)' }}>
                              <button
                                onClick={() => updateCartQuantity(inCart.cartKey, -1)}
                                className="w-8 h-8 flex items-center justify-center hover:bg-[#0071e3]/10 transition-colors"
                                disabled={inCart.quantity <= 1}
                              >
                                <Minus className={`w-3 h-3 ${inCart.quantity <= 1 ? 'text-[#86868b]' : 'text-[#0071e3]'}`} />
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={inCart.quantity}
                                onChange={(e) => setCartQuantity(inCart.cartKey, parseInt(e.target.value) || 1)}
                                className="w-12 h-8 text-center text-[12px] font-semibold bg-transparent text-[#0071e3] focus:outline-none"
                              />
                              <button
                                onClick={() => updateCartQuantity(inCart.cartKey, 1)}
                                className="w-8 h-8 flex items-center justify-center hover:bg-[#0071e3]/10 transition-colors"
                              >
                                <Plus className="w-3 h-3 text-[#0071e3]" />
                              </button>
                            </div>
                          ) : (
                            // If not in cart, show add quantity controls
                            <div className="flex items-center rounded-lg overflow-hidden" style={{ border: '1px solid rgba(210, 210, 215, 0.5)' }}>
                              <button
                                onClick={() => setProductQuantity(product.id, qty - 1)}
                                className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 transition-colors"
                                disabled={qty <= 1}
                              >
                                <Minus className="w-3 h-3 text-[#86868b]" />
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={qty}
                                onChange={(e) => setProductQuantity(product.id, parseInt(e.target.value) || 1)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    handleProductClick(product)
                                  }
                                }}
                                className="w-12 h-8 text-center text-[12px] font-medium bg-transparent focus:outline-none"
                              />
                              <button
                                onClick={() => setProductQuantity(product.id, qty + 1)}
                                className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 transition-colors"
                              >
                                <Plus className="w-3 h-3 text-[#86868b]" />
                              </button>
                            </div>
                          )}
                          <button 
                            onClick={() => handleProductClick(product)} 
                            className={`h-8 px-3 rounded-lg flex items-center justify-center gap-1.5 text-[12px] font-medium ${
                              inCart 
                                ? 'bg-[#34c759] text-white hover:bg-[#2db14e]' 
                                : 'bg-[#0071e3] text-white hover:bg-[#0077ed]'
                            }`}
                          >
                            {hasOptions ? <Settings2 className="w-3.5 h-3.5" /> : <ShoppingCart className="w-3.5 h-3.5" />}
                            {inCart ? 'Add more' : 'Add'}
                          </button>
                        </div>
                      </div>
                    )
                  }

                  // Grid Views
                  return (
                    <div
                      key={product.id}
                      className={`bg-white rounded-2xl border overflow-hidden transition-all duration-300 group relative ${
                        inCart ? 'border-[#0071e3] ring-2 ring-[#0071e3]/20' : 'border-[#d2d2d7]/30 hover:border-[#0071e3]/40 hover:shadow-lg'
                      }`}
                    >
                      {/* In cart badge */}
                      {inCart && (
                        <div className="absolute top-3 left-3 z-10 w-6 h-6 bg-[#0071e3] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                          {inCart.quantity}
                        </div>
                      )}
                      
                      {/* Options badge */}
                      {hasOptions && (
                        <div className={`absolute top-3 right-3 z-10 bg-[#ff9500] rounded-full flex items-center justify-center shadow-sm ${
                          viewMode === 'grid-small' ? 'w-5 h-5' : 'w-6 h-6'
                        }`}>
                          <Settings2 className={viewMode === 'grid-small' ? 'w-3 h-3 text-white' : 'w-3.5 h-3.5 text-white'} />
                        </div>
                      )}
                      
                      {/* Product Image */}
                      <div className={`bg-[#f5f5f7] flex items-center justify-center overflow-hidden group-hover:bg-[#f0f0f5] transition-colors ${
                        viewMode === 'grid-small' ? 'aspect-square' :
                        viewMode === 'grid-large' ? 'aspect-square' : 
                        'aspect-square'
                      }`}>
                        {product.photoUrl ? (
                          <img 
                            src={product.photoUrl} 
                            alt={product.nameEn} 
                            className="w-full h-full object-contain p-2" 
                          />
                        ) : (
                          <Package className={`text-[#86868b] ${
                            viewMode === 'grid-small' ? 'w-8 h-8' :
                            viewMode === 'grid-large' ? 'w-16 h-16' : 
                            'w-12 h-12'
                          }`} />
                        )}
                      </div>
                      
                      {/* Product Info */}
                      <div className={`${viewMode === 'grid-small' ? 'p-2' : 'p-4'} flex flex-col`}>
                        {/* Ref */}
                        <p className={`text-[#86868b] font-mono truncate ${viewMode === 'grid-small' ? 'text-[9px] mb-0.5' : 'text-[11px] mb-1'}`}>
                          {product.ref}
                        </p>
                        
                        {/* Name */}
                        <h3 className={`font-medium text-[#1d1d1f] overflow-hidden ${
                          viewMode === 'grid-small' ? 'text-[11px] line-clamp-2 min-h-[28px]' : 
                          viewMode === 'grid-large' ? 'text-[15px] line-clamp-2 min-h-[44px]' :
                          'text-[13px] line-clamp-2 min-h-[36px]'
                        }`}>
                          {product.nameEn}
                        </h3>
                        
                        {/* Chinese name */}
                        {product.nameCn && viewMode === 'grid-large' && (
                          <p className="text-[12px] text-[#86868b] mt-1 truncate">{product.nameCn}</p>
                        )}
                        
                        {/* Price */}
                        <p className={`font-semibold text-[#0071e3] mt-2 ${
                          viewMode === 'grid-small' ? 'text-[12px]' : 
                          viewMode === 'grid-large' ? 'text-[18px]' : 
                          'text-[15px]'
                        }`}>
                          {currencySymbol}{getPrice(product.priceDistributor).toFixed(2)}
                        </p>
                        
                        {/* Quantity & Add to Cart */}
                        <div className={`flex items-center gap-2 ${viewMode === 'grid-small' ? 'mt-2' : 'mt-3'}`}>
                          <div 
                            className="flex items-center rounded-lg overflow-hidden flex-1"
                            style={{ border: '1px solid rgba(210, 210, 215, 0.5)' }}
                          >
                            <button
                              onClick={() => setProductQuantity(product.id, qty - 1)}
                              className={`flex items-center justify-center hover:bg-gray-100 transition-colors ${
                                viewMode === 'grid-small' ? 'w-6 h-6' : 'w-8 h-8'
                              }`}
                              disabled={qty <= 1}
                            >
                              <Minus className={`${viewMode === 'grid-small' ? 'w-2.5 h-2.5' : 'w-3 h-3'} text-[#86868b]`} />
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={qty}
                              onChange={(e) => setProductQuantity(product.id, parseInt(e.target.value) || 1)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  handleProductClick(product)
                                }
                              }}
                              className={`text-center font-medium bg-transparent focus:outline-none ${
                                viewMode === 'grid-small' ? 'w-8 h-6 text-[10px]' : 'w-10 h-8 text-[12px]'
                              }`}
                            />
                            <button
                              onClick={() => setProductQuantity(product.id, qty + 1)}
                              className={`flex items-center justify-center hover:bg-gray-100 transition-colors ${
                                viewMode === 'grid-small' ? 'w-6 h-6' : 'w-8 h-8'
                              }`}
                            >
                              <Plus className={`${viewMode === 'grid-small' ? 'w-2.5 h-2.5' : 'w-3 h-3'} text-[#86868b]`} />
                            </button>
                          </div>

                          <button
                            onClick={() => handleProductClick(product)}
                            className={`bg-[#0071e3] text-white rounded-lg flex items-center justify-center gap-1 font-medium hover:bg-[#0077ed] transition-colors ${
                              viewMode === 'grid-small' ? 'h-6 px-2 text-[10px]' : 'h-8 px-3 text-[12px]'
                            }`}
                          >
                            {hasOptions ? (
                              <Settings2 className={viewMode === 'grid-small' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
                            ) : (
                              <ShoppingCart className={viewMode === 'grid-small' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
                            )}
                            <span className={viewMode === 'grid-small' ? 'hidden' : ''}>Add</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </main>

          {/* Cart Sidebar (Desktop) */}
          <aside className="hidden lg:block w-80 flex-shrink-0">
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-[#d2d2d7]/30 sticky top-20 overflow-hidden">
              <div className="p-4 border-b border-[#d2d2d7]/30 bg-[#f5f5f7]">
                <div className="flex items-center justify-between">
                  <h2 className="text-[15px] font-semibold text-[#1d1d1f] flex items-center gap-2">
                    <ClipboardList className="w-5 h-5" />
                    Quote Items
                  </h2>
                  <span className="text-[13px] text-[#86868b]">{cartItemCount} items</span>
                </div>
              </div>

              <div className="max-h-[45vh] overflow-y-auto">
                {cart.length === 0 ? (
                  <div className="p-8 text-center">
                    <ClipboardList className="w-10 h-10 text-[#d2d2d7] mx-auto mb-2" />
                    <p className="text-[14px] text-[#86868b]">Your quote is empty</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#d2d2d7]/30">
                    {cart.map((item) => (
                      <div key={item.cartKey} className="p-3">
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium text-[#1d1d1f] line-clamp-1">{item.product.nameEn}</p>
                            <p className="text-[11px] text-[#86868b]">{item.product.ref} · {currencySymbol}{item.unitPrice.toFixed(2)}</p>
                          </div>
                          <button type="button" onClick={() => removeFromCart(item.cartKey)} className="text-[#ff3b30] p-1 hover:bg-[#ff3b30]/10 rounded">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1">
                            <button 
                              type="button" 
                              onClick={() => updateCartQuantity(item.cartKey, -1)} 
                              disabled={item.quantity <= 1}
                              className="w-7 h-7 flex items-center justify-center rounded-md bg-[#f5f5f7] hover:bg-[#e8e8ed] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => setCartQuantity(item.cartKey, parseInt(e.target.value) || 1)}
                              className="w-14 h-7 text-center text-[13px] font-medium bg-[#f5f5f7] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                            />
                            <button type="button" onClick={() => updateCartQuantity(item.cartKey, 1)} className="w-7 h-7 flex items-center justify-center rounded-md bg-[#f5f5f7] hover:bg-[#e8e8ed]">
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <p className="text-[14px] font-medium text-[#1d1d1f]">{currencySymbol}{(item.quantity * item.unitPrice).toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-3 border-t border-[#d2d2d7]/30">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Quote notes..."
                  className="w-full px-3 py-2 bg-[#f5f5f7] rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0071e3] resize-none"
                />
              </div>

              <div className="p-4 border-t border-[#d2d2d7]/30 bg-[#f5f5f7]">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[14px] text-[#86868b]">Total</span>
                  <span className="text-[20px] font-bold text-[#1d1d1f]">{currencySymbol}{total.toFixed(2)}</span>
                </div>
                
                {/* Status messages */}
                {error && <div className="text-[12px] text-[#ff3b30] bg-[#ff3b30]/10 px-3 py-2 rounded-lg mb-3">{error}</div>}
                {!selectedCustomer && (
                  <div className="text-[12px] text-[#ff9500] bg-[#ff9500]/10 px-3 py-2 rounded-lg mb-3 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>Please select a customer first</span>
                    <button type="button" onClick={() => setShowCustomerModal(true)} className="ml-auto text-[#0071e3] font-medium hover:underline">Select</button>
                  </div>
                )}
                {cart.length === 0 && (
                  <div className="text-[12px] text-[#86868b] bg-[#f0f0f0] px-3 py-2 rounded-lg mb-3 flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4" />
                    <span>Add products to your quote</span>
                  </div>
                )}
                
                <button
                  type="submit"
                  disabled={loading || !selectedCustomer || cart.length === 0}
                  className="w-full h-11 flex items-center justify-center gap-2 bg-[#0071e3] text-white text-[14px] font-medium rounded-xl disabled:bg-[#d2d2d7] hover:bg-[#0077ed] transition-colors"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><ClipboardList className="w-4 h-4" />Create Quote</>}
                </button>
              </div>
            </form>
          </aside>
        </div>
      </div>

      {/* Customer Selection Modal */}
      {showCustomerModal && (
        <Portal>
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setShowCustomerModal(false); setNewCustomerMode(false) }}>
            <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-[#d2d2d7]/30">
                <h2 className="text-[17px] font-semibold text-[#1d1d1f]">{newCustomerMode ? 'New Customer' : 'Select Customer'}</h2>
                <button onClick={() => { setShowCustomerModal(false); setNewCustomerMode(false) }} className="p-2 hover:bg-[#f5f5f7] rounded-lg"><X className="w-5 h-5" /></button>
              </div>

              {newCustomerMode ? (
                <div className="p-4">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[13px] font-medium text-[#86868b] mb-1">Company Name *</label>
                      <input type="text" value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} placeholder="Enter company name..." className="w-full h-11 px-4 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]" autoFocus />
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-[#86868b] mb-1">Email *</label>
                      <input type="email" value={newCustomerEmail} onChange={(e) => setNewCustomerEmail(e.target.value)} placeholder="Enter email..." className="w-full h-11 px-4 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]" />
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button type="button" onClick={() => setNewCustomerMode(false)} className="flex-1 h-11 bg-[#f5f5f7] text-[#1d1d1f] text-[14px] font-medium rounded-xl hover:bg-[#e8e8ed]">Back</button>
                    <button type="button" onClick={handleCreateCustomer} disabled={creatingCustomer || !newCustomerName.trim() || !newCustomerEmail.trim()} className="flex-1 h-11 bg-[#0071e3] text-white text-[14px] font-medium rounded-xl hover:bg-[#0077ed] disabled:bg-[#d2d2d7] flex items-center justify-center gap-2">
                      {creatingCustomer ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                      Create
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="p-4 border-b border-[#d2d2d7]/30">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" />
                      <input type="text" value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} placeholder="Search customers..." className="w-full h-10 pl-10 pr-4 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]" autoFocus />
                    </div>
                  </div>
                  <div className="max-h-[50vh] overflow-y-auto">
                    <button onClick={() => setNewCustomerMode(true)} className="w-full flex items-center gap-3 p-4 hover:bg-[#f5f5f7] transition-colors border-b border-[#d2d2d7]/30">
                      <div className="w-10 h-10 bg-[#34c759]/10 rounded-xl flex items-center justify-center"><UserPlus className="w-5 h-5 text-[#34c759]" /></div>
                      <div className="text-left"><p className="text-[14px] font-medium text-[#34c759]">Create New Customer</p></div>
                    </button>
                    {filteredCustomers.map(customer => (
                      <button key={customer.id} onClick={() => { setSelectedCustomer(customer); setShowCustomerModal(false) }} className={`w-full flex items-center gap-3 p-4 hover:bg-[#f5f5f7] transition-colors ${selectedCustomer?.id === customer.id ? 'bg-[#0071e3]/5' : ''}`}>
                        <div className="w-10 h-10 bg-gradient-to-br from-[#0071e3] to-[#00c7be] rounded-xl flex items-center justify-center">
                          <span className="text-[14px] font-semibold text-white">{customer.companyName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}</span>
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-[14px] font-medium text-[#1d1d1f]">{customer.companyName}</p>
                          {customer.country && <p className="text-[12px] text-[#86868b]">{customer.country}</p>}
                        </div>
                        {selectedCustomer?.id === customer.id && <Check className="w-5 h-5 text-[#0071e3]" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </Portal>
      )}

      {/* Mobile Cart Modal */}
      {showMobileCart && (
        <Portal>
          <div className="fixed inset-0 bg-black/50 z-50 lg:hidden" onClick={() => setShowMobileCart(false)}>
            <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white" onClick={(e) => e.stopPropagation()}>
              <form onSubmit={handleSubmit} className="h-full flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-[#d2d2d7]/30">
                  <h2 className="text-[17px] font-semibold text-[#1d1d1f]">Quote ({cartItemCount})</h2>
                  <button type="button" onClick={() => setShowMobileCart(false)} className="p-2"><X className="w-5 h-5" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  {cart.length === 0 ? (
                    <div className="text-center py-12"><ClipboardList className="w-12 h-12 text-[#d2d2d7] mx-auto mb-3" /><p className="text-[15px] text-[#86868b]">Your quote is empty</p></div>
                  ) : (
                    <div className="space-y-3">
                      {cart.map((item) => (
                        <div key={item.cartKey} className="bg-[#f5f5f7] rounded-xl p-3">
                          <div className="flex items-start justify-between">
                            <div><p className="text-[14px] font-medium text-[#1d1d1f]">{item.product.nameEn}</p><p className="text-[12px] text-[#86868b]">{item.product.ref}</p></div>
                            <button type="button" onClick={() => removeFromCart(item.cartKey)} className="text-[#ff3b30] p-1"><Trash2 className="w-4 h-4" /></button>
                          </div>
                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center gap-2">
                              <button 
                                type="button" 
                                onClick={() => updateCartQuantity(item.cartKey, -1)} 
                                disabled={item.quantity <= 1}
                                className="w-8 h-8 bg-white rounded-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => setCartQuantity(item.cartKey, parseInt(e.target.value) || 1)}
                                className="w-16 h-8 text-center text-[14px] font-medium bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                              />
                              <button type="button" onClick={() => updateCartQuantity(item.cartKey, 1)} className="w-8 h-8 bg-white rounded-lg flex items-center justify-center"><Plus className="w-4 h-4" /></button>
                            </div>
                            <p className="text-[15px] font-semibold">{currencySymbol}{(item.quantity * item.unitPrice).toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="border-t border-[#d2d2d7]/30 p-4 bg-[#f5f5f7]">
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Quote notes..." className="w-full px-3 py-2 bg-white rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3] resize-none mb-3" />
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[15px] font-semibold">Total</span>
                    <span className="text-[22px] font-bold text-[#0071e3]">{currencySymbol}{total.toFixed(2)}</span>
                  </div>
                  {error && <div className="text-[13px] text-[#ff3b30] bg-[#ff3b30]/10 px-4 py-3 rounded-xl mb-3">{error}</div>}
                  <button type="submit" disabled={loading || !selectedCustomer || cart.length === 0} className="w-full h-12 flex items-center justify-center bg-[#0071e3] text-white text-[15px] font-medium rounded-xl disabled:bg-[#d2d2d7]">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Quote'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}

      {/* Options Modal */}
      {showOptionsModal && selectedProductForOptions && (
        <ProductOptionSelector
          productName={selectedProductForOptions.nameEn}
          productImage={selectedProductForOptions.photoUrl || undefined}
          customFields={selectedProductForOptions.customFields}
          basePrice={getPrice(selectedProductForOptions.priceDistributor)}
          currency={currencySymbol}
          onConfirm={handleOptionsConfirm}
          onCancel={() => { setShowOptionsModal(false); setSelectedProductForOptions(null) }}
        />
      )}

      {/* Sticky Bottom Bar - ALWAYS visible */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-[240px] bg-white border-t border-[#d2d2d7]/50 shadow-lg z-40">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Left side - Quote info */}
            <div className="flex items-center gap-4 lg:gap-6">
              {/* Customer */}
              <div className="hidden sm:block">
                <p className="text-[11px] text-[#86868b]">Customer</p>
                <p className="text-[13px] font-medium text-[#1d1d1f] max-w-[120px] truncate">
                  {selectedCustomer ? selectedCustomer.companyName : '—'}
                </p>
              </div>
              {/* Validity */}
              <div className="hidden md:block">
                <p className="text-[11px] text-[#86868b]">Validity</p>
                <p className="text-[13px] font-medium text-[#1d1d1f]">{validityDays} days</p>
              </div>
              {/* Items */}
              <div>
                <p className="text-[11px] text-[#86868b]">Items</p>
                <p className="text-[14px] font-medium text-[#1d1d1f]">{cartItemCount}</p>
              </div>
              {/* Total */}
              <div>
                <p className="text-[11px] text-[#86868b]">Total</p>
                <p className="text-[18px] font-bold text-[#0071e3]">{currencySymbol}{total.toFixed(2)}</p>
              </div>
            </div>
            
            {/* Right side - Actions */}
            <div className="flex items-center gap-2 lg:gap-3">
              {error && (
                <span className="hidden lg:inline text-[12px] text-[#ff3b30] bg-[#ff3b30]/10 px-3 py-1.5 rounded-lg">{error}</span>
              )}
              
              {/* View Cart Button (mobile/tablet) */}
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowMobileCart(true)}
                  className="lg:hidden h-10 px-3 bg-[#f5f5f7] text-[#1d1d1f] text-[13px] font-medium rounded-xl hover:bg-[#e8e8ed] flex items-center gap-2"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span className="hidden sm:inline">Cart</span>
                </button>
              )}
              
              {/* Select Customer Button */}
              {!selectedCustomer && (
                <button
                  type="button"
                  onClick={() => setShowCustomerModal(true)}
                  className="h-10 px-3 lg:px-4 bg-[#ff9500] text-white text-[13px] font-medium rounded-xl hover:bg-[#ff9500]/90 flex items-center gap-2"
                >
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">Select Customer</span>
                </button>
              )}
              
              {/* Create Quote Button */}
              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={loading || !selectedCustomer || cart.length === 0}
                className="h-10 px-4 lg:px-6 bg-[#0071e3] text-white text-[13px] lg:text-[14px] font-medium rounded-xl hover:bg-[#0077ed] disabled:bg-[#d2d2d7] disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <ClipboardList className="w-4 h-4" />
                    <span>Create Quote</span>
                  </>
                )}
              </button>
            </div>
          </div>
          
          {/* Warning messages */}
          {(error || (!selectedCustomer && cart.length > 0) || cart.length === 0) && (
            <div className="mt-2 flex flex-wrap gap-2">
              {error && (
                <span className="text-[12px] text-[#ff3b30] bg-[#ff3b30]/10 px-2 py-1 rounded">{error}</span>
              )}
              {!selectedCustomer && cart.length > 0 && (
                <span className="text-[12px] text-[#ff9500] bg-[#ff9500]/10 px-2 py-1 rounded flex items-center gap-1">
                  <User className="w-3 h-3" />
                  Select a customer to create the quote
                </span>
              )}
              {cart.length === 0 && (
                <span className="text-[12px] text-[#86868b] bg-[#f5f5f7] px-2 py-1 rounded flex items-center gap-1">
                  <ShoppingCart className="w-3 h-3" />
                  Add products to create a quote
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Bottom padding to prevent content from being hidden by sticky bar */}
      <div className="h-20 lg:h-16" />
    </div>
  )
}
