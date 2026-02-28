// ============================================
// Company & User
// ============================================

export interface Company {
    id: string
    name: string
    slug: string
    currency: string
    language: string
    createdAt: Date
  }
  
  export interface User {
    id: string
    email: string
    name: string | null
    role: UserRole
    companyId: string
    company?: Company
  }
  
  export type UserRole = 'ADMIN' | 'SALES' | 'WAREHOUSE' | 'DISTRIBUTOR'
  
  // ============================================
  // Products
  // ============================================
  
  export interface Product {
    id: string
    ref: string
    nameEn: string
    nameCn: string | null
    descriptionEn: string | null
    descriptionCn: string | null
    priceDistributor: number | null
    priceDirect: number | null
    priceRmb: number | null
    material: string | null
    hsCode: string | null
    weight: number | null
    moq: number
    categoryId: string | null
    category?: Category
    isActive: boolean
  }
  
  export interface Category {
    id: string
    nameEn: string
    nameCn: string | null
    slug: string
  }
  
  // ============================================
  // Customers
  // ============================================
  
  export interface Customer {
    id: string
    companyName: string
    contactName: string | null
    email: string | null
    phone: string | null
    country: string | null
    currency: string
    priceType: PriceType
    shippingAddress: string | null
    billingAddress: string | null
    isActive: boolean
  }
  
  export type PriceType = 'DISTRIBUTOR' | 'DIRECT'
  
  // ============================================
  // Orders
  // ============================================
  
  export interface Order {
    id: string
    orderNumber: string
    status: OrderStatus
    customerId: string
    customer?: Customer
    lines: OrderLine[]
    subtotal: number
    discount: number
    shippingCost: number
    totalAmount: number
    notesEn: string | null
    notesCn: string | null
    createdAt: Date
    updatedAt: Date
  }
  
  export interface OrderLine {
    id: string
    orderId: string
    productId: string
    product?: Product
    quantity: number
    unitPrice: number
    lineTotal: number
  }
  
  export type OrderStatus = 
    | 'DRAFT' 
    | 'PENDING' 
    | 'CONFIRMED' 
    | 'PREPARING' 
    | 'READY' 
    | 'SHIPPED' 
    | 'DELIVERED' 
    | 'CANCELLED'
  
  // ============================================
  // Session
  // ============================================
  
  export interface Session {
    userId: string
    email: string
    name: string | null
    role: UserRole
    companyId: string
    companyName: string
  }
  
  // ============================================
  // API Responses
  // ============================================
  
  export interface ApiResponse<T> {
    data?: T
    error?: string
  }
  
  export interface PaginatedResponse<T> {
    data: T[]
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
  
  // ============================================
  // Cart (for distributor portal)
  // ============================================
  
  export interface CartItem {
    productId: string
    product: Product
    quantity: number
    unitPrice: number
  }
  
  export interface Cart {
    items: CartItem[]
    subtotal: number
    itemCount: number
  }
  
  // ============================================
  // Import/Export
  // ============================================
  
  export interface ImportResult {
    success: number
    failed: number
    errors: ImportError[]
  }
  
  export interface ImportError {
    row: number
    field: string
    message: string
    value: string
  }
  
  export interface ExportOptions {
    format: 'xlsx' | 'csv'
    fields: string[]
    filename: string
  }