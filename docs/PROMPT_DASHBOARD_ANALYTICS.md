# ExportFlow - Dashboard Analytique Complet

## PROMPT CURSOR - COPIER EN ENTIER

```
Crée un dashboard analytique complet pour ExportFlow.
L'utilisateur doit pouvoir analyser ses ventes sous tous les angles et exporter ses données.

## ============================================
## 1. STRUCTURE DES PAGES
## ============================================

```
/dashboard
├── /                     → Vue d'ensemble (KPIs + graphiques clés)
├── /analytics
│   ├── /                 → Dashboard analytique principal
│   ├── /sales            → Analyse des ventes détaillée
│   ├── /customers        → Analyse clients
│   ├── /products         → Analyse produits
│   ├── /geography        → Analyse géographique (carte)
│   └── /exports          → Centre d'export de données
```

## ============================================
## 2. MODÈLES PRISMA POUR ANALYTICS
## ============================================

Ajoute ces champs/modèles pour supporter les analytics:

```prisma
// Enrichir le modèle Customer
model Customer {
  // ... champs existants
  
  // Géographie
  country         String?       // Code ISO (FR, US, DE...)
  countryName     String?       // Nom complet
  region          String?       // Région/État
  city            String?       // Ville
  continent       String?       // Europe, Asia, Americas...
  timezone        String?       // Europe/Paris
  
  // Classification
  segment         String?       // SMB, MidMarket, Enterprise
  industry        String?       // Manufacturing, Retail...
  acquisitionSource String?     // Referral, Website, Trade Show...
  
  // Métriques calculées (mises à jour périodiquement)
  totalOrders     Int           @default(0)
  totalRevenue    Decimal       @default(0) @db.Decimal(15, 2)
  averageOrderValue Decimal     @default(0) @db.Decimal(15, 2)
  lastOrderDate   DateTime?
  firstOrderDate  DateTime?
}

// Enrichir le modèle Order
model Order {
  // ... champs existants
  
  // Pour analytics
  year            Int?
  month           Int?
  quarter         Int?
  weekOfYear      Int?
  dayOfWeek       Int?
  
  // Marges (optionnel)
  costTotal       Decimal?      @db.Decimal(15, 2)
  marginAmount    Decimal?      @db.Decimal(15, 2)
  marginPercent   Decimal?      @db.Decimal(5, 2)
}

// Table de snapshot pour historique (optionnel mais recommandé)
model AnalyticsSnapshot {
  id              String        @id @default(cuid())
  companyId       String
  company         Company       @relation(fields: [companyId], references: [id])
  
  date            DateTime      @db.Date
  period          String        // daily, weekly, monthly
  
  // Métriques
  ordersCount     Int
  ordersTotal     Decimal       @db.Decimal(15, 2)
  customersActive Int
  customersNew    Int
  productsOrdered Int
  averageOrderValue Decimal     @db.Decimal(15, 2)
  
  // Par statut
  ordersPending   Int
  ordersConfirmed Int
  ordersShipped   Int
  
  // Paiements
  paymentsReceived Decimal      @db.Decimal(15, 2)
  paymentsOutstanding Decimal   @db.Decimal(15, 2)
  
  createdAt       DateTime      @default(now())
  
  @@unique([companyId, date, period])
  @@index([companyId, date])
}
```

## ============================================
## 3. API ANALYTICS
## ============================================

### Types pour les analytics

Crée `src/types/analytics.ts`:

```typescript
// Période de temps
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

// Granularité
export type TimeGranularity = 'day' | 'week' | 'month' | 'quarter' | 'year'

// Filtres
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
  region?: string
  status?: string[]
  priceTier?: string
  minAmount?: number
  maxAmount?: number
}

// KPIs principaux
export interface DashboardKPIs {
  // Commandes
  totalOrders: number
  totalOrdersChange: number  // % vs période précédente
  pendingOrders: number
  
  // Revenus
  totalRevenue: number
  totalRevenueChange: number
  averageOrderValue: number
  averageOrderValueChange: number
  
  // Clients
  totalCustomers: number
  activeCustomers: number  // Ont commandé dans la période
  newCustomers: number
  newCustomersChange: number
  
  // Paiements
  paymentsReceived: number
  paymentsOutstanding: number
  paymentRate: number  // % payé
  
  // Produits
  productsOrdered: number
  topProductsCount: number
}

// Données de graphique
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

// Données par dimension
export interface DimensionData {
  dimension: string  // Nom (pays, client, produit...)
  value: number
  count: number
  percentage: number
  change?: number
  metadata?: Record<string, any>
}

// Résultats complets
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
```

### Service Analytics

Crée `src/lib/analytics.ts`:

```typescript
import { prisma } from './prisma'
import { 
  AnalyticsFilters, 
  AnalyticsResult, 
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
  format, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval
} from 'date-fns'

// ============================================
// HELPERS DATE
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
  
  // Période précédente pour comparaison
  const duration = end.getTime() - start.getTime()
  const previousEnd = new Date(start.getTime() - 1)
  const previousStart = new Date(previousEnd.getTime() - duration)
  
  return { start, end, previousStart, previousEnd, granularity }
}

