import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { ShoppingCart, Plus, Clock, Search, Filter, ChevronRight } from 'lucide-react'
import CurrencyDisplay from '@/components/CurrencyDisplay'
import { ExportButton } from '@/components/ExportButton'
import { orderExportColumns } from '@/components/ExportModal'
import { OrderUsageIndicator } from '@/components/OrderUsageIndicator'
import { getDashboardSession } from '@/lib/auth'

const statusColors: Record<string, { bg: string; text: string }> = {
  DRAFT: { bg: 'bg-[#86868b]/10', text: 'text-[#86868b]' },
  PENDING: { bg: 'bg-[#ff9500]/10', text: 'text-[#ff9500]' },
  CONFIRMED: { bg: 'bg-[#0071e3]/10', text: 'text-[#0071e3]' },
  PREPARING: { bg: 'bg-[#5856d6]/10', text: 'text-[#5856d6]' },
  READY: { bg: 'bg-[#34c759]/10', text: 'text-[#34c759]' },
  SHIPPED: { bg: 'bg-[#34c759]/10', text: 'text-[#34c759]' },
  DELIVERED: { bg: 'bg-[#34c759]/10', text: 'text-[#34c759]' },
  CANCELLED: { bg: 'bg-[#ff3b30]/10', text: 'text-[#ff3b30]' },
}

