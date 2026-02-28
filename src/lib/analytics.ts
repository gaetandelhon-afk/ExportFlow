import { prisma } from './prisma'
import {
  AnalyticsFilters,
  DashboardKPIs,
  TimeSeriesData,
  DimensionData,
  TimePeriod,
  TimeGranularity
} from '@/types/analytics'
import {
  startOfDay, endOfDay, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, startOfQuarter, endOfQuarter,
  startOfYear, endOfYear, subDays, subMonths, subQuarters, subYears,
  format, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval,
  getWeek
} from 'date-fns'

// ============================================
// DATE HELPERS
// ============================================

export function getDateRange(period: TimePeriod, customStart?: string, customEnd?: string): {
  start: Date
  end: Date
  previousStart: Date
  previousEnd: Date
  granularity: TimeGranularity
} {
  const now = new Date()
  let start: Date
  let end: Date
  let granularity: TimeGranularity = 'day'

  switch (period) {
    case 'today':
      start = startOfDay(now)
      end = endOfDay(now)
      granularity = 'day'
      break
    case 'yesterday':
      start = startOfDay(subDays(now, 1))
      end = endOfDay(subDays(now, 1))
      granularity = 'day'
      break
    case 'last7days':
      start = startOfDay(subDays(now, 6))
      end = endOfDay(now)
      granularity = 'day'
      break
    case 'last30days':
      start = startOfDay(subDays(now, 29))
      end = endOfDay(now)
      granularity = 'day'
      break
    case 'thisMonth':
      start = startOfMonth(now)
      end = endOfMonth(now)
      granularity = 'day'
      break
    case 'lastMonth':
      start = startOfMonth(subMonths(now, 1))
      end = endOfMonth(subMonths(now, 1))
      granularity = 'day'
      break
    case 'thisQuarter':
      start = startOfQuarter(now)
      end = endOfQuarter(now)
      granularity = 'week'
      break
    case 'lastQuarter':
      start = startOfQuarter(subQuarters(now, 1))
      end = endOfQuarter(subQuarters(now, 1))
      granularity = 'week'
      break
    case 'thisYear':
      start = startOfYear(now)
      end = endOfYear(now)
      granularity = 'month'
      break
    case 'lastYear':
      start = startOfYear(subYears(now, 1))
      end = endOfYear(subYears(now, 1))
      granularity = 'month'
      break
    case 'custom':
      start = customStart ? new Date(customStart) : startOfMonth(now)
      end = customEnd ? new Date(customEnd) : endOfMonth(now)
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      granularity = daysDiff <= 31 ? 'day' : daysDiff <= 90 ? 'week' : 'month'
      break
    default:
      start = startOfMonth(now)
      end = endOfMonth(now)
  }

  const duration = end.getTime() - start.getTime()
  const previousEnd = new Date(start.getTime() - 1)
  const previousStart = new Date(previousEnd.getTime() - duration)

  return { start, end, previousStart, previousEnd, granularity }
}

// ============================================
// KPIs - SIMPLIFIED VERSION (only uses orders, customers, order_lines)
// ============================================

