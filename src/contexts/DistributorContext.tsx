'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from 'react'
import { COMPANY_CONFIG, getMinQuantity, isFeatureEnabled } from '@/config/features'
import { formatNumber } from '@/lib/utils'
import { getDefaultCurrency } from '@/hooks/useLocalization'
import { usePreview } from '@/contexts/PreviewContext'

// ============================================
// TYPES
// ============================================

export type Currency = 'RMB' | 'EUR' | 'USD'

export interface ProductPrices {
  RMB: number
  EUR: number
  USD: number
}

export interface PricingRuleBreak {
  minQuantity: number
  maxQuantity: number | null
  value: number
}

export interface PricingRule {
  id: string
  name: string
  code: string
  type: 'PERCENTAGE' | 'FIXED_PRICE'
  breaks: PricingRuleBreak[]
}

export interface Product {
  id: string
  ref: string
  nameEn: string
  nameCn?: string
  descriptionEn?: string
  descriptionCn?: string
  price?: number // Single price for the customer's tier
  prices?: ProductPrices | Record<string, number> // Legacy or tier-specific prices
  allPrices?: Record<string, number> // All tier prices for reference
  priceTier?: string // Which tier the price is from
  category: string
  categoryId?: string
  stock: number
  moq: number
  material?: string
  hsCode?: string
  weight?: number
  imageUrl?: string
  priceRmb?: number
  customFields?: unknown
  pricingRules?: PricingRule[]
}

export interface SelectedProductOption {
  groupId: string
  groupName: string
  optionId: string
  optionName: string
  priceModifier: number
}

export interface CartItem {
  product: Product
  quantity: number
  note?: string
  selectedOptions?: SelectedProductOption[]  // Options selected by customer
  optionsPriceModifier?: number  // Total price adjustment from options
}

export interface Address {
  id: string
  label: string
  company: string
  contactName: string
  street: string
  city: string
  postalCode: string
  country: string
  phone?: string
  isDefault?: boolean
}

export interface Notification {
  id: string
  type: 'order' | 'info' | 'promo' | 'quote'
  title: string
  message: string
  date: string
  read: boolean
  link?: string
}

export interface DraftOrder {
  id: string
  name: string
  items: CartItem[]
  createdAt: string
}

export interface Quote {
  id: string
  number: string
  status: 'draft' | 'sent' | 'accepted' | 'expired' | 'rejected'
  items: CartItem[]
  subtotalDisplay: number
  subtotalInvoice: number
  displayCurrency: Currency
  invoiceCurrency: Currency
  shippingMethod: string
  shippingAddressId: string | null
  billingAddressId: string | null
  poNumber?: string
  requestedDate?: string
  instructions?: string
  createdAt: string
  expiresAt: string
  convertedOrderId?: string
}

export interface OrderStatusHistory {
  status: string
  date: string
  note?: string
}

export interface OrderModificationRecord {
  id: string
  version: number
  timestamp: string
  reason: string
  changes: {
    type: 'added' | 'removed' | 'modified'
    productId: string
    productRef: string
    productName: string
    oldQuantity?: number
    newQuantity?: number
  }[]
  surchargeApplied: number
  previousTotal: number
  newTotal: number
}

export interface OrderItem {
  id: string
  ref: string
  name: string
  quantity: number
  price: number
  selectedOptions?: SelectedProductOption[]
  optionsPriceModifier?: number
  serials?: string[]
}

export interface Order {
  id: string
  number: string
  status: 'pending' | 'confirmed' | 'preparing' | 'shipped' | 'delivered' | 'cancelled'
  items: OrderItem[]
  subtotal: number
  shipping: number
  total: number
  currency: Currency
  shippingMethod: string
  shippingAddressId: string | null
  billingAddressId: string | null
  poNumber?: string
  requestedDate?: string
  instructions?: string
  trackingNumber?: string
  trackingUrl?: string
  createdAt: string
  fromQuoteId?: string
  statusHistory: OrderStatusHistory[]
  version?: number
  modifications?: OrderModificationRecord[]
}

export interface DistributorUser {
  id: string
  name: string
  email: string
  company: string
  priceType: string
  displayCurrency: Currency
  invoiceCurrency: Currency
  paymentTerms?: string
  overrides: {
    stockVisible: boolean | null
    canGenerateQuotes: boolean | null
  }
}

export interface CheckoutData {
  shippingMethod: string
  shippingDetails: string
  shippingAddressId: string | null
  billingAddressId: string | null
  instructions: string
  poNumber: string
  requestedDate: string
  fromQuoteId?: string
}

// ============================================
// CURRENCY SYMBOLS
// ============================================

export const CURRENCY_SYMBOLS: Record<string, string> = {
  RMB: '¥',
  EUR: '€',
  USD: '$',
  GBP: '£',
  AUD: 'A$',
  CAD: 'C$',
  BRL: 'R$',
  JPY: '¥',
  KRW: '₩',
  SGD: 'S$',
  CHF: 'CHF',
}