const statusOptions = [
  { value: '', label: 'All Status' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'PREPARING', label: 'Preparing' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

export default async function OrdersPage() {
  const session = await getDashboardSession()
  if (!session) return null

  const orders = await prisma.order.findMany({
    where: { companyId: session.companyId },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      createdAt: true,
      subtotal: true,
      totalCharges: true,
      totalAmount: true,
      currency: true,
      shippingAddress: true,
      customer: true,
      _count: { select: { lines: true } }
    },
    orderBy: { createdAt: 'desc' },
  })

  // Count by status
  const statusCounts = await prisma.order.groupBy({
    by: ['status'],
    where: { companyId: session.companyId },
    _count: true
  })

  const pendingCount = statusCounts.find(s => s.status === 'PENDING')?._count || 0

  // Count orders this month for usage indicator
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)
  
  const monthlyOrderCount = await prisma.order.count({
    where: {
      companyId: session.companyId,
      createdAt: { gte: startOfMonth }
    }
  })

  // Prepare data for export (serialize dates and decimals)
  const exportData = orders.map(order => ({
    orderNumber: order.orderNumber,
    status: order.status,
    createdAt: order.createdAt.toISOString(),
    customer: {
      companyName: order.customer?.companyName || '',
      country: order.customer?.country || '',
      email: order.customer?.email || ''
    },
    subtotal: Number(order.subtotal || 0),
    totalCharges: Number(order.totalCharges || 0),
    totalDiscounts: 0, // Field not yet in database
    totalAmount: Number(order.totalAmount || 0),
    currency: order.currency,
    shippingAddress: order.shippingAddress || ''
  }))

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">Orders</h1>
          <p className="text-[15px] text-[#86868b] mt-1">
            {orders.length} order{orders.length !== 1 ? 's' : ''} total
            {pendingCount > 0 && (
              <span className="ml-2 text-[#ff9500]">• {pendingCount} pending</span>
            )}
            <OrderUsageIndicator monthlyOrderCount={monthlyOrderCount} />
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <ExportButton
            title="Orders"
            entityType="orders"
            data={exportData}
            availableColumns={orderExportColumns}
            showCustomerFilter={true}
          />
          <Link
            href="/orders/new"
            className="inline-flex items-center gap-2 bg-[#0071e3] hover:bg-[#0077ed] text-white text-[13px] font-medium px-4 h-10 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Order
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" />
            <input
              type="text"
              placeholder="Search by order number, customer..."
              className="w-full h-10 pl-10 pr-4 bg-[#f5f5f7] border-0 rounded-xl text-[14px] text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
            />
          </div>
          
          {/* Status Filter */}
          <div className="relative">
            <select className="h-10 pl-4 pr-10 bg-[#f5f5f7] border-0 rounded-xl text-[14px] text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#0071e3] appearance-none cursor-pointer">
              {statusOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b] pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-12 text-center">
          <div className="w-16 h-16 bg-[#f5f5f7] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShoppingCart className="w-8 h-8 text-[#86868b]" />
          </div>
          <h3 className="text-[17px] font-semibold text-[#1d1d1f] mb-2">No orders yet</h3>
          <p className="text-[14px] text-[#86868b] mb-6">Orders from distributors will appear here.</p>
          <Link
            href="/orders/new"
            className="inline-flex items-center gap-2 bg-[#0071e3] hover:bg-[#0077ed] text-white text-[13px] font-medium px-5 h-10 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Order
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 overflow-hidden">
          {/* Table Header */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 border-b border-[#d2d2d7]/30 bg-[#f5f5f7]/50">
            <div className="col-span-3 text-[12px] font-medium text-[#86868b] uppercase tracking-wide">Order</div>
            <div className="col-span-3 text-[12px] font-medium text-[#86868b] uppercase tracking-wide">Customer</div>
            <div className="col-span-1 text-[12px] font-medium text-[#86868b] uppercase tracking-wide">Items</div>
            <div className="col-span-2 text-[12px] font-medium text-[#86868b] uppercase tracking-wide">Total</div>
            <div className="col-span-2 text-[12px] font-medium text-[#86868b] uppercase tracking-wide">Status</div>
            <div className="col-span-1 text-[12px] font-medium text-[#86868b] uppercase tracking-wide">Date</div>
          </div>
          
          {/* Table Body */}
          <div className="divide-y divide-[#d2d2d7]/30">
            {orders.map((order) => {
              const status = statusColors[order.status] || statusColors.DRAFT
              return (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-6 py-4 hover:bg-[#f5f5f7]/50 transition-colors group"
                >
                  {/* Order Number */}
                  <div className="md:col-span-3 flex items-center justify-between md:justify-start">
                    <span className="text-[14px] font-medium text-[#0071e3] group-hover:text-[#0077ed]">
                      {order.orderNumber}
                    </span>
                    <ChevronRight className="w-4 h-4 text-[#86868b] md:hidden" />
                  </div>
                  
                  {/* Customer */}
                  <div className="md:col-span-3">
                    <p className="text-[14px] text-[#1d1d1f]">{order.customer?.companyName || '—'}</p>
                    <p className="text-[12px] text-[#86868b] md:hidden">{order._count.lines} items</p>
                  </div>
                  
                  {/* Items (hidden on mobile) */}
                  <div className="hidden md:block md:col-span-1">
                    <p className="text-[14px] text-[#1d1d1f]">{order._count.lines}</p>
                  </div>
                  
                  {/* Total */}
                  <div className="md:col-span-2 flex items-center justify-between md:block">
                    <p className="text-[14px] font-medium text-[#1d1d1f]">
                      <CurrencyDisplay amount={Number(order.totalAmount)} />
                    </p>
                    {/* Status badge on mobile */}
                    <span className={`md:hidden text-[12px] font-medium px-2 py-1 rounded-md ${status.bg} ${status.text}`}>
                      {order.status}
                    </span>
                  </div>
                  
                  {/* Status (hidden on mobile) */}
                  <div className="hidden md:block md:col-span-2">
                    <span className={`text-[12px] font-medium px-2 py-1 rounded-md ${status.bg} ${status.text}`}>
                      {order.status}
                    </span>
                  </div>
                  
                  {/* Date */}
                  <div className="hidden md:flex md:col-span-1 items-center gap-1.5 text-[13px] text-[#86868b]">
                    <Clock className="w-3.5 h-3.5" />
                    {order.createdAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