// ============================================
// KPIs PRINCIPAUX
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
  
  // Construire les conditions de filtre
  const whereConditions = buildWhereConditions(companyId, filters, start, end)
  const previousWhereConditions = buildWhereConditions(companyId, filters, previousStart, previousEnd)
  
  // Requêtes parallèles pour performance
  const [
    currentOrders,
    previousOrders,
    currentCustomers,
    previousCustomers,
    pendingOrders,
    payments
  ] = await Promise.all([
    // Commandes période actuelle
    prisma.order.aggregate({
      where: whereConditions,
      _count: true,
      _sum: { total: true }
    }),
    
    // Commandes période précédente
    prisma.order.aggregate({
      where: previousWhereConditions,
      _count: true,
      _sum: { total: true }
    }),
    
    // Clients actifs période actuelle
    prisma.order.groupBy({
      by: ['customerId'],
      where: whereConditions
    }),
    
    // Clients actifs période précédente
    prisma.order.groupBy({
      by: ['customerId'],
      where: previousWhereConditions
    }),
    
    // Commandes en attente
    prisma.order.count({
      where: {
        companyId,
        deletedAt: null,
        status: { in: ['PENDING', 'CONFIRMED'] }
      }
    }),
    
    // Paiements
    prisma.orderPayment.aggregate({
      where: {
        order: { companyId, deletedAt: null },
        createdAt: { gte: start, lte: end }
      },
      _sum: { amount: true }
    })
  ])
  
  // Nouveaux clients (premier commande dans la période)
  const newCustomers = await prisma.customer.count({
    where: {
      companyId,
      deletedAt: null,
      firstOrderDate: { gte: start, lte: end }
    }
  })
  
  const previousNewCustomers = await prisma.customer.count({
    where: {
      companyId,
      deletedAt: null,
      firstOrderDate: { gte: previousStart, lte: previousEnd }
    }
  })
  
  // Paiements en attente
  const outstandingPayments = await prisma.order.aggregate({
    where: {
      companyId,
      deletedAt: null,
      paymentStatus: { in: ['PENDING', 'PARTIAL'] }
    },
    _sum: { total: true }
  })
  
  // Calculs
  const totalRevenue = Number(currentOrders._sum.total || 0)
  const previousRevenue = Number(previousOrders._sum.total || 0)
  const totalOrders = currentOrders._count
  const previousOrdersCount = previousOrders._count
  
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
  const previousAvgOrderValue = previousOrdersCount > 0 
    ? Number(previousOrders._sum.total || 0) / previousOrdersCount 
    : 0
  
  const paymentsReceived = Number(payments._sum.amount || 0)
  const paymentsOutstanding = Number(outstandingPayments._sum.total || 0)
  
  // Calcul des changements en %
  const calcChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0
    return Math.round(((current - previous) / previous) * 100)
  }
  
  return {
    totalOrders,
    totalOrdersChange: calcChange(totalOrders, previousOrdersCount),
    pendingOrders,
    
    totalRevenue,
    totalRevenueChange: calcChange(totalRevenue, previousRevenue),
    averageOrderValue: avgOrderValue,
    averageOrderValueChange: calcChange(avgOrderValue, previousAvgOrderValue),
    
    totalCustomers: await prisma.customer.count({ 
      where: { companyId, deletedAt: null } 
    }),
    activeCustomers: currentCustomers.length,
    newCustomers,
    newCustomersChange: calcChange(newCustomers, previousNewCustomers),
    
    paymentsReceived,
    paymentsOutstanding,
    paymentRate: totalRevenue > 0 
      ? Math.round((paymentsReceived / totalRevenue) * 100) 
      : 0,
    
    productsOrdered: await prisma.orderLine.groupBy({
      by: ['productId'],
      where: { order: { ...whereConditions } }
    }).then(r => r.length),
    
    topProductsCount: 10
  }
}

// ============================================
// SÉRIES TEMPORELLES
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
  
  // Générer les intervalles
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
  
  // Récupérer les données groupées
  const whereConditions = buildWhereConditions(companyId, filters, start, end)
  
  let data: TimeSeriesData[]
  
  if (metric === 'orders' || metric === 'revenue') {
    const orders = await prisma.order.findMany({
      where: whereConditions,
      select: {
        createdAt: true,
        total: true
      }
    })
    
    data = intervals.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd')
      const ordersInPeriod = orders.filter(o => {
        const orderDate = format(o.createdAt, 'yyyy-MM-dd')
        if (granularity === 'day') return orderDate === dateStr
        if (granularity === 'week') {
          const weekStart = startOfWeek(date)
          const weekEnd = endOfWeek(date)
          return o.createdAt >= weekStart && o.createdAt <= weekEnd
        }
        if (granularity === 'month') {
          const monthStart = startOfMonth(date)
          const monthEnd = endOfMonth(date)
          return o.createdAt >= monthStart && o.createdAt <= monthEnd
        }
        return false
      })
      
      return {
        date: dateStr,
        value: metric === 'orders' 
          ? ordersInPeriod.length 
          : ordersInPeriod.reduce((sum, o) => sum + Number(o.total || 0), 0),
        label: formatDateLabel(date, granularity)
      }
    })
  } else {
    // Customers - compter les clients uniques par période
    const orders = await prisma.order.findMany({
      where: whereConditions,
      select: {
        createdAt: true,
        customerId: true
      }
    })
    
    data = intervals.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd')
      const customersInPeriod = new Set(
        orders.filter(o => {
          const orderDate = format(o.createdAt, 'yyyy-MM-dd')
          if (granularity === 'day') return orderDate === dateStr
          if (granularity === 'week') {
            return o.createdAt >= startOfWeek(date) && o.createdAt <= endOfWeek(date)
          }
          if (granularity === 'month') {
            return o.createdAt >= startOfMonth(date) && o.createdAt <= endOfMonth(date)
          }
          return false
        }).map(o => o.customerId)
      )
      
      return {
        date: dateStr,
        value: customersInPeriod.size,
        label: formatDateLabel(date, granularity)
      }
    })
  }
  
  return data
}

// ============================================
// ANALYSE PAR DIMENSION
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
  
  const whereConditions = buildWhereConditions(companyId, filters, start, end)
  
  let results: DimensionData[]
  
  switch (dimension) {
    case 'country':
      results = await getByCountry(companyId, whereConditions)
      break
    case 'customer':
      results = await getByCustomer(companyId, whereConditions)
      break
    case 'product':
      results = await getByProduct(companyId, whereConditions)
      break
    case 'category':
      results = await getByCategory(companyId, whereConditions)
      break
    case 'status':
      results = await getByStatus(companyId, whereConditions)
      break
    case 'priceTier':
      results = await getByPriceTier(companyId, whereConditions)
      break
    default:
      results = []
  }
  
  // Calculer les pourcentages
  const total = results.reduce((sum, r) => sum + r.value, 0)
  return results.map(r => ({
    ...r,
    percentage: total > 0 ? Math.round((r.value / total) * 100 * 10) / 10 : 0
  }))
}

