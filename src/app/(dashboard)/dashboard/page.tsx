import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Package, Users, ShoppingCart, FileText, Plus, ArrowRight } from 'lucide-react'
import DashboardRevenue from '@/components/DashboardRevenue'
import CurrencyDisplay from '@/components/CurrencyDisplay'
import { getDashboardSession } from '@/lib/auth'

export default async function DashboardPage() {
  const session = await getDashboardSession()
  if (!session) return null

  const [productCount, customerCount, orderCount, pendingOrderCount] = await Promise.all([
    prisma.product.count({ where: { companyId: session.companyId, isActive: true } }),
    prisma.customer.count({ where: { companyId: session.companyId, isActive: true } }),
    prisma.order.count({ where: { companyId: session.companyId } }),
    prisma.order.count({ where: { companyId: session.companyId, status: 'PENDING' } }),
  ])

  const recentOrders = await prisma.order.findMany({
    where: { companyId: session.companyId },
    include: { customer: true },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })

  // Calculate revenue (this month)
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const monthlyOrders = await prisma.order.findMany({
    where: {
      companyId: session.companyId,
      createdAt: { gte: startOfMonth },
      status: { not: 'CANCELLED' }
    },
    select: { totalAmount: true }
  })

  const monthlyRevenue = monthlyOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0)

  const stats = [
    { label: 'Products', value: productCount, icon: Package, href: '/products', color: 'from-[#0071e3] to-[#00a1ff]' },
    { label: 'Customers', value: customerCount, icon: Users, href: '/customers', color: 'from-[#34c759] to-[#30d158]' },
    { label: 'Total Orders', value: orderCount, icon: ShoppingCart, href: '/orders', color: 'from-[#ff9500] to-[#ffb340]' },
    { label: 'Pending', value: pendingOrderCount, icon: FileText, href: '/orders?status=PENDING', color: 'from-[#ff3b30] to-[#ff6961]' },
  ]

  const quickActions = [
    { label: 'Add Product', href: '/products/new', icon: Package },
    { label: 'Add Customer', href: '/customers/new', icon: Users },
    { label: 'New Order', href: '/orders/new', icon: ShoppingCart },
  ]

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">
          Welcome back
        </h1>
        <p className="text-[15px] text-[#86868b] mt-1">
          Here&apos;s what&apos;s happening with your business today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-5 hover:border-[#0071e3]/40 hover:shadow-lg transition-all duration-300 group"
            >
              <div className={`w-10 h-10 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-[28px] font-semibold text-[#1d1d1f]">{stat.value}</p>
              <p className="text-[13px] text-[#86868b]">{stat.label}</p>
            </Link>
          )
        })}
      </div>

      {/* Revenue Card */}
      <DashboardRevenue revenue={monthlyRevenue} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#d2d2d7]/30 overflow-hidden">
          <div className="px-6 py-4 border-b border-[#d2d2d7]/30 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-[#1d1d1f]">Recent Orders</h2>
            <Link href="/orders" className="text-[13px] text-[#0071e3] hover:text-[#0077ed] flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <ShoppingCart className="w-10 h-10 text-[#86868b] mx-auto mb-3" />
              <p className="text-[14px] text-[#86868b]">No orders yet</p>
              <Link href="/orders/new" className="text-[#0071e3] text-[13px] mt-2 inline-block">
                Create your first order
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[#d2d2d7]/30">
              {recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="px-6 py-4 flex items-center justify-between hover:bg-[#f5f5f7]/50 transition-colors"
                >
                  <div>
                    <p className="text-[14px] font-medium text-[#1d1d1f]">{order.orderNumber}</p>
                    <p className="text-[12px] text-[#86868b]">{order.customer?.companyName || 'Unknown'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[14px] font-medium text-[#1d1d1f]">
                      <CurrencyDisplay amount={Number(order.totalAmount)} />
                    </p>
                    <p className={`text-[11px] font-medium px-2 py-0.5 rounded inline-block ${
                      order.status === 'PENDING' ? 'bg-[#ff9500]/10 text-[#ff9500]' :
                      order.status === 'CONFIRMED' ? 'bg-[#0071e3]/10 text-[#0071e3]' :
                      order.status === 'SHIPPED' ? 'bg-[#34c759]/10 text-[#34c759]' :
                      order.status === 'DELIVERED' ? 'bg-[#34c759]/10 text-[#34c759]' :
                      'bg-[#86868b]/10 text-[#86868b]'
                    }`}>
                      {order.status}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-6">
          <h2 className="text-[15px] font-semibold text-[#1d1d1f] mb-4">Quick Actions</h2>
          <div className="space-y-3">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-center gap-3 p-3 rounded-xl border border-[#d2d2d7]/30 hover:border-[#0071e3] hover:bg-[#0071e3]/5 transition-all group"
                >
                  <div className="w-9 h-9 bg-[#f5f5f7] rounded-lg flex items-center justify-center group-hover:bg-[#0071e3]/10 transition-colors">
                    <Icon className="w-4 h-4 text-[#1d1d1f]" />
                  </div>
                  <span className="text-[14px] font-medium text-[#1d1d1f]">{action.label}</span>
                  <Plus className="w-4 h-4 text-[#86868b] ml-auto group-hover:text-[#0071e3] transition-colors" />
                </Link>
              )
            })}
          </div>

          {/* Import CTA */}
          <div className="mt-6 pt-6 border-t border-[#d2d2d7]/30">
            <Link
              href="/import"
              className="block p-4 rounded-xl bg-gradient-to-br from-[#f5f5f7] to-white border border-[#d2d2d7]/30 hover:border-[#0071e3]/40 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#0071e3]/10 rounded-xl flex items-center justify-center group-hover:bg-[#0071e3]/20 transition-colors">
                  <Package className="w-5 h-5 text-[#0071e3]" />
                </div>
                <div>
                  <p className="text-[14px] font-medium text-[#1d1d1f]">Import Products</p>
                  <p className="text-[12px] text-[#86868b]">From Excel or CSV</p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