export async function getDashboardKPIs(
  companyId: string,
  filters: AnalyticsFilters
): Promise<DashboardKPIs> {
  const { start, end, previousStart, previousEnd } = getDateRange(
    filters.period,
    filters.startDate,
    filters.endDate
  )

  try {
    // Current period orders
    const currentOrders = await prisma.order.findMany({
      where: {
        companyId,
        createdAt: { gte: start, lte: end },
        status: { notIn: ['CANCELLED'] }
      },
      select: {
        id: true,
        totalAmount: true,
        customerId: true,
        createdAt: true
      }
    })

    // Previous period orders
    const previousOrders = await prisma.order.findMany({
      where: {
        companyId,
        createdAt: { gte: previousStart, lte: previousEnd },
        status: { notIn: ['CANCELLED'] }
      },
      select: {
        id: true,
        totalAmount: true,
        customerId: true
      }
    })

    // Pending orders count
    const pendingOrders = await prisma.order.count({
      where: {
        companyId,
        status: { in: ['PENDING', 'CONFIRMED'] }
      }
    })

    // Total customers
    const totalCustomers = await prisma.customer.count({
      where: { companyId, isActive: true }
    })

    // Products ordered in period - use aggregate count instead of distinct findMany
    let productsOrderedCount = 0
    try {
      const productsOrdered = await prisma.orderLine.groupBy({
        by: ['productId'],
        where: {
          order: {
            companyId,
            createdAt: { gte: start, lte: end },
            status: { notIn: ['CANCELLED'] }
          },
          productId: { not: null }
        }
      })
      productsOrderedCount = productsOrdered.length
    } catch {
      productsOrderedCount = 0
    }

    // Calculate metrics
    const totalRevenue = currentOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0)
    const previousRevenue = previousOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0)
    const totalOrdersCount = currentOrders.length
    const previousOrdersCount = previousOrders.length

    const activeCustomers = new Set(currentOrders.map(o => o.customerId)).size

    // New customers (first order in current period)
    let newCustomers = 0
    let previousNewCustomers = 0
    try {
      const allCustomerOrders = await prisma.order.groupBy({
        by: ['customerId'],
        where: { companyId, status: { notIn: ['CANCELLED'] } },
        _min: { createdAt: true }
      })

      newCustomers = allCustomerOrders.filter(c => 
        c._min.createdAt && c._min.createdAt >= start && c._min.createdAt <= end
      ).length

      previousNewCustomers = allCustomerOrders.filter(c =>
        c._min.createdAt && c._min.createdAt >= previousStart && c._min.createdAt <= previousEnd
      ).length
    } catch {
      newCustomers = 0
      previousNewCustomers = 0
    }

    const avgOrderValue = totalOrdersCount > 0 ? totalRevenue / totalOrdersCount : 0
    const previousAvgOrderValue = previousOrdersCount > 0 ? previousRevenue / previousOrdersCount : 0

    const calcChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0
      return Math.round(((current - previous) / previous) * 100)
    }

    return {
      totalOrders: totalOrdersCount,
      totalOrdersChange: calcChange(totalOrdersCount, previousOrdersCount),
      pendingOrders,
      totalRevenue,
      totalRevenueChange: calcChange(totalRevenue, previousRevenue),
      averageOrderValue: avgOrderValue,
      averageOrderValueChange: calcChange(avgOrderValue, previousAvgOrderValue),
      totalCustomers,
      activeCustomers,
      newCustomers,
      newCustomersChange: calcChange(newCustomers, previousNewCustomers),
      paymentsReceived: 0,
      paymentsOutstanding: 0,
      paymentRate: 0,
      productsOrdered: productsOrderedCount,
      topProductsCount: 10
    }
  } catch (error) {
    console.error('[Analytics] Error in getDashboardKPIs:', error)
    // Return empty KPIs on error
    return {
      totalOrders: 0,
      totalOrdersChange: 0,
      pendingOrders: 0,
      totalRevenue: 0,
      totalRevenueChange: 0,
      averageOrderValue: 0,
      averageOrderValueChange: 0,
      totalCustomers: 0,
      activeCustomers: 0,
      newCustomers: 0,
      newCustomersChange: 0,
      paymentsReceived: 0,
      paymentsOutstanding: 0,
      paymentRate: 0,
      productsOrdered: 0,
      topProductsCount: 0
    }
  }
}

// ============================================
// TIME SERIES
// ============================================

export async function getTimeSeries(
  companyId: string,
  filters: AnalyticsFilters,
  metric: 'orders' | 'revenue' | 'customers'
): Promise<TimeSeriesData[]> {
  const { start, end, granularity } = getDateRange(
    filters.period,
    filters.startDate,
    filters.endDate
  )

  let intervals: Date[]
  switch (granularity) {
    case 'day':
      intervals = eachDayOfInterval({ start, end })
      break
    case 'week':
      intervals = eachWeekOfInterval({ start, end })
      break
    case 'month':
      intervals = eachMonthOfInterval({ start, end })
      break
    default:
      intervals = eachDayOfInterval({ start, end })
  }

  const orders = await prisma.order.findMany({
    where: {
      companyId,
      createdAt: { gte: start, lte: end },
      status: { notIn: ['CANCELLED'] }
    },
    select: {
      createdAt: true,
      totalAmount: true,
      customerId: true
    }
  })

  const data: TimeSeriesData[] = intervals.map(date => {
    const dateStr = format(date, 'yyyy-MM-dd')
    
    const ordersInPeriod = orders.filter(o => {
      if (granularity === 'day') {
        return format(o.createdAt, 'yyyy-MM-dd') === dateStr
      }
      if (granularity === 'week') {
        const weekStart = startOfWeek(date, { weekStartsOn: 1 })
        const weekEnd = endOfWeek(date, { weekStartsOn: 1 })
        return o.createdAt >= weekStart && o.createdAt <= weekEnd
      }
      if (granularity === 'month') {
        const monthStart = startOfMonth(date)
        const monthEnd = endOfMonth(date)
        return o.createdAt >= monthStart && o.createdAt <= monthEnd
      }
      return false
    })

    let value: number
    if (metric === 'orders') {
      value = ordersInPeriod.length
    } else if (metric === 'revenue') {
      value = ordersInPeriod.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0)
    } else {
      value = new Set(ordersInPeriod.map(o => o.customerId)).size
    }

    return {
      date: dateStr,
      value,
      label: formatDateLabel(date, granularity)
    }
  })

  return data
}