async function getByCountry(companyId: string, whereConditions: any): Promise<DimensionData[]> {
  const orders = await prisma.order.findMany({
    where: whereConditions,
    select: {
      total: true,
      customer: {
        select: { country: true, countryName: true }
      }
    }
  })
  
  const byCountry = new Map<string, { value: number; count: number; name: string }>()
  
  for (const order of orders) {
    const country = order.customer?.country || 'Unknown'
    const countryName = order.customer?.countryName || 'Unknown'
    const existing = byCountry.get(country) || { value: 0, count: 0, name: countryName }
    byCountry.set(country, {
      value: existing.value + Number(order.total || 0),
      count: existing.count + 1,
      name: countryName
    })
  }
  
  return Array.from(byCountry.entries())
    .map(([code, data]) => ({
      dimension: code,
      value: data.value,
      count: data.count,
      percentage: 0,
      metadata: { countryName: data.name }
    }))
    .sort((a, b) => b.value - a.value)
}

async function getByCustomer(companyId: string, whereConditions: any): Promise<DimensionData[]> {
  const orders = await prisma.order.groupBy({
    by: ['customerId'],
    where: whereConditions,
    _sum: { total: true },
    _count: true,
    orderBy: { _sum: { total: 'desc' } },
    take: 20
  })
  
  const customerIds = orders.map(o => o.customerId)
  const customers = await prisma.customer.findMany({
    where: { id: { in: customerIds } },
    select: { id: true, name: true, email: true, country: true }
  })
  
  const customerMap = new Map(customers.map(c => [c.id, c]))
  
  return orders.map(o => {
    const customer = customerMap.get(o.customerId)
    return {
      dimension: customer?.name || 'Unknown',
      value: Number(o._sum.total || 0),
      count: o._count,
      percentage: 0,
      metadata: {
        customerId: o.customerId,
        email: customer?.email,
        country: customer?.country
      }
    }
  })
}

async function getByProduct(companyId: string, whereConditions: any): Promise<DimensionData[]> {
  const orderLines = await prisma.orderLine.groupBy({
    by: ['productId'],
    where: {
      order: whereConditions
    },
    _sum: { 
      totalPrice: true,
      quantity: true 
    },
    _count: true,
    orderBy: { _sum: { totalPrice: 'desc' } },
    take: 20
  })
  
  const productIds = orderLines.map(o => o.productId).filter(Boolean) as string[]
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, ref: true, category: { select: { name: true } } }
  })
  
  const productMap = new Map(products.map(p => [p.id, p]))
  
  return orderLines.map(o => {
    const product = productMap.get(o.productId || '')
    return {
      dimension: product?.name || product?.ref || 'Unknown',
      value: Number(o._sum.totalPrice || 0),
      count: Number(o._sum.quantity || 0),
      percentage: 0,
      metadata: {
        productId: o.productId,
        ref: product?.ref,
        category: product?.category?.name
      }
    }
  })
}