// ============================================
// CONTEXT STATE
// ============================================

interface DistributorState {
  config: typeof COMPANY_CONFIG
  user: DistributorUser | null
  effectiveSettings: {
    stockVisible: boolean
    canGenerateQuotes: boolean
    hasFavorites: boolean
    hasDrafts: boolean
    hasNotifications: boolean
  }
  
  getDisplayPrice: (product: Product) => number
  getInvoicePrice: (product: Product) => number
  formatDisplayPrice: (product: Product) => string
  formatInvoicePrice: (product: Product) => string
  calculatePriceWithRules: (product: Product, quantity: number) => number
  displayCurrencySymbol: string
  invoiceCurrencySymbol: string
  
  cart: CartItem[]
  addToCart: (product: Product, quantity?: number, note?: string, selectedOptions?: SelectedProductOption[], optionsPriceModifier?: number) => void
  updateCartItem: (productId: string, quantity: number, note?: string) => void
  removeFromCart: (productId: string, selectedOptions?: SelectedProductOption[]) => void
  clearCart: () => void
  setCart: (items: CartItem[]) => void
  getCartTotal: () => number
  getCartTotalInvoice: () => number
  getCartItemCount: () => number
  
  favorites: string[]
  toggleFavorite: (productId: string) => void
  isFavorite: (productId: string) => boolean
  cleanupInvalidFavorites: (validProductIds: string[]) => void
  
  addresses: Address[]
  addAddress: (address: Omit<Address, 'id'>) => void
  updateAddress: (id: string, address: Partial<Address>) => void
  deleteAddress: (id: string) => void
  setDefaultAddress: (id: string) => void
  
  notifications: Notification[]
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  unreadCount: number
  
  drafts: DraftOrder[]
  saveDraft: (name: string) => void
  loadDraft: (id: string) => void
  deleteDraft: (id: string) => void
  
  quotes: Quote[]
  saveQuote: (quoteData: Omit<Quote, 'id' | 'number' | 'createdAt' | 'expiresAt'>) => Quote
  updateQuoteStatus: (id: string, status: Quote['status']) => void
  convertQuoteToOrder: (id: string) => void
  loadQuoteForModification: (id: string, mode: 'replace' | 'merge') => void
  deleteQuote: (id: string) => void
  
  orders: Order[]
  createOrder: (orderData: Omit<Order, 'id' | 'number' | 'createdAt' | 'statusHistory'>) => Order
  updateOrderStatus: (id: string, status: Order['status'], note?: string) => void
  cancelOrder: (id: string, reason?: string) => void
  modifyOrder: (
    orderId: string,
    newItems: { id: string; ref: string; name: string; quantity: number; price: number }[],
    reason: string,
    surchargeAmount: number
  ) => { success: boolean; order?: Order }
  
  checkout: CheckoutData
  updateCheckout: (data: Partial<CheckoutData>) => void
  resetCheckout: () => void
  
  recentlyViewed: string[]
  addToRecentlyViewed: (productId: string) => void
}

// ============================================
// DEFAULTS
// ============================================

const defaultCheckout: CheckoutData = {
  shippingMethod: 'sea',
  shippingDetails: '',
  shippingAddressId: null,
  billingAddressId: null,
  instructions: '',
  poNumber: '',
  requestedDate: '',
}

// ============================================
// CONTEXT
// ============================================

const DistributorContext = createContext<DistributorState | undefined>(undefined)

// ============================================
// PROVIDER
// ============================================