// ============================================
// DIMENSION ANALYSIS
// ============================================

export async function getByDimension(
  companyId: string,
  filters: AnalyticsFilters,
  dimension: 'country' | 'customer' | 'product' | 'category' | 'status' | 'priceTier'
): Promise<DimensionData[]> {
  const { start, end } = getDateRange(
    filters.period,
    filters.startDate,
    filters.endDate
  )

  let results: DimensionData[]

  switch (dimension) {
    case 'country':
      results = await getByCountry(companyId, start, end)
      break
    case 'customer':
      results = await getByCustomer(companyId, start, end)
      break
    case 'product':
      results = await getByProduct(companyId, start, end)
      break
    case 'category':
      results = await getByCategory(companyId, start, end)
      break
    case 'status':
      results = await getByStatus(companyId, start, end)
      break
    case 'priceTier':
      results = await getByPriceTier(companyId, start, end)
      break
    default:
      results = []
  }

  const total = results.reduce((sum, r) => sum + r.value, 0)
  return results.map(r => ({
    ...r,
    percentage: total > 0 ? Math.round((r.value / total) * 1000) / 10 : 0
  }))
}

async function getByCountry(companyId: string, start: Date, end: Date): Promise<DimensionData[]> {
  const orders = await prisma.order.findMany({
    where: {
      companyId,
      createdAt: { gte: start, lte: end },
      status: { notIn: ['CANCELLED'] }
    },
    select: {
      totalAmount: true,
      customer: { select: { country: true } }
    }
  })

  const byCountry = new Map<string, { value: number; count: number }>()

  for (const order of orders) {
    const country = order.customer?.country || 'Unknown'
    const existing = byCountry.get(country) || { value: 0, count: 0 }
    byCountry.set(country, {
      value: existing.value + Number(order.totalAmount || 0),
      count: existing.count + 1
    })
  }

  return Array.from(byCountry.entries())
    .map(([code, data]) => ({
      dimension: code,
      value: data.value,
      count: data.count,
      percentage: 0,
      metadata: { countryCode: code }
    }))
    .sort((a, b) => b.value - a.value)
}

