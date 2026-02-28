import { prisma } from './prisma'
import { AnalyticsFilters, ExportFormat, ExportType } from '@/types/analytics'
import { getDateRange, getDashboardKPIs, getByDimension } from './analytics'
import { format } from 'date-fns'
import * as XLSX from 'xlsx'
import { OrderStatus } from '@prisma/client'

interface ExportOptions {
  type: ExportType
  format: ExportFormat
  filters: AnalyticsFilters
  columns?: string[]
}

export async function exportData(
  companyId: string,
  options: ExportOptions
): Promise<{ data: Buffer | string; filename: string; mimeType: string }> {
  const { type, format: exportFormat, filters, columns } = options

  let rawData: Record<string, unknown>[]

  switch (type) {
    case 'orders':
      rawData = await getOrdersForExport(companyId, filters)
      break
    case 'orderLines':
      rawData = await getOrderLinesForExport(companyId, filters)
      break
    case 'customers':
      rawData = await getCustomersForExport(companyId)
      break
    case 'products':
      rawData = await getProductsForExport(companyId)
      break
    case 'payments':
      rawData = await getOrdersForExport(companyId, filters)
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

  if (columns && columns.length > 0) {
    rawData = rawData.map(row => {
      const filtered: Record<string, unknown> = {}
      for (const col of columns) {
        if (col in row) filtered[col] = row[col]
      }
      return filtered
    })
  }

  const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm')
  let result: { data: Buffer | string; filename: string; mimeType: string }

  switch (exportFormat) {
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
      throw new Error(`Unknown format: ${exportFormat}`)
  }

  return result
}

// ============================================
// DATA FETCHERS
// ============================================

async function getOrdersForExport(companyId: string, filters: AnalyticsFilters) {
  const { start, end } = getDateRange(filters.period, filters.startDate, filters.endDate)

  const orders = await prisma.order.findMany({
    where: {
      companyId,
      createdAt: { gte: start, lte: end },
      ...(filters.customerId && { customerId: filters.customerId }),
      ...(filters.status?.length && { status: { in: filters.status as OrderStatus[] } })
    },
    include: {
      customer: {
        select: { companyName: true, email: true, country: true }
      },
      _count: { select: { lines: true } }
    },
    orderBy: { createdAt: 'desc' }
  })

  return orders.map(o => ({
    'Order Number': o.orderNumber,
    'Date': format(o.createdAt, 'dd/MM/yyyy HH:mm'),
    'Customer': o.customer.companyName,
    'Customer Email': o.customer.email,
    'Country': o.customer.country || '',
    'Status': o.status,
    'Items': o._count.lines,
    'Total': Number(o.totalAmount),
    'Currency': o.currency,
    'Notes': o.notesEn || ''
  }))
}

async function getOrderLinesForExport(companyId: string, filters: AnalyticsFilters) {
  const { start, end } = getDateRange(filters.period, filters.startDate, filters.endDate)

  const lines = await prisma.orderLine.findMany({
    where: {
      order: {
        companyId,
        createdAt: { gte: start, lte: end }
      }
    },
    include: {
      order: {
        select: {
          orderNumber: true,
          createdAt: true,
          customer: { select: { companyName: true } }
        }
      },
      product: {
        select: { nameEn: true, ref: true }
      }
    },
    orderBy: { order: { createdAt: 'desc' } }
  })

  return lines.map(l => ({
    'Order Number': l.order.orderNumber,
    'Order Date': format(l.order.createdAt, 'dd/MM/yyyy'),
    'Customer': l.order.customer.companyName,
    'Product Ref': l.product?.ref || l.productRef || '',
    'Product Name': l.product?.nameEn || l.productNameEn || '',
    'Quantity': l.quantity,
    'Unit Price': Number(l.unitPrice),
    'Line Total': Number(l.lineTotal)
  }))
}

async function getCustomersForExport(companyId: string) {
  const customers = await prisma.customer.findMany({
    where: {
      companyId,
      isActive: true
    },
    include: {
      priceTier: { select: { name: true } },
      _count: { select: { orders: true } }
    },
    orderBy: { companyName: 'asc' }
  })

  return customers.map(c => ({
    'Company Name': c.companyName,
    'Contact': c.contactName || '',
    'Email': c.email,
    'Phone': c.phone || '',
    'Country': c.country || '',
    'City': c.shippingCity || '',
    'Price Tier': c.priceTier?.name || 'Standard',
    'Orders': c._count.orders,
    'Payment Terms': c.paymentTerms || '',
    'Created': format(c.createdAt, 'dd/MM/yyyy')
  }))
}

async function getProductsForExport(companyId: string) {
  const products = await prisma.product.findMany({
    where: {
      companyId
    },
    include: {
      category: { select: { nameEn: true } }
    },
    orderBy: { nameEn: 'asc' }
  })

  return products.map(p => ({
    'Reference': p.ref,
    'Name': p.nameEn,
    'Description': p.description || '',
    'Category': p.category?.nameEn || '',
    'Base Price': Number(p.priceBase || p.priceRmb || 0),
    'HS Code': p.hsCode || '',
    'Weight (kg)': Number(p.weightKg || 0),
    'Active': p.isActive ? 'Yes' : 'No',
    'Created': format(p.createdAt, 'dd/MM/yyyy')
  }))
}

async function getInvoicesForExport(companyId: string, filters: AnalyticsFilters) {
  const { start, end } = getDateRange(filters.period, filters.startDate, filters.endDate)

  const invoices = await prisma.invoice.findMany({
    where: {
      createdAt: { gte: start, lte: end },
      order: { companyId }
    },
    include: {
      order: { select: { orderNumber: true, customer: { select: { companyName: true } } } }
    },
    orderBy: { createdAt: 'desc' }
  })

  return invoices.map(i => ({
    'Invoice Number': i.invoiceNumber,
    'Type': i.type,
    'Order Number': i.order?.orderNumber || '',
    'Customer': i.order?.customer?.companyName || '',
    'Total': Number(i.totalAmount),
    'Currency': i.currency,
    'Status': i.status,
    'Issue Date': format(i.issueDate, 'dd/MM/yyyy'),
    'Due Date': i.dueDate ? format(i.dueDate, 'dd/MM/yyyy') : ''
  }))
}

async function getAnalyticsSummaryForExport(companyId: string, filters: AnalyticsFilters) {
  const kpis = await getDashboardKPIs(companyId, filters)
  const byCountry = await getByDimension(companyId, filters, 'country')
  const byCustomer = await getByDimension(companyId, filters, 'customer')
  const byProduct = await getByDimension(companyId, filters, 'product')

  const result: Record<string, unknown>[] = [
    { 'Metric': 'Total Orders', 'Value': kpis.totalOrders },
    { 'Metric': 'Total Revenue', 'Value': kpis.totalRevenue },
    { 'Metric': 'Average Order Value', 'Value': kpis.averageOrderValue },
    { 'Metric': 'Active Customers', 'Value': kpis.activeCustomers },
    { 'Metric': 'New Customers', 'Value': kpis.newCustomers },
    { 'Metric': '', 'Value': '' },
    { 'Metric': '--- TOP COUNTRIES ---', 'Value': '' },
    ...byCountry.slice(0, 10).map(c => ({
      'Metric': String(c.dimension),
      'Value': c.value
    })),
    { 'Metric': '', 'Value': '' },
    { 'Metric': '--- TOP CUSTOMERS ---', 'Value': '' },
    ...byCustomer.slice(0, 10).map(c => ({
      'Metric': c.dimension,
      'Value': c.value
    })),
    { 'Metric': '', 'Value': '' },
    { 'Metric': '--- TOP PRODUCTS ---', 'Value': '' },
    ...byProduct.slice(0, 10).map(p => ({
      'Metric': p.dimension,
      'Value': p.value
    }))
  ]

  return result
}

// ============================================
// FORMAT CONVERTERS
// ============================================

function convertToCSV(data: Record<string, unknown>[]): string {
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

function convertToXLSX(data: Record<string, unknown>[], sheetName: string): Buffer {
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31))

  if (data.length > 0) {
    const colWidths = Object.keys(data[0]).map(key => ({
      wch: Math.max(
        key.length,
        ...data.map(row => String(row[key] || '').length).slice(0, 100)
      )
    }))
    ws['!cols'] = colWidths
  }

  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }))
}
