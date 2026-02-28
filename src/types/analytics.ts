// ============================================
// ANALYTICS TYPES
// ============================================

export type TimePeriod =
  | 'today'
  | 'yesterday'
  | 'last7days'
  | 'last30days'
  | 'thisMonth'
  | 'lastMonth'
  | 'thisQuarter'
  | 'lastQuarter'
  | 'thisYear'
  | 'lastYear'
  | 'custom'

export type TimeGranularity = 'day' | 'week' | 'month' | 'quarter' | 'year'

export interface AnalyticsFilters {
  period: TimePeriod
  startDate?: string
  endDate?: string
  customerId?: string
  customerIds?: string[]
  productId?: string
  productIds?: string[]
  categoryId?: string
  country?: string
  countries?: string[]
  status?: string[]
  priceTier?: string
  minAmount?: number
  maxAmount?: number
}

export interface DashboardKPIs {
  totalOrders: number
  totalOrdersChange: number
  pendingOrders: number

  totalRevenue: number
  totalRevenueChange: number
  averageOrderValue: number
  averageOrderValueChange: number

  totalCustomers: number
  activeCustomers: number
  newCustomers: number
  newCustomersChange: number

  paymentsReceived: number
  paymentsOutstanding: number
  paymentRate: number

  productsOrdered: number
  topProductsCount: number
}

export interface TimeSeriesData {
  date: string
  value: number
  label?: string
}

export interface ChartData {
  labels: string[]
  datasets: {
    label: string
    data: number[]
    color?: string
  }[]
}

export interface DimensionData {
  dimension: string
  value: number
  count: number
  percentage: number
  change?: number
  metadata?: Record<string, unknown>
}

export interface AnalyticsResult {
  kpis: DashboardKPIs
  timeSeries: {
    orders: TimeSeriesData[]
    revenue: TimeSeriesData[]
    customers: TimeSeriesData[]
  }
  byDimension: {
    byCountry: DimensionData[]
    byCustomer: DimensionData[]
    byProduct: DimensionData[]
    byCategory: DimensionData[]
    byStatus: DimensionData[]
    byPriceTier: DimensionData[]
  }
  period: {
    start: string
    end: string
    granularity: TimeGranularity
  }
}

export type ExportFormat = 'csv' | 'xlsx' | 'json'

export type ExportType =
  | 'orders'
  | 'orderLines'
  | 'customers'
  | 'products'
  | 'payments'
  | 'invoices'
  | 'analytics'

export interface ExportOptions {
  type: ExportType
  format: ExportFormat
  filters: AnalyticsFilters
  columns?: string[]
  includeMetadata?: boolean
}