export function DistributorProvider({ children }: { children: ReactNode }) {
  // Check if in preview mode
  let previewContext: {
    isPreviewMode: boolean
    previewCustomer: { id: string; name: string; email: string; currency?: string; priceType?: string; paymentTerms?: string } | null
  } | null = null
  try {
    previewContext = usePreview()
  } catch {
    // Preview context not available (e.g., not wrapped in PreviewProvider)
  }
  
  const isPreviewMode = previewContext?.isPreviewMode ?? false
  const previewCustomer = previewContext?.previewCustomer ?? null
  
  // In preview mode, create user from preview customer data
  const previewUser: DistributorUser | null = useMemo(() => {
    if (isPreviewMode && previewCustomer) {
      return {
        id: previewCustomer.id,
        name: previewCustomer.name,
        email: previewCustomer.email,
        company: previewCustomer.name,
        priceType: previewCustomer.priceType || 'DISTRIBUTOR',
        displayCurrency: (previewCustomer.currency || 'EUR') as Currency,
        invoiceCurrency: (previewCustomer.currency || 'EUR') as Currency,
        paymentTerms: previewCustomer.paymentTerms || 'Net 30',
        overrides: {
          stockVisible: null,
          canGenerateQuotes: null,
        },
      }
    }
    return null
  }, [isPreviewMode, previewCustomer])
  
  const [baseUser, setBaseUser] = useState<DistributorUser | null>(null)
  const user = previewUser || baseUser
  
  const [cart, setCartState] = useState<CartItem[]>([])
  const [favorites, setFavorites] = useState<string[]>([])
  const [addresses, setAddresses] = useState<Address[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [drafts, setDrafts] = useState<DraftOrder[]>([])
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [checkout, setCheckout] = useState<CheckoutData>(defaultCheckout)
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>([])
  const [isHydrated, setIsHydrated] = useState(false)

  // ══════════════════════════════════════
  // EFFECTIVE SETTINGS
  // ══════════════════════════════════════
  const effectiveSettings = {
    stockVisible: user?.overrides.stockVisible ?? COMPANY_CONFIG.defaults.stockVisible,
    canGenerateQuotes: user?.overrides.canGenerateQuotes ?? COMPANY_CONFIG.defaults.canGenerateQuotes,
    hasFavorites: isFeatureEnabled('favorites'),
    hasDrafts: isFeatureEnabled('drafts'),
    hasNotifications: isFeatureEnabled('notifications'),
  }

  // ══════════════════════════════════════
  // PRICE HELPERS
  // ══════════════════════════════════════
  // Get admin default currency from localization settings
  const adminDefaultCurrency = getDefaultCurrency()
  const displayCurrency = user?.displayCurrency ?? (adminDefaultCurrency.code as Currency)
  const invoiceCurrency = user?.invoiceCurrency ?? (adminDefaultCurrency.code as Currency)
  const displayCurrencySymbol = CURRENCY_SYMBOLS[displayCurrency] || displayCurrency || '¥'
  const invoiceCurrencySymbol = CURRENCY_SYMBOLS[invoiceCurrency] || invoiceCurrency || '¥'

  const getDisplayPrice = useCallback((product: Product): number => {
    // Priority: 1. New tier-specific price field, 2. Legacy currency prices, 3. Base price
    if (product.price !== undefined && product.price !== null) {
      return product.price
    }
    if (product.prices && typeof product.prices === 'object') {
      // Check for currency-based prices (legacy)
      if (displayCurrency in product.prices) {
        return (product.prices as ProductPrices)[displayCurrency as Currency]
      }
      // Check for tier-based prices
      const firstPrice = Object.values(product.prices)[0]
      if (typeof firstPrice === 'number') {
        return firstPrice
      }
    }
    return product.priceRmb ?? 0
  }, [displayCurrency])

  const getInvoicePrice = useCallback((product: Product): number => {
    // Priority: 1. New tier-specific price field, 2. Legacy currency prices, 3. Base price
    if (product.price !== undefined && product.price !== null) {
      return product.price
    }
    if (product.prices && typeof product.prices === 'object') {
      // Check for currency-based prices (legacy)
      if (invoiceCurrency in product.prices) {
        return (product.prices as ProductPrices)[invoiceCurrency as Currency]
      }
      // Check for tier-based prices
      const firstPrice = Object.values(product.prices)[0]
      if (typeof firstPrice === 'number') {
        return firstPrice
      }
    }
    return product.priceRmb ?? 0
  }, [invoiceCurrency])

  const formatDisplayPrice = useCallback((product: Product): string => {
    const price = getDisplayPrice(product)
    return `${displayCurrencySymbol}${formatNumber(price)}`
  }, [getDisplayPrice, displayCurrencySymbol])

  const formatInvoicePrice = useCallback((product: Product): string => {
    const price = getInvoicePrice(product)
    return `${invoiceCurrencySymbol}${formatNumber(price)}`
  }, [getInvoicePrice, invoiceCurrencySymbol])

  // ══════════════════════════════════════
  // PERSISTENCE & DATA LOADING
  // ══════════════════════════════════════
  
  // Load local storage data on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('distributor_cart')
    const savedFavorites = localStorage.getItem('distributor_favorites')
    const savedDrafts = localStorage.getItem('distributor_drafts')
    const savedRecentlyViewed = localStorage.getItem('distributor_recently_viewed')
    const savedCheckout = localStorage.getItem('distributor_checkout')

    if (savedCart) setCartState(JSON.parse(savedCart))
    if (savedFavorites) {
      console.log('Loading favorites from localStorage:', savedFavorites)
      setFavorites(JSON.parse(savedFavorites))
    }
    if (savedDrafts) setDrafts(JSON.parse(savedDrafts))
    if (savedRecentlyViewed) setRecentlyViewed(JSON.parse(savedRecentlyViewed))
    if (savedCheckout) setCheckout(JSON.parse(savedCheckout))
    
    setIsHydrated(true)
  }, [])

  // Load user data from API
  useEffect(() => {
    const loadUserData = async () => {
      // Skip if in preview mode (we use previewUser instead)
      if (isPreviewMode) return
      
      try {
        const res = await fetch('/api/distributor/me')
        if (res.ok) {
          const data = await res.json()
          if (data.user) {
            setBaseUser({
              id: data.user.id,
              name: data.user.name,
              email: data.user.email,
              company: data.user.company,
              priceType: data.user.priceType || 'STANDARD',
              displayCurrency: (data.user.displayCurrency as Currency) || 'EUR',
              invoiceCurrency: (data.user.invoiceCurrency as Currency) || 'EUR',
              paymentTerms: data.user.paymentTerms || 'NET30',
              overrides: data.user.overrides || { stockVisible: null, canGenerateQuotes: null },
            })
          }
          if (data.addresses?.length > 0) {
            setAddresses(data.addresses)
          }
        }
      } catch (error) {
        console.error('Failed to load user data:', error)
      }
    }
    
    loadUserData()
  }, [isPreviewMode])

  // Load orders, quotes from API
  useEffect(() => {
    const loadFromAPI = async () => {
      // In preview mode, wait for customer ID
      if (isPreviewMode && !previewCustomer?.id) {
        return
      }
      
      const customerId = isPreviewMode ? previewCustomer?.id : undefined
      const customerParam = customerId ? `?customerId=${customerId}` : ''
      
      try {
        // Load orders
        const ordersRes = await fetch(`/api/distributor/orders${customerParam}`)
        if (ordersRes.ok) {
          const data = await ordersRes.json()
          setOrders(data.orders || [])
        } else {
          console.error('Failed to fetch orders:', ordersRes.status)
        }
        
        // Load quotes
        const quotesRes = await fetch(`/api/distributor/quotes${customerParam}`)
        if (quotesRes.ok) {
          const data = await quotesRes.json()
          setQuotes(data.quotes || [])
        } else {
          console.error('Failed to fetch quotes:', quotesRes.status)
        }
      } catch (error) {
        console.error('Failed to load data from API:', error)
      }
    }
    
    loadFromAPI()

    // Refresh when tab becomes visible again (sync with admin-side changes)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadFromAPI()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [isPreviewMode, previewCustomer?.id])

  useEffect(() => {
    if (isHydrated) localStorage.setItem('distributor_cart', JSON.stringify(cart))
  }, [cart, isHydrated])

  useEffect(() => {
    if (isHydrated) {
      console.log('Saving favorites to localStorage:', favorites)
      localStorage.setItem('distributor_favorites', JSON.stringify(favorites))
    }
  }, [favorites, isHydrated])

  useEffect(() => {
    if (isHydrated) localStorage.setItem('distributor_drafts', JSON.stringify(drafts))
  }, [drafts, isHydrated])

  useEffect(() => {
    if (isHydrated) localStorage.setItem('distributor_quotes', JSON.stringify(quotes))
  }, [quotes, isHydrated])

  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem('distributor_orders', JSON.stringify(orders))
    }
  }, [orders, isHydrated])

  useEffect(() => {
    if (isHydrated) localStorage.setItem('distributor_recently_viewed', JSON.stringify(recentlyViewed))
  }, [recentlyViewed, isHydrated])

  useEffect(() => {
    if (isHydrated) localStorage.setItem('distributor_checkout', JSON.stringify(checkout))
  }, [checkout, isHydrated])

  useEffect(() => {
    if (isHydrated) localStorage.setItem('distributor_addresses', JSON.stringify(addresses))
  }, [addresses, isHydrated])

  // ══════════════════════════════════════
  // CART FUNCTIONS
  // ══════════════════════════════════════
  const setCart = useCallback((items: CartItem[]) => {
    setCartState(items)
  }, [])

  const addToCart = useCallback((
    product: Product, 
    quantity: number = 1, 
    note?: string,
    selectedOptions?: SelectedProductOption[],
    optionsPriceModifier?: number
  ) => {
    const qty = Math.max(1, quantity)
    
    setCartState(prev => {
      // If product has options, we need to check if the same product with same options already exists
      if (selectedOptions && selectedOptions.length > 0) {
        const optionsKey = selectedOptions.map(o => o.optionId).sort().join('-')
        const existing = prev.find(item => {
          if (item.product.id !== product.id) return false
          if (!item.selectedOptions || item.selectedOptions.length === 0) return false
          const existingKey = item.selectedOptions.map(o => o.optionId).sort().join('-')
          return existingKey === optionsKey
        })
        
        if (existing) {
          return prev.map(item => {
            if (item.product.id !== product.id) return item
            if (!item.selectedOptions) return item
            const itemKey = item.selectedOptions.map(o => o.optionId).sort().join('-')
            if (itemKey !== optionsKey) return item
            return { ...item, quantity: item.quantity + qty, note: note || item.note }
          })
        }
        
        // Add as new item with options
        return [...prev, { 
          product, 
          quantity: qty, 
          note, 
          selectedOptions, 
          optionsPriceModifier: optionsPriceModifier || 0 
        }]
      }
      
      // No options - original behavior
      const existing = prev.find(item => 
        item.product.id === product.id && 
        (!item.selectedOptions || item.selectedOptions.length === 0)
      )
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id && (!item.selectedOptions || item.selectedOptions.length === 0)
            ? { ...item, quantity: item.quantity + qty, note: note || item.note }
            : item
        )
      }
      return [...prev, { product, quantity: qty, note }]
    })
  }, [])

  const updateCartItem = useCallback((productId: string, quantity: number, note?: string) => {
    setCartState(prev =>
      prev.map(item => {
        if (item.product.id === productId) {
          return { 
            ...item, 
            quantity: Math.max(1, quantity), 
            note: note !== undefined ? note : item.note 
          }
        }
        return item
      })
    )
  }, [])

  const removeFromCart = useCallback((productId: string, selectedOptions?: SelectedProductOption[]) => {
    setCartState(prev => prev.filter(item => {
      // Different product - keep it
      if (item.product.id !== productId) return true
      
      // If no options specified, remove all items with this product ID
      if (!selectedOptions || selectedOptions.length === 0) {
        // Only remove items without options or if this item has no options
        return item.selectedOptions && item.selectedOptions.length > 0
      }
      
      // Compare options
      const itemOptionsKey = item.selectedOptions?.map(o => o.optionId).sort().join('-') || ''
      const targetOptionsKey = selectedOptions.map(o => o.optionId).sort().join('-')
      
      // Keep item if options don't match
      return itemOptionsKey !== targetOptionsKey
    }))
  }, [])

  const clearCart = useCallback(() => setCartState([]), [])

  const calculatePriceWithRules = useCallback((product: Product, quantity: number): number => {
    const basePrice = getDisplayPrice(product)
    const rules = product.pricingRules || []
    
    if (rules.length === 0) {
      return basePrice
    }

    let bestPrice = basePrice

    for (const rule of rules) {
      const matchingBreak = rule.breaks.find(brk => {
        const minMatch = quantity >= brk.minQuantity
        const maxMatch = brk.maxQuantity === null || quantity <= brk.maxQuantity
        return minMatch && maxMatch
      })

      if (matchingBreak) {
        let newPrice: number
        if (rule.type === 'PERCENTAGE') {
          newPrice = basePrice * (1 + matchingBreak.value / 100)
        } else {
          newPrice = matchingBreak.value
        }
        if (newPrice < bestPrice) {
          bestPrice = newPrice
        }
      }
    }

    return Math.max(0, bestPrice)
  }, [getDisplayPrice])

  const getCartTotal = useCallback(() => {
    return cart.reduce((sum, item) => {
      const unitPrice = calculatePriceWithRules(item.product, item.quantity)
      const optionsPrice = item.optionsPriceModifier || 0
      return sum + (unitPrice + optionsPrice) * item.quantity
    }, 0)
  }, [cart, calculatePriceWithRules])

  const calculatePriceWithRulesInvoice = useCallback((product: Product, quantity: number): number => {
    const basePrice = getInvoicePrice(product)
    const rules = product.pricingRules || []
    
    if (rules.length === 0) {
      return basePrice
    }

    let bestPrice = basePrice

    for (const rule of rules) {
      const matchingBreak = rule.breaks.find(brk => {
        const minMatch = quantity >= brk.minQuantity
        const maxMatch = brk.maxQuantity === null || quantity <= brk.maxQuantity
        return minMatch && maxMatch
      })

      if (matchingBreak) {
        let newPrice: number
        if (rule.type === 'PERCENTAGE') {
          newPrice = basePrice * (1 + matchingBreak.value / 100)
        } else {
          newPrice = matchingBreak.value
        }
        if (newPrice < bestPrice) {
          bestPrice = newPrice
        }
      }
    }

    return Math.max(0, bestPrice)
  }, [getInvoicePrice])

  const getCartTotalInvoice = useCallback(() => {
    return cart.reduce((sum, item) => {
      const unitPrice = calculatePriceWithRulesInvoice(item.product, item.quantity)
      const optionsPrice = item.optionsPriceModifier || 0
      return sum + (unitPrice + optionsPrice) * item.quantity
    }, 0)
  }, [cart, calculatePriceWithRulesInvoice])

  const getCartItemCount = useCallback(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0)
  }, [cart])

  // ══════════════════════════════════════
  // FAVORITES
  // ══════════════════════════════════════
  const toggleFavorite = useCallback((productId: string) => {
    if (!effectiveSettings.hasFavorites) {
      console.warn('Favorites feature is disabled')
      return
    }
    console.log('Toggling favorite:', productId)
    setFavorites(prev => {
      const newFavorites = prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
      console.log('New favorites:', newFavorites)
      return newFavorites
    })
  }, [effectiveSettings.hasFavorites])

  const isFavorite = useCallback((productId: string) => {
    return favorites.includes(productId)
  }, [favorites])

  const cleanupInvalidFavorites = useCallback((validProductIds: string[]) => {
    if (favorites.length === 0) return
    const validSet = new Set(validProductIds)
    const cleanedFavorites = favorites.filter(id => validSet.has(id))
    if (cleanedFavorites.length !== favorites.length) {
      setFavorites(cleanedFavorites)
    }
  }, [favorites])

  // ══════════════════════════════════════
  // ADDRESSES
  // ══════════════════════════════════════
  const addAddress = useCallback((address: Omit<Address, 'id'>) => {
    const newAddress: Address = { ...address, id: `addr-${Date.now()}` }
    setAddresses(prev => [...prev, newAddress])
  }, [])

  const updateAddress = useCallback((id: string, updates: Partial<Address>) => {
    setAddresses(prev =>
      prev.map(addr => (addr.id === id ? { ...addr, ...updates } : addr))
    )
  }, [])

  const deleteAddress = useCallback((id: string) => {
    setAddresses(prev => prev.filter(addr => addr.id !== id))
  }, [])

  const setDefaultAddress = useCallback((id: string) => {
    setAddresses(prev =>
      prev.map(addr => ({ ...addr, isDefault: addr.id === id }))
    )
  }, [])

  // ══════════════════════════════════════
  // NOTIFICATIONS
  // ══════════════════════════════════════
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(notif => (notif.id === id ? { ...notif, read: true } : notif))
    )
  }, [])

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(notif => ({ ...notif, read: true })))
  }, [])

  const unreadCount = notifications.filter(n => !n.read).length

  // ══════════════════════════════════════
  // DRAFTS
  // ══════════════════════════════════════
  const saveDraft = useCallback((name: string) => {
    if (!effectiveSettings.hasDrafts) return
    const draft: DraftOrder = {
      id: `draft-${Date.now()}`,
      name,
      items: [...cart],
      createdAt: new Date().toISOString(),
    }
    setDrafts(prev => [...prev, draft])
  }, [cart, effectiveSettings.hasDrafts])

  const loadDraft = useCallback((id: string) => {
    const draft = drafts.find(d => d.id === id)
    if (draft) setCartState(draft.items)
  }, [drafts])

  const deleteDraft = useCallback((id: string) => {
    setDrafts(prev => prev.filter(d => d.id !== id))
  }, [])

  // ══════════════════════════════════════
  // QUOTES
  // ══════════════════════════════════════
  const saveQuote = useCallback((quoteData: Omit<Quote, 'id' | 'number' | 'createdAt' | 'expiresAt'>): Quote => {
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    
    const quote: Quote = {
      ...quoteData,
      id: `quote-${Date.now()}`,
      number: `Q-${Date.now().toString().slice(-8)}`,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    }
    
    setQuotes(prev => [quote, ...prev])
    
    setNotifications(prev => [{
      id: `notif-${Date.now()}`,
      type: 'quote',
      title: 'Quote Generated',
      message: `Quote ${quote.number} has been created.`,
      date: now.toISOString(),
      read: false,
      link: `/my-quotes`,
    }, ...prev])
    
    return quote
  }, [])

  const updateQuoteStatus = useCallback((id: string, status: Quote['status']) => {
    setQuotes(prev =>
      prev.map(q => (q.id === id ? { ...q, status } : q))
    )
  }, [])

  const convertQuoteToOrder = useCallback((id: string) => {
    const quote = quotes.find(q => q.id === id)
    if (!quote) return

    setCartState(quote.items)
    
    setCheckout({
      shippingMethod: quote.shippingMethod,
      shippingDetails: '',
      shippingAddressId: quote.shippingAddressId,
      billingAddressId: quote.billingAddressId,
      instructions: quote.instructions || '',
      poNumber: quote.poNumber || '',
      requestedDate: quote.requestedDate || '',
      fromQuoteId: quote.id,
    })

    updateQuoteStatus(id, 'accepted')
  }, [quotes, updateQuoteStatus])

  const loadQuoteForModification = useCallback((id: string, mode: 'replace' | 'merge') => {
    const quote = quotes.find(q => q.id === id)
    if (!quote) return

    if (mode === 'replace') {
      setCartState(quote.items)
    } else {
      quote.items.forEach(quoteItem => {
        setCartState(prev => {
          const existing = prev.find(item => item.product.id === quoteItem.product.id)
          if (existing) {
            return prev.map(item =>
              item.product.id === quoteItem.product.id
                ? { ...item, quantity: item.quantity + quoteItem.quantity }
                : item
            )
          }
          return [...prev, quoteItem]
        })
      })
    }

    setCheckout(prev => ({
      ...prev,
      shippingMethod: quote.shippingMethod || prev.shippingMethod,
      shippingAddressId: quote.shippingAddressId || prev.shippingAddressId,
      billingAddressId: quote.billingAddressId || prev.billingAddressId,
      poNumber: quote.poNumber || prev.poNumber,
      fromQuoteId: quote.id,
    }))
  }, [quotes])

  const deleteQuote = useCallback((id: string) => {
    setQuotes(prev => prev.filter(q => q.id !== id))
  }, [])

  // ══════════════════════════════════════
  // ORDERS
  // ══════════════════════════════════════
  const createOrder = useCallback((orderData: Omit<Order, 'id' | 'number' | 'createdAt' | 'statusHistory'>): Order => {
    const now = new Date()
    
    // Create local order for immediate UI feedback
    const localOrder: Order = {
      ...orderData,
      id: `ord-${Date.now()}`,
      number: `ORD-${now.toISOString().slice(0, 10).replace(/-/g, '')}${Date.now().toString().slice(-4)}`,
      createdAt: now.toISOString(),
      statusHistory: [
        { status: 'pending', date: now.toISOString() }
      ],
    }
    
    // Add to local state immediately for responsive UI
    setOrders(prev => [localOrder, ...prev])
    
    if (orderData.fromQuoteId) {
      setQuotes(prev =>
        prev.map(q => 
          q.id === orderData.fromQuoteId 
            ? { ...q, status: 'accepted' as const, convertedOrderId: localOrder.id } 
            : q
        )
      )
    }
    
    setNotifications(prev => [{
      id: `notif-${Date.now()}`,
      type: 'order',
      title: 'Order Placed',
      message: `Order ${localOrder.number} has been placed successfully.`,
      date: now.toISOString(),
      read: false,
      link: `/my-orders/${localOrder.id}`,
    }, ...prev])
    
    // Send to backend API asynchronously
    const customerId = user?.id
    if (customerId && orderData.items) {
      fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          currency: orderData.currency || 'EUR',
          notes: orderData.instructions,
          items: orderData.items.map(item => ({
            productId: item.id,
            quantity: item.quantity,
            unitPrice: item.price,
          })),
          customFields: {
            poNumber: orderData.poNumber,
            requestedDeliveryDate: orderData.requestedDate,
            shippingMethod: orderData.shippingMethod,
          }
        })
      }).then(async res => {
        if (res.ok) {
          const data = await res.json()
          // Update local order with server data
          setOrders(prev => prev.map(o => 
            o.id === localOrder.id 
              ? { ...o, id: data.order.id, number: data.order.orderNumber }
              : o
          ))
          console.log('Order synced to server:', data.order.orderNumber)
        } else {
          console.error('Failed to sync order to server')
        }
      }).catch(err => {
        console.error('Error syncing order to server:', err)
      })
    }
    
    return localOrder
  }, [user])

  const updateOrderStatus = useCallback((id: string, status: Order['status'], note?: string) => {
    const now = new Date().toISOString()
    setOrders(prev =>
      prev.map(o => {
        if (o.id === id) {
          return {
            ...o,
            status,
            statusHistory: [...o.statusHistory, { status, date: now, note }]
          }
        }
        return o
      })
    )
  }, [])

  const cancelOrder = useCallback((id: string, reason?: string) => {
    const now = new Date().toISOString()
    setOrders(prev =>
      prev.map(o => {
        if (o.id === id && o.status === 'pending') {
          return {
            ...o,
            status: 'cancelled' as const,
            statusHistory: [...o.statusHistory, { status: 'cancelled', date: now, note: reason || 'Cancelled by customer' }]
          }
        }
        return o
      })
    )

    setNotifications(prev => [{
      id: `notif-${Date.now()}`,
      type: 'order',
      title: 'Order Cancelled',
      message: `Order has been cancelled.`,
      date: now,
      read: false,
      link: `/my-orders/${id}`,
    }, ...prev])
  }, [])

  const modifyOrder = useCallback((
    orderId: string,
    newItems: { id: string; ref: string; name: string; quantity: number; price: number }[],
    reason: string,
    surchargeAmount: number
  ): { success: boolean; order?: Order } => {
    const now = new Date().toISOString()
    const order = orders.find(o => o.id === orderId)
    
    if (!order) {
      return { success: false }
    }
    
    // Only allow modification of pending or confirmed orders
    if (!['pending', 'confirmed'].includes(order.status)) {
      return { success: false }
    }
    
    // Calculate changes for the modification record
    const changes: OrderModificationRecord['changes'] = []
    const originalMap = new Map(order.items.map(item => [item.id, item]))
    const newMap = new Map(newItems.map(item => [item.id, item]))
    
    // Check for removed and modified items
    for (const original of order.items) {
      const modified = newMap.get(original.id)
      if (!modified) {
        changes.push({
          type: 'removed',
          productId: original.id,
          productRef: original.ref,
          productName: original.name,
          oldQuantity: original.quantity,
          newQuantity: 0,
        })
      } else if (modified.quantity !== original.quantity) {
        changes.push({
          type: 'modified',
          productId: original.id,
          productRef: original.ref,
          productName: original.name,
          oldQuantity: original.quantity,
          newQuantity: modified.quantity,
        })
      }
    }
    
    // Check for added items
    for (const modified of newItems) {
      if (!originalMap.has(modified.id)) {
        changes.push({
          type: 'added',
          productId: modified.id,
          productRef: modified.ref,
          productName: modified.name,
          oldQuantity: 0,
          newQuantity: modified.quantity,
        })
      }
    }
    
    // Calculate new totals
    const newSubtotal = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const newTotal = newSubtotal + order.shipping + surchargeAmount
    
    // Format changes summary for status history
    const added = changes.filter(c => c.type === 'added').length
    const removed = changes.filter(c => c.type === 'removed').length
    const modifiedCount = changes.filter(c => c.type === 'modified').length
    const summaryParts: string[] = []
    if (modifiedCount > 0) summaryParts.push(`${modifiedCount} modified`)
    if (removed > 0) summaryParts.push(`${removed} removed`)
    if (added > 0) summaryParts.push(`${added} added`)
    
    // Create modification record
    const newVersion = (order.version || 1) + 1
    const modificationRecord: OrderModificationRecord = {
      id: `mod-${Date.now()}`,
      version: newVersion,
      timestamp: now,
      reason,
      changes,
      surchargeApplied: surchargeAmount,
      previousTotal: order.total,
      newTotal,
    }
    
    // Build the updated order BEFORE calling setOrders
    const updatedOrder: Order = {
      ...order,
      items: newItems,
      subtotal: newSubtotal,
      total: newTotal,
      version: newVersion,
      modifications: [...(order.modifications || []), modificationRecord],
      statusHistory: [
        ...order.statusHistory,
        {
          status: 'modified',
          date: now,
          note: `Order modified by customer. Reason: ${reason}. Changes: ${summaryParts.join(', ')}.${surchargeAmount > 0 ? ` Late surcharge: €${surchargeAmount}` : ''}`
        }
      ],
    }
    
    // Update the orders state
    setOrders(prev =>
      prev.map(o => o.id === orderId ? updatedOrder : o)
    )
    
    // Add notification
    setNotifications(prev => [{
      id: `notif-${Date.now()}`,
      type: 'order',
      title: 'Order Modified',
      message: `Order has been modified. ${summaryParts.join(', ')}.`,
      date: now,
      read: false,
      link: `/my-orders/${orderId}`,
    }, ...prev])
    
    // Clear draft modifications from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`order_modification_draft_${orderId}`)
    }
    
    return { success: true, order: updatedOrder }
  }, [orders])

  // ══════════════════════════════════════
  // CHECKOUT
  // ══════════════════════════════════════
  const updateCheckout = useCallback((data: Partial<CheckoutData>) => {
    setCheckout(prev => ({ ...prev, ...data }))
  }, [])

  const resetCheckout = useCallback(() => setCheckout(defaultCheckout), [])

  // ══════════════════════════════════════
  // RECENTLY VIEWED
  // ══════════════════════════════════════
  const addToRecentlyViewed = useCallback((productId: string) => {
    setRecentlyViewed(prev => {
      const filtered = prev.filter(id => id !== productId)
      return [productId, ...filtered].slice(0, 10)
    })
  }, [])

  // ══════════════════════════════════════
  // CONTEXT VALUE
  // ══════════════════════════════════════
  const value: DistributorState = {
    config: COMPANY_CONFIG,
    user,
    effectiveSettings,
    getDisplayPrice,
    getInvoicePrice,
    formatDisplayPrice,
    formatInvoicePrice,
    calculatePriceWithRules,
    displayCurrencySymbol,
    invoiceCurrencySymbol,
    cart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    setCart,
    getCartTotal,
    getCartTotalInvoice,
    getCartItemCount,
    favorites,
    toggleFavorite,
    isFavorite,
    cleanupInvalidFavorites,
    addresses,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
    notifications,
    markAsRead,
    markAllAsRead,
    unreadCount,
    drafts,
    saveDraft,
    loadDraft,
    deleteDraft,
    quotes,
    saveQuote,
    updateQuoteStatus,
    convertQuoteToOrder,
    loadQuoteForModification,
    deleteQuote,
    orders,
    createOrder,
    updateOrderStatus,
    cancelOrder,
    modifyOrder,
    checkout,
    updateCheckout,
    resetCheckout,
    recentlyViewed,
    addToRecentlyViewed,
  }

  return (
    <DistributorContext.Provider value={value}>
      {children}
    </DistributorContext.Provider>
  )
}

// ============================================
// HOOK
// ============================================

export function useDistributor() {
  const context = useContext(DistributorContext)
  if (context === undefined) {
    throw new Error('useDistributor must be used within a DistributorProvider')
  }
  return context
}