async function getByCustomer(companyId: string, start: Date, end: Date): Promise<DimensionData[]> {
  const orders = await prisma.order.findMany({
    where: {
      companyId,
      createdAt: { gte: start, lte: end },
      status: { notIn: ['CANCELLED'] }
    },
    select: {
      totalAmount: true,
      customerId: true,
      customer: { select: { companyName: true, email: true, country: true } }
    }
  })

  const byCustomer = new Map<string, { value: number; count: number; name: string; email?: string; country?: string }>()

  for (const order of orders) {
    const existing = byCustomer.get(order.customerId) || { 
      value: 0, 
      count: 0, 
      name: order.customer?.companyName || 'Unknown',
      email: order.customer?.email,
      country: order.customer?.country || undefined
    }
    byCustomer.set(order.customerId, {
      ...existing,
      value: existing.value + Number(order.totalAmount || 0),
      count: existing.count + 1
    })
  }

  return Array.from(byCustomer.entries())
    .map(([id, data]) => ({
      dimension: data.name,
      value: data.value,
      count: data.count,
      percentage: 0,
      metadata: { customerId: id, email: data.email, country: data.country }
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 20)
}

async function getByProduct(companyId: string, start: Date, end: Date): Promise<DimensionData[]> {
  const orderLines = await prisma.orderLine.findMany({
    where: {
      order: {
        companyId,
        createdAt: { gte: start, lte: end },
        status: { notIn: ['CANCELLED'] }
      }
    },
    select: {
      lineTotal: true,
      quantity: true,
      productId: true,
      productNameEn: true,
      productRef: true,
      product: { select: { nameEn: true, ref: true, category: { select: { nameEn: true } } } }
    }
  })

  const byProduct = new Map<string, { value: number; count: number; name: string; ref?: string; category?: string }>()

  for (const line of orderLines) {
    const productId = line.productId || line.productRef || 'unknown'
    const existing = byProduct.get(productId) || {
      value: 0,
      count: 0,
      name: line.product?.nameEn || line.productNameEn || 'Unknown',
      ref: line.product?.ref || line.productRef || undefined,
      category: line.product?.category?.nameEn
    }
    byProduct.set(productId, {
      ...existing,
      value: existing.value + Number(line.lineTotal || 0),
      count: existing.count + Number(line.quantity || 0)
    })
  }

  return Array.from(byProduct.entries())
    .map(([id, data]) => ({
      dimension: data.name,
      value: data.value,
      count: data.count,
      percentage: 0,
      metadata: { productId: id, ref: data.ref, category: data.category }
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 20)
}

async function getByCategory(companyId: string, start: Date, end: Date): Promise<DimensionData[]> {
  const orderLines = await prisma.orderLine.findMany({
    where: {
      order: {
        companyId,
        createdAt: { gte: start, lte: end },
        status: { notIn: ['CANCELLED'] }
      }
    },
    select: {
      lineTotal: true,
      quantity: true,
      product: { select: { category: { select: { id: true, nameEn: true } } } }
    }
  })

  const byCategory = new Map<string, { value: number; count: number; name: string }>()

  for (const line of orderLines) {
    const categoryId = line.product?.category?.id || 'uncategorized'
    const categoryName = line.product?.category?.nameEn || 'Uncategorized'
    const existing = byCategory.get(categoryId) || { value: 0, count: 0, name: categoryName }
    byCategory.set(categoryId, {
      value: existing.value + Number(line.lineTotal || 0),
      count: existing.count + Number(line.quantity || 0),
      name: categoryName
    })
  }

  return Array.from(byCategory.entries())
    .map(([id, data]) => ({
      dimension: data.name,
      value: data.value,
      count: data.count,
      percentage: 0,
      metadata: { categoryId: id }
    }))
    .sort((a, b) => b.value - a.value)
}

async function getByStatus(companyId: string, start: Date, end: Date): Promise<DimensionData[]> {
  const orders = await prisma.order.groupBy({
    by: ['status'],
    where: {
      companyId,
      createdAt: { gte: start, lte: end }
    },
    _sum: { totalAmount: true },
    _count: true
  })

  const statusLabels: Record<string, string> = {
    DRAFT: 'Draft',
    PENDING: 'Pending',
    CONFIRMED: 'Confirmed',
    PREPARING: 'Preparing',
    READY: 'Ready',
    LOADING: 'Loading',
    SHIPPED: 'Shipped',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled'
  }

  return orders.map(o => ({
    dimension: statusLabels[o.status] || o.status,
    value: Number(o._sum.totalAmount || 0),
    count: o._count,
    percentage: 0,
    metadata: { status: o.status }
  }))
}

async function getByPriceTier(companyId: string, start: Date, end: Date): Promise<DimensionData[]> {
  const orders = await prisma.order.findMany({
    where: {
      companyId,
      createdAt: { gte: start, lte: end },
      status: { notIn: ['CANCELLED'] }
    },
    select: {
      totalAmount: true,
      customer: { select: { priceTier: { select: { id: true, name: true } } } }
    }
  })

  const byTier = new Map<string, { value: number; count: number; name: string }>()

  for (const order of orders) {
    const tierId = order.customer?.priceTier?.id || 'default'
    const tierName = order.customer?.priceTier?.name || 'Standard'
    const existing = byTier.get(tierId) || { value: 0, count: 0, name: tierName }
    byTier.set(tierId, {
      value: existing.value + Number(order.totalAmount || 0),
      count: existing.count + 1,
      name: tierName
    })
  }

  return Array.from(byTier.entries())
    .map(([id, data]) => ({
      dimension: data.name,
      value: data.value,
      count: data.count,
      percentage: 0,
      metadata: { priceTierId: id }
    }))
    .sort((a, b) => b.value - a.value)
}

// ============================================
// HELPERS
// ============================================

function formatDateLabel(date: Date, granularity: TimeGranularity): string {
  switch (granularity) {
    case 'day':
      return format(date, 'dd MMM')
    case 'week':
      return `W${getWeek(date)}`
    case 'month':
      return format(date, 'MMM yyyy')
    case 'quarter':
      return `Q${Math.ceil((date.getMonth() + 1) / 3)} ${date.getFullYear()}`
    case 'year':
      return format(date, 'yyyy')
    default:
      return format(date, 'dd/MM/yyyy')
  }
}