async function getByCategory(companyId: string, whereConditions: any): Promise<DimensionData[]> {
  const orderLines = await prisma.orderLine.findMany({
    where: { order: whereConditions },
    select: {
      totalPrice: true,
      quantity: true,
      product: {
        select: { 
          category: { select: { id: true, name: true } }
        }
      }
    }
  })
  
  const byCategory = new Map<string, { value: number; count: number; name: string }>()
  
  for (const line of orderLines) {
    const categoryId = line.product?.category?.id || 'uncategorized'
    const categoryName = line.product?.category?.name || 'Non catégorisé'
    const existing = byCategory.get(categoryId) || { value: 0, count: 0, name: categoryName }
    byCategory.set(categoryId, {
      value: existing.value + Number(line.totalPrice || 0),
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

async function getByStatus(companyId: string, whereConditions: any): Promise<DimensionData[]> {
  const orders = await prisma.order.groupBy({
    by: ['status'],
    where: whereConditions,
    _sum: { total: true },
    _count: true
  })
  
  const statusLabels: Record<string, string> = {
    DRAFT: 'Brouillon',
    PENDING: 'En attente',
    CONFIRMED: 'Confirmée',
    PROCESSING: 'En préparation',
    SHIPPED: 'Expédiée',
    DELIVERED: 'Livrée',
    CANCELLED: 'Annulée'
  }
  
  return orders.map(o => ({
    dimension: statusLabels[o.status] || o.status,
    value: Number(o._sum.total || 0),
    count: o._count,
    percentage: 0,
    metadata: { status: o.status }
  }))
}

async function getByPriceTier(companyId: string, whereConditions: any): Promise<DimensionData[]> {
  const orders = await prisma.order.findMany({
    where: whereConditions,
    select: {
      total: true,
      customer: {
        select: { priceTier: { select: { id: true, name: true } } }
      }
    }
  })
  
  const byTier = new Map<string, { value: number; count: number; name: string }>()
  
  for (const order of orders) {
    const tierId = order.customer?.priceTier?.id || 'default'
    const tierName = order.customer?.priceTier?.name || 'Standard'
    const existing = byTier.get(tierId) || { value: 0, count: 0, name: tierName }
    byTier.set(tierId, {
      value: existing.value + Number(order.total || 0),
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

function buildWhereConditions(
  companyId: string, 
  filters: AnalyticsFilters,
  start: Date,
  end: Date
): any {
  const conditions: any = {
    companyId,
    deletedAt: null,
    createdAt: {
      gte: start,
      lte: end
    }
  }
  
  if (filters.customerId) {
    conditions.customerId = filters.customerId
  }
  
  if (filters.customerIds?.length) {
    conditions.customerId = { in: filters.customerIds }
  }
  
  if (filters.country) {
    conditions.customer = { country: filters.country }
  }
  
  if (filters.countries?.length) {
    conditions.customer = { country: { in: filters.countries } }
  }
  
  if (filters.status?.length) {
    conditions.status = { in: filters.status }
  }
  
  if (filters.minAmount !== undefined) {
    conditions.total = { ...conditions.total, gte: filters.minAmount }
  }
  
  if (filters.maxAmount !== undefined) {
    conditions.total = { ...conditions.total, lte: filters.maxAmount }
  }
  
  return conditions
}

function formatDateLabel(date: Date, granularity: TimeGranularity): string {
  switch (granularity) {
    case 'day':
      return format(date, 'dd MMM')
    case 'week':
      return `S${format(date, 'w')}`
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
```

## ============================================
## 4. EXPORT DE DONNÉES
## ============================================

Crée `src/lib/dataExport.ts`:

```typescript
import { prisma } from './prisma'
import { AnalyticsFilters } from '@/types/analytics'
import { getDateRange } from './analytics'
import { format } from 'date-fns'
import * as XLSX from 'xlsx'

export type ExportFormat = 'csv' | 'xlsx' | 'json'

export type ExportType = 
  | 'orders'
  | 'orderLines'
  | 'customers'
  | 'products'
  | 'payments'
  | 'invoices'
  | 'analytics'

interface ExportOptions {
  type: ExportType
  format: ExportFormat
  filters: AnalyticsFilters
  columns?: string[]
  includeMetadata?: boolean
}

// ============================================
// EXPORT PRINCIPAL
// ============================================

export async function exportData(
  companyId: string,
  options: ExportOptions
): Promise<{ data: Buffer | string; filename: string; mimeType: string }> {
  const { type, format, filters, columns } = options
  
  // Récupérer les données
  let rawData: any[]
  
  switch (type) {
    case 'orders':
      rawData = await getOrdersForExport(companyId, filters)
      break
    case 'orderLines':
      rawData = await getOrderLinesForExport(companyId, filters)
      break
    case 'customers':
      rawData = await getCustomersForExport(companyId, filters)
      break
    case 'products':
      rawData = await getProductsForExport(companyId, filters)
      break
    case 'payments':
      rawData = await getPaymentsForExport(companyId, filters)
      break
    case 'invoices':
      rawData = await getInvoicesForExport(companyId, filters)
      break
    case 'analytics':
      rawData = await getAnalyticsSummaryForExport(companyId, filters)
      break
    default:
      throw new Error(`Unknown export type: ${type}`)
  }
  
  // Filtrer les colonnes si spécifié
  if (columns && columns.length > 0) {
    rawData = rawData.map(row => {
      const filtered: any = {}
      for (const col of columns) {
        if (col in row) filtered[col] = row[col]
      }
      return filtered
    })
  }
  
  // Formater selon le format demandé
  const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm')
  let result: { data: Buffer | string; filename: string; mimeType: string }
  
  switch (format) {
    case 'csv':
      result = {
        data: convertToCSV(rawData),
        filename: `${type}_${timestamp}.csv`,
        mimeType: 'text/csv'
      }
      break
    case 'xlsx':
      result = {
        data: convertToXLSX(rawData, type),
        filename: `${type}_${timestamp}.xlsx`,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }
      break
    case 'json':
      result = {
        data: JSON.stringify(rawData, null, 2),
        filename: `${type}_${timestamp}.json`,
        mimeType: 'application/json'
      }
      break
    default:
      throw new Error(`Unknown format: ${format}`)
  }
  
  return result
}

// ============================================
// RÉCUPÉRATION DES DONNÉES
// ============================================

async function getOrdersForExport(companyId: string, filters: AnalyticsFilters) {
  const { start, end } = getDateRange(filters.period, filters.startDate, filters.endDate)
  
  const orders = await prisma.order.findMany({
    where: {
      companyId,
      deletedAt: null,
      createdAt: { gte: start, lte: end },
      ...(filters.customerId && { customerId: filters.customerId }),
      ...(filters.status?.length && { status: { in: filters.status } })
    },
    include: {
      customer: {
        select: { name: true, email: true, country: true, countryName: true }
      },
      _count: { select: { lines: true } }
    },
    orderBy: { createdAt: 'desc' }
  })
  
  return orders.map(o => ({
    'Numéro commande': o.orderNumber,
    'Date': format(o.createdAt, 'dd/MM/yyyy HH:mm'),
    'Client': o.customer.name,
    'Email client': o.customer.email,
    'Pays': o.customer.countryName || o.customer.country,
    'Statut': o.status,
    'Nb articles': o._count.lines,
    'Total HT': Number(o.total),
    'Devise': o.currency,
    'Statut paiement': o.paymentStatus,
    'Notes': o.notes || ''
  }))
}

async function getOrderLinesForExport(companyId: string, filters: AnalyticsFilters) {
  const { start, end } = getDateRange(filters.period, filters.startDate, filters.endDate)
  
  const lines = await prisma.orderLine.findMany({
    where: {
      order: {
        companyId,
        deletedAt: null,
        createdAt: { gte: start, lte: end }
      }
    },
    include: {
      order: {
        select: { 
          orderNumber: true, 
          createdAt: true,
          customer: { select: { name: true } }
        }
      },
      product: {
        select: { name: true, ref: true }
      }
    },
    orderBy: { order: { createdAt: 'desc' } }
  })
  
  return lines.map(l => ({
    'Numéro commande': l.order.orderNumber,
    'Date commande': format(l.order.createdAt, 'dd/MM/yyyy'),
    'Client': l.order.customer.name,
    'Référence produit': l.product?.ref || l.productRef,
    'Nom produit': l.product?.name || l.productName,
    'Quantité': l.quantity,
    'Prix unitaire': Number(l.unitPrice),
    'Total ligne': Number(l.totalPrice),
    'Devise': l.currency
  }))
}

async function getCustomersForExport(companyId: string, filters: AnalyticsFilters) {
  const customers = await prisma.customer.findMany({
    where: {
      companyId,
      deletedAt: null,
      ...(filters.country && { country: filters.country })
    },
    include: {
      priceTier: { select: { name: true } },
      _count: { select: { orders: true } }
    },
    orderBy: { name: 'asc' }
  })
  
  return customers.map(c => ({
    'Nom': c.name,
    'Email': c.email,
    'Téléphone': c.phone || '',
    'Pays': c.countryName || c.country || '',
    'Région': c.region || '',
    'Ville': c.city || '',
    'Segment': c.segment || '',
    'Niveau de prix': c.priceTier?.name || 'Standard',
    'Nb commandes': c._count.orders,
    'CA total': Number(c.totalRevenue),
    'Panier moyen': Number(c.averageOrderValue),
    'Dernière commande': c.lastOrderDate ? format(c.lastOrderDate, 'dd/MM/yyyy') : '',
    'Créé le': format(c.createdAt, 'dd/MM/yyyy')
  }))
}

async function getProductsForExport(companyId: string, filters: AnalyticsFilters) {
  const products = await prisma.product.findMany({
    where: {
      companyId,
      deletedAt: null
    },
    include: {
      category: { select: { name: true } },
      prices: { select: { priceTier: { select: { name: true } }, price: true } }
    },
    orderBy: { name: 'asc' }
  })
  
  return products.map(p => ({
    'Référence': p.ref,
    'Nom': p.name,
    'Description': p.description || '',
    'Catégorie': p.category?.name || '',
    'Prix de base': Number(p.basePrice),
    'Devise': p.currency,
    'Stock': p.stock ?? '',
    'Actif': p.isActive ? 'Oui' : 'Non',
    'Créé le': format(p.createdAt, 'dd/MM/yyyy')
  }))
}

async function getPaymentsForExport(companyId: string, filters: AnalyticsFilters) {
  const { start, end } = getDateRange(filters.period, filters.startDate, filters.endDate)
  
  const payments = await prisma.orderPayment.findMany({
    where: {
      order: { companyId, deletedAt: null },
      createdAt: { gte: start, lte: end }
    },
    include: {
      order: {
        select: { 
          orderNumber: true,
          customer: { select: { name: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })
  
  return payments.map(p => ({
    'Numéro commande': p.order.orderNumber,
    'Client': p.order.customer.name,
    'Type': p.type,
    'Montant': Number(p.amount),
    'Devise': p.currency,
    'Méthode': p.method,
    'Référence': p.reference || '',
    'Date': format(p.createdAt, 'dd/MM/yyyy HH:mm'),
    'Notes': p.notes || ''
  }))
}

async function getInvoicesForExport(companyId: string, filters: AnalyticsFilters) {
  const { start, end } = getDateRange(filters.period, filters.startDate, filters.endDate)
  
  const invoices = await prisma.invoice.findMany({
    where: {
      companyId,
      deletedAt: null,
      createdAt: { gte: start, lte: end }
    },
    include: {
      order: { select: { orderNumber: true } },
      customer: { select: { name: true } }
    },
    orderBy: { createdAt: 'desc' }
  })
  
  return invoices.map(i => ({
    'Numéro facture': i.invoiceNumber,
    'Type': i.type,
    'Numéro commande': i.order?.orderNumber || '',
    'Client': i.customer.name,
    'Total HT': Number(i.totalExclTax),
    'TVA': Number(i.taxAmount),
    'Total TTC': Number(i.totalInclTax),
    'Devise': i.currency,
    'Statut': i.status,
    'Date émission': format(i.issuedAt, 'dd/MM/yyyy'),
    'Date échéance': i.dueAt ? format(i.dueAt, 'dd/MM/yyyy') : ''
  }))
}

async function getAnalyticsSummaryForExport(companyId: string, filters: AnalyticsFilters) {
  // Export des métriques agrégées
  const { getDashboardKPIs, getByDimension } = await import('./analytics')
  
  const kpis = await getDashboardKPIs(companyId, filters)
  const byCountry = await getByDimension(companyId, filters, 'country')
  const byCustomer = await getByDimension(companyId, filters, 'customer')
  const byProduct = await getByDimension(companyId, filters, 'product')
  
  return [
    { 'Métrique': 'Commandes totales', 'Valeur': kpis.totalOrders },
    { 'Métrique': 'Chiffre d\'affaires', 'Valeur': kpis.totalRevenue },
    { 'Métrique': 'Panier moyen', 'Valeur': kpis.averageOrderValue },
    { 'Métrique': 'Clients actifs', 'Valeur': kpis.activeCustomers },
    { 'Métrique': 'Nouveaux clients', 'Valeur': kpis.newCustomers },
    { 'Métrique': 'Paiements reçus', 'Valeur': kpis.paymentsReceived },
    { 'Métrique': 'Paiements en attente', 'Valeur': kpis.paymentsOutstanding },
    { 'Métrique': '', 'Valeur': '' },
    { 'Métrique': '--- TOP PAYS ---', 'Valeur': '' },
    ...byCountry.slice(0, 10).map(c => ({
      'Métrique': c.metadata?.countryName || c.dimension,
      'Valeur': c.value
    })),
    { 'Métrique': '', 'Valeur': '' },
    { 'Métrique': '--- TOP CLIENTS ---', 'Valeur': '' },
    ...byCustomer.slice(0, 10).map(c => ({
      'Métrique': c.dimension,
      'Valeur': c.value
    })),
    { 'Métrique': '', 'Valeur': '' },
    { 'Métrique': '--- TOP PRODUITS ---', 'Valeur': '' },
    ...byProduct.slice(0, 10).map(p => ({
      'Métrique': p.dimension,
      'Valeur': p.value
    }))
  ]
}

// ============================================
// CONVERSION FORMATS
// ============================================

function convertToCSV(data: any[]): string {
  if (data.length === 0) return ''
  
  const headers = Object.keys(data[0])
  const rows = data.map(row => 
    headers.map(h => {
      const val = row[h]
      if (val === null || val === undefined) return ''
      if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
        return `"${val.replace(/"/g, '""')}"`
      }
      return String(val)
    }).join(',')
  )
  
  return [headers.join(','), ...rows].join('\n')
}

function convertToXLSX(data: any[], sheetName: string): Buffer {
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31))
  
  // Ajuster la largeur des colonnes
  const colWidths = Object.keys(data[0] || {}).map(key => ({
    wch: Math.max(
      key.length,
      ...data.map(row => String(row[key] || '').length)
    )
  }))
  ws['!cols'] = colWidths
  
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }))
}
```

## ============================================
## 5. API ROUTES
## ============================================

### Route Analytics principale

`src/app/api/analytics/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getDashboardKPIs, getTimeSeries, getByDimension } from '@/lib/analytics'
import { AnalyticsFilters, AnalyticsResult } from '@/types/analytics'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    
    const filters: AnalyticsFilters = {
      period: (searchParams.get('period') || 'last30days') as any,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      customerId: searchParams.get('customerId') || undefined,
      country: searchParams.get('country') || undefined,
      status: searchParams.getAll('status') || undefined
    }
    
    // Récupérer toutes les données en parallèle
    const [
      kpis,
      ordersTimeSeries,
      revenueTimeSeries,
      customersTimeSeries,
      byCountry,
      byCustomer,
      byProduct,
      byCategory,
      byStatus,
      byPriceTier
    ] = await Promise.all([
      getDashboardKPIs(user.companyId, filters),
      getTimeSeries(user.companyId, filters, 'orders'),
      getTimeSeries(user.companyId, filters, 'revenue'),
      getTimeSeries(user.companyId, filters, 'customers'),
      getByDimension(user.companyId, filters, 'country'),
      getByDimension(user.companyId, filters, 'customer'),
      getByDimension(user.companyId, filters, 'product'),
      getByDimension(user.companyId, filters, 'category'),
      getByDimension(user.companyId, filters, 'status'),
      getByDimension(user.companyId, filters, 'priceTier')
    ])
    
    const result: AnalyticsResult = {
      kpis,
      timeSeries: {
        orders: ordersTimeSeries,
        revenue: revenueTimeSeries,
        customers: customersTimeSeries
      },
      byDimension: {
        byCountry,
        byCustomer,
        byProduct,
        byCategory,
        byStatus,
        byPriceTier
      },
      period: {
        start: filters.startDate || '',
        end: filters.endDate || '',
        granularity: 'day'
      }
    }
    
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('[Analytics Error]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

### Route Export

`src/app/api/exports/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { exportData, ExportFormat, ExportType } from '@/lib/dataExport'
import { createAuditLog } from '@/lib/auditLog'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { type, format, filters, columns } = body
    
    // Valider
    const validTypes: ExportType[] = ['orders', 'orderLines', 'customers', 'products', 'payments', 'invoices', 'analytics']
    const validFormats: ExportFormat[] = ['csv', 'xlsx', 'json']
    
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid export type' }, { status: 400 })
    }
    
    if (!validFormats.includes(format)) {
      return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
    }
    
    // Exporter
    const result = await exportData(user.companyId, {
      type,
      format,
      filters: filters || { period: 'last30days' },
      columns
    })
    
    // Audit log
    await createAuditLog({
      companyId: user.companyId,
      userId: user.id,
      action: 'DATA_EXPORT',
      entityType: type,
      metadata: { format, filters, rowCount: result.data.length }
    })
    
    // Retourner le fichier
    const headers = new Headers()
    headers.set('Content-Type', result.mimeType)
    headers.set('Content-Disposition', `attachment; filename="${result.filename}"`)
    
    return new Response(result.data, { headers })
  } catch (error: any) {
    console.error('[Export Error]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

## ============================================
## 6. COMPOSANTS UI
## ============================================

### Page Dashboard principale

`src/app/(tenant)/(dashboard)/dashboard/page.tsx`:

```tsx
'use client'

import { useState, useEffect } from 'react'
import { KPICards } from '@/components/analytics/KPICards'
import { RevenueChart } from '@/components/analytics/RevenueChart'
import { OrdersChart } from '@/components/analytics/OrdersChart'
import { TopCustomers } from '@/components/analytics/TopCustomers'
import { TopProducts } from '@/components/analytics/TopProducts'
import { GeographyMap } from '@/components/analytics/GeographyMap'
import { PeriodSelector } from '@/components/analytics/PeriodSelector'
import { AnalyticsResult, TimePeriod } from '@/types/analytics'

export default function DashboardPage() {
  const [period, setPeriod] = useState<TimePeriod>('last30days')
  const [data, setData] = useState<AnalyticsResult | null>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    loadData()
  }, [period])
  
  async function loadData() {
    setLoading(true)
    try {
      const res = await fetch(`/api/analytics?period=${period}`)
      const result = await res.json()
      setData(result)
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setLoading(false)
    }
  }
  
  if (loading && !data) {
    return <DashboardSkeleton />
  }
  
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tableau de bord</h1>
          <p className="text-gray-500">Vue d'ensemble de votre activité</p>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>
      
      {/* KPIs */}
      <KPICards kpis={data?.kpis} loading={loading} />
      
      {/* Graphiques principaux */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart 
          data={data?.timeSeries.revenue || []} 
          loading={loading}
        />
        <OrdersChart 
          data={data?.timeSeries.orders || []} 
          loading={loading}
        />
      </div>
      
      {/* Analyses par dimension */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TopCustomers 
          data={data?.byDimension.byCustomer.slice(0, 5) || []}
          loading={loading}
        />
        <TopProducts 
          data={data?.byDimension.byProduct.slice(0, 5) || []}
          loading={loading}
        />
        <GeographyMap 
          data={data?.byDimension.byCountry || []}
          loading={loading}
        />
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-48" />
      <div className="grid grid-cols-4 gap-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="h-24 bg-gray-200 rounded" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="h-64 bg-gray-200 rounded" />
        <div className="h-64 bg-gray-200 rounded" />
      </div>
    </div>
  )
}
```

### Composant KPI Cards

`src/components/analytics/KPICards.tsx`:

```tsx
import { DashboardKPIs } from '@/types/analytics'
import { 
  TrendingUp, TrendingDown, Minus,
  ShoppingCart, DollarSign, Users, CreditCard
} from 'lucide-react'

interface KPICardsProps {
  kpis?: DashboardKPIs
  loading?: boolean
}

export function KPICards({ kpis, loading }: KPICardsProps) {
  const cards = [
    {
      title: 'Chiffre d\'affaires',
      value: kpis?.totalRevenue || 0,
      change: kpis?.totalRevenueChange || 0,
      format: 'currency',
      icon: DollarSign,
      color: 'blue'
    },
    {
      title: 'Commandes',
      value: kpis?.totalOrders || 0,
      change: kpis?.totalOrdersChange || 0,
      format: 'number',
      icon: ShoppingCart,
      color: 'green',
      subtitle: `${kpis?.pendingOrders || 0} en attente`
    },
    {
      title: 'Clients actifs',
      value: kpis?.activeCustomers || 0,
      change: kpis?.newCustomersChange || 0,
      format: 'number',
      icon: Users,
      color: 'purple',
      subtitle: `${kpis?.newCustomers || 0} nouveaux`
    },
    {
      title: 'Paiements reçus',
      value: kpis?.paymentsReceived || 0,
      change: kpis?.paymentRate || 0,
      format: 'currency',
      icon: CreditCard,
      color: 'orange',
      subtitle: `${kpis?.paymentRate || 0}% payé`
    }
  ]
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => (
        <div 
          key={i}
          className={`bg-white rounded-lg border p-4 ${loading ? 'animate-pulse' : ''}`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">{card.title}</span>
            <card.icon className={`w-5 h-5 text-${card.color}-500`} />
          </div>
          
          <div className="text-2xl font-bold mb-1">
            {card.format === 'currency' 
              ? formatCurrency(card.value)
              : formatNumber(card.value)
            }
          </div>
          
          <div className="flex items-center justify-between">
            <ChangeIndicator value={card.change} />
            {card.subtitle && (
              <span className="text-xs text-gray-400">{card.subtitle}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function ChangeIndicator({ value }: { value: number }) {
  if (value === 0) {
    return (
      <span className="flex items-center text-xs text-gray-400">
        <Minus className="w-3 h-3 mr-1" />
        0%
      </span>
    )
  }
  
  const isPositive = value > 0
  return (
    <span className={`flex items-center text-xs ${
      isPositive ? 'text-green-600' : 'text-red-600'
    }`}>
      {isPositive ? (
        <TrendingUp className="w-3 h-3 mr-1" />
      ) : (
        <TrendingDown className="w-3 h-3 mr-1" />
      )}
      {isPositive ? '+' : ''}{value}%
    </span>
  )
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('fr-FR').format(value)
}
```

### Composant Revenue Chart

`src/components/analytics/RevenueChart.tsx`:

```tsx
'use client'

import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer 
} from 'recharts'
import { TimeSeriesData } from '@/types/analytics'

interface RevenueChartProps {
  data: TimeSeriesData[]
  loading?: boolean
}

export function RevenueChart({ data, loading }: RevenueChartProps) {
  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="font-semibold mb-4">Chiffre d'affaires</h3>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="label" 
              tick={{ fontSize: 12 }}
              tickLine={false}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickLine={false}
              tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip 
              formatter={(value: number) => [`€${value.toLocaleString()}`, 'CA']}
              contentStyle={{ 
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}
            />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke="#3B82F6" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorRevenue)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
```

### Composant Geography Map

`src/components/analytics/GeographyMap.tsx`:

```tsx
'use client'

import { DimensionData } from '@/types/analytics'

interface GeographyMapProps {
  data: DimensionData[]
  loading?: boolean
}

// Mapping des codes pays vers les coordonnées pour une simple visualisation
const COUNTRY_COORDS: Record<string, { lat: number; lng: number; name: string }> = {
  FR: { lat: 46.2276, lng: 2.2137, name: 'France' },
  DE: { lat: 51.1657, lng: 10.4515, name: 'Allemagne' },
  GB: { lat: 55.3781, lng: -3.4360, name: 'Royaume-Uni' },
  US: { lat: 37.0902, lng: -95.7129, name: 'États-Unis' },
  NL: { lat: 52.1326, lng: 5.2913, name: 'Pays-Bas' },
  BE: { lat: 50.5039, lng: 4.4699, name: 'Belgique' },
  ES: { lat: 40.4637, lng: -3.7492, name: 'Espagne' },
  IT: { lat: 41.8719, lng: 12.5674, name: 'Italie' },
  // Ajouter plus selon besoins
}

export function GeographyMap({ data, loading }: GeographyMapProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0)
  
  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="font-semibold mb-4">Répartition géographique</h3>
      
      <div className="space-y-3">
        {data.slice(0, 8).map((country, i) => {
          const percentage = total > 0 ? (country.value / total) * 100 : 0
          const countryName = country.metadata?.countryName || country.dimension
          
          return (
            <div key={i} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-2">
                  <CountryFlag code={country.dimension} />
                  {countryName}
                </span>
                <span className="font-medium">
                  €{country.value.toLocaleString()}
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>{country.count} commandes</span>
                <span>{percentage.toFixed(1)}%</span>
              </div>
            </div>
          )
        })}
      </div>
      
      {data.length > 8 && (
        <div className="mt-4 text-center">
          <a href="/dashboard/analytics/geography" className="text-sm text-blue-500 hover:underline">
            Voir tous les pays ({data.length})
          </a>
        </div>
      )}
    </div>
  )
}

function CountryFlag({ code }: { code: string }) {
  // Utilise des emoji flags ou une lib d'icônes
  const flagEmoji = code
    .toUpperCase()
    .split('')
    .map(char => String.fromCodePoint(char.charCodeAt(0) + 127397))
    .join('')
  
  return <span className="text-lg">{flagEmoji}</span>
}
```

### Page Export de données

`src/app/(tenant)/(dashboard)/dashboard/analytics/exports/page.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Download, FileSpreadsheet, FileJson, FileText } from 'lucide-react'
import { PeriodSelector } from '@/components/analytics/PeriodSelector'
import { TimePeriod } from '@/types/analytics'

const EXPORT_TYPES = [
  { 
    id: 'orders', 
    label: 'Commandes', 
    description: 'Toutes les commandes avec détails clients',
    icon: FileSpreadsheet
  },
  { 
    id: 'orderLines', 
    label: 'Lignes de commande', 
    description: 'Détail produit par produit de chaque commande',
    icon: FileSpreadsheet
  },
  { 
    id: 'customers', 
    label: 'Clients', 
    description: 'Liste complète des clients avec métriques',
    icon: FileSpreadsheet
  },
  { 
    id: 'products', 
    label: 'Produits', 
    description: 'Catalogue produits complet',
    icon: FileSpreadsheet
  },
  { 
    id: 'payments', 
    label: 'Paiements', 
    description: 'Historique des paiements reçus',
    icon: FileSpreadsheet
  },
  { 
    id: 'invoices', 
    label: 'Factures', 
    description: 'Liste des factures émises',
    icon: FileSpreadsheet
  },
  { 
    id: 'analytics', 
    label: 'Résumé analytique', 
    description: 'KPIs et top performers',
    icon: FileSpreadsheet
  }
]

const FORMATS = [
  { id: 'xlsx', label: 'Excel (.xlsx)', icon: FileSpreadsheet },
  { id: 'csv', label: 'CSV', icon: FileText },
  { id: 'json', label: 'JSON', icon: FileJson }
]

export default function ExportsPage() {
  const [selectedType, setSelectedType] = useState<string>('orders')
  const [selectedFormat, setSelectedFormat] = useState<string>('xlsx')
  const [period, setPeriod] = useState<TimePeriod>('last30days')
  const [loading, setLoading] = useState(false)
  
  async function handleExport() {
    setLoading(true)
    try {
      const res = await fetch('/api/exports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedType,
          format: selectedFormat,
          filters: { period }
        })
      })
      
      if (!res.ok) throw new Error('Export failed')
      
      // Télécharger le fichier
      const blob = await res.blob()
      const filename = res.headers.get('Content-Disposition')
        ?.split('filename="')[1]?.replace('"', '') 
        || `export.${selectedFormat}`
      
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
    } catch (error) {
      console.error('Export error:', error)
      alert('Erreur lors de l\'export')
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-2">Exporter vos données</h1>
      <p className="text-gray-500 mb-8">
        Téléchargez vos données au format de votre choix
      </p>
      
      {/* Période */}
      <div className="mb-8">
        <label className="block text-sm font-medium mb-2">Période</label>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>
      
      {/* Type d'export */}
      <div className="mb-8">
        <label className="block text-sm font-medium mb-3">
          Type de données
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {EXPORT_TYPES.map(type => (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              className={`flex items-start gap-3 p-4 rounded-lg border text-left transition ${
                selectedType === type.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <type.icon className={`w-5 h-5 mt-0.5 ${
                selectedType === type.id ? 'text-blue-500' : 'text-gray-400'
              }`} />
              <div>
                <div className="font-medium">{type.label}</div>
                <div className="text-sm text-gray-500">{type.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
      
      {/* Format */}
      <div className="mb-8">
        <label className="block text-sm font-medium mb-3">Format</label>
        <div className="flex gap-3">
          {FORMATS.map(format => (
            <button
              key={format.id}
              onClick={() => setSelectedFormat(format.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition ${
                selectedFormat === format.id
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <format.icon className="w-4 h-4" />
              {format.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Bouton export */}
      <button
        onClick={handleExport}
        disabled={loading}
        className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Download className="w-5 h-5" />
        {loading ? 'Export en cours...' : 'Télécharger'}
      </button>
    </div>
  )
}
```

### Sélecteur de période

`src/components/analytics/PeriodSelector.tsx`:

```tsx
import { TimePeriod } from '@/types/analytics'

const PERIODS: { value: TimePeriod; label: string }[] = [
  { value: 'today', label: "Aujourd'hui" },
  { value: 'yesterday', label: 'Hier' },
  { value: 'last7days', label: '7 derniers jours' },
  { value: 'last30days', label: '30 derniers jours' },
  { value: 'thisMonth', label: 'Ce mois' },
  { value: 'lastMonth', label: 'Mois dernier' },
  { value: 'thisQuarter', label: 'Ce trimestre' },
  { value: 'lastQuarter', label: 'Trimestre dernier' },
  { value: 'thisYear', label: 'Cette année' },
  { value: 'lastYear', label: 'Année dernière' },
  { value: 'custom', label: 'Personnalisé' }
]

interface PeriodSelectorProps {
  value: TimePeriod
  onChange: (period: TimePeriod) => void
}

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as TimePeriod)}
      className="px-3 py-2 border rounded-lg bg-white text-sm"
    >
      {PERIODS.map(p => (
        <option key={p.value} value={p.value}>
          {p.label}
        </option>
      ))}
    </select>
  )
}
```

## ============================================
## 7. DÉPENDANCES À INSTALLER
## ============================================

```bash
npm install recharts date-fns xlsx lucide-react
```

## ============================================
## 8. RÉSUMÉ DES FONCTIONNALITÉS
## ============================================

### Dashboard principal
- [x] 4 KPIs avec évolution vs période précédente
- [x] Graphique chiffre d'affaires (area chart)
- [x] Graphique commandes (bar chart)
- [x] Top 5 clients
- [x] Top 5 produits
- [x] Répartition géographique

### Analyses disponibles
- [x] Par pays / continent
- [x] Par client (top performers)
- [x] Par produit
- [x] Par catégorie
- [x] Par statut de commande
- [x] Par niveau de prix (price tier)
- [x] Évolution temporelle (jour/semaine/mois)

### Exports
- [x] Commandes complètes
- [x] Lignes de commande détaillées
- [x] Liste clients avec métriques
- [x] Catalogue produits
- [x] Historique paiements
- [x] Factures
- [x] Résumé analytique

### Formats d'export
- [x] Excel (.xlsx)
- [x] CSV
- [x] JSON

### Filtres
- [x] Période (aujourd'hui, 7j, 30j, mois, trimestre, année, custom)
- [x] Client spécifique
- [x] Pays
- [x] Statut commande
- [x] Montant min/max
```
