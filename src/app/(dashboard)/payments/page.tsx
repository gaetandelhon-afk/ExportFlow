'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  DollarSign, AlertTriangle, CheckCircle, Clock, Search, Filter,
  ChevronRight, Loader2, RefreshCcw, TrendingUp, AlertCircle, PiggyBank, Download, Users
} from 'lucide-react'
import { ExportModal, paymentExportColumns } from '@/components/ExportModal'
import { FeatureGate } from '@/components/FeatureGate'

interface PaymentRecord {
  id: string
  type: string
  amount: number
  currency: string
  reference: string | null
  method: string | null
  paidAt: string
}

interface OrderPayment {
  id: string
  status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE'
  totalAmount: number
  depositRequired: number | null
  depositPaid: number
  depositDueDate: string | null
  balanceRequired: number | null
  balancePaid: number
  balanceDueDate: string | null
  currency: string
  createdAt: string
  order: {
    id: string
    orderNumber: string
    status: string
    customer: {
      id: string
      companyName: string
      contactName: string | null
      email: string
    }
  }
  payments: PaymentRecord[]
}

interface Stats {
  totalOutstanding: number
  overdueCount: number
  overdueAmount: number
  paidThisMonth: number
  pending: number
  partial: number
  paid: number
}

const statusConfig = {
  PENDING: { 
    bg: 'bg-[#ff9500]/10', 
    text: 'text-[#ff9500]', 
    icon: Clock,
    label: 'Pending' 
  },
  PARTIAL: { 
    bg: 'bg-[#0071e3]/10', 
    text: 'text-[#0071e3]', 
    icon: TrendingUp,
    label: 'Partial' 
  },
  PAID: { 
    bg: 'bg-[#34c759]/10', 
    text: 'text-[#34c759]', 
    icon: CheckCircle,
    label: 'Paid' 
  },
  OVERDUE: { 
    bg: 'bg-[#ff3b30]/10', 
    text: 'text-[#ff3b30]', 
    icon: AlertCircle,
    label: 'Overdue' 
  }
}

interface CustomerFilter {
  id: string
  companyName: string
  categoryId?: string
}

interface CategoryFilter {
  id: string
  name: string
  parentId?: string
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<OrderPayment[]>([])
  const [stats, setStats] = useState<Stats>({
    totalOutstanding: 0,
    overdueCount: 0,
    overdueAmount: 0,
    paidThisMonth: 0,
    pending: 0,
    partial: 0,
    paid: 0
  })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showExportModal, setShowExportModal] = useState(false)
  const [customers, setCustomers] = useState<CustomerFilter[]>([])
  const [categories, setCategories] = useState<CategoryFilter[]>([])

  const fetchFiltersData = async () => {
    try {
      const [customersRes, categoriesRes] = await Promise.all([
        fetch('/api/customers/list'),
        fetch('/api/customer-categories')
      ])
      if (customersRes.ok) {
        const data = await customersRes.json()
        setCustomers((data.customers || []).map((c: { id: string; companyName: string; categoryId?: string }) => ({
          id: c.id,
          companyName: c.companyName,
          categoryId: c.categoryId
        })))
      }
      if (categoriesRes.ok) {
        const data = await categoriesRes.json()
        setCategories((data.categories || []).map((c: { id: string; name: string; parentId?: string }) => ({
          id: c.id,
          name: c.name,
          parentId: c.parentId
        })))
      }
    } catch {
      // Ignore
    }
  }

  const fetchPayments = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      
      const res = await fetch(`/api/payments?${params}`)
      if (res.ok) {
        const data = await res.json()
        setPayments(data.payments)
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to fetch payments:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPayments()
  }, [statusFilter])

  useEffect(() => {
    fetchFiltersData()
  }, [])

  const filteredPayments = payments.filter(payment => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (
      payment.order.orderNumber.toLowerCase().includes(term) ||
      payment.order.customer.companyName.toLowerCase().includes(term)
    )
  })

  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency
    }).format(amount)
  }

  return (
    <FeatureGate feature="tt_payment_tracking" featureLabel="le suivi des paiements T/T">
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">
            Payments
          </h1>
          <p className="text-[15px] text-[#86868b] mt-1">
            Track deposits and balance payments for orders
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/payments/balances"
            className="inline-flex items-center gap-2 bg-[#0071e3] hover:bg-[#0077ed] text-white text-[13px] font-medium px-4 h-10 rounded-xl transition-colors"
          >
            <Users className="w-4 h-4" />
            Customer Balances
          </Link>
          <button
            onClick={() => setShowExportModal(true)}
            className="inline-flex items-center gap-2 bg-[#34c759] hover:bg-[#2db350] text-white text-[13px] font-medium px-4 h-10 rounded-xl transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={fetchPayments}
            className="h-10 px-4 flex items-center gap-2 bg-[#f5f5f7] text-[#1d1d1f] text-[13px] font-medium rounded-xl hover:bg-[#e8e8ed] transition-colors"
          >
            <RefreshCcw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-5">
          <div className="flex items-center justify-between">
            <p className="text-[13px] text-[#86868b]">Outstanding</p>
            <div className="w-8 h-8 bg-[#0071e3]/10 rounded-lg flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-[#0071e3]" />
            </div>
          </div>
          <p className="text-[24px] font-semibold text-[#1d1d1f] mt-2">
            {formatCurrency(stats.totalOutstanding)}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-[#ff3b30]/30 p-5">
          <div className="flex items-center justify-between">
            <p className="text-[13px] text-[#ff3b30]">Overdue</p>
            <div className="w-8 h-8 bg-[#ff3b30]/10 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-[#ff3b30]" />
            </div>
          </div>
          <p className="text-[24px] font-semibold text-[#ff3b30] mt-2">
            {formatCurrency(stats.overdueAmount)}
          </p>
          <p className="text-[12px] text-[#ff3b30]">{stats.overdueCount} orders</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#34c759]/30 p-5">
          <div className="flex items-center justify-between">
            <p className="text-[13px] text-[#34c759]">Paid This Month</p>
            <div className="w-8 h-8 bg-[#34c759]/10 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-[#34c759]" />
            </div>
          </div>
          <p className="text-[24px] font-semibold text-[#34c759] mt-2">
            {formatCurrency(stats.paidThisMonth)}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-5">
          <div className="flex items-center justify-between">
            <p className="text-[13px] text-[#86868b]">By Status</p>
            <div className="w-8 h-8 bg-[#f5f5f7] rounded-lg flex items-center justify-center">
              <PiggyBank className="w-4 h-4 text-[#86868b]" />
            </div>
          </div>
          <div className="flex items-center gap-4 mt-2">
            <div>
              <p className="text-[18px] font-semibold text-[#ff9500]">{stats.pending}</p>
              <p className="text-[11px] text-[#86868b]">Pending</p>
            </div>
            <div>
              <p className="text-[18px] font-semibold text-[#0071e3]">{stats.partial}</p>
              <p className="text-[11px] text-[#86868b]">Partial</p>
            </div>
            <div>
              <p className="text-[18px] font-semibold text-[#34c759]">{stats.paid}</p>
              <p className="text-[11px] text-[#86868b]">Paid</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" />
            <input
              type="text"
              placeholder="Search by order or customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 pl-10 pr-4 bg-[#f5f5f7] rounded-xl text-[14px] text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#86868b]" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 px-3 bg-[#f5f5f7] rounded-xl text-[14px] text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-[#0071e3] animate-spin" />
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="text-center py-20">
            <DollarSign className="w-12 h-12 text-[#86868b] mx-auto mb-4" />
            <p className="text-[17px] font-semibold text-[#1d1d1f] mb-1">No payments found</p>
            <p className="text-[14px] text-[#86868b]">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your filters'
                : 'Payment tracking will appear here when created for orders'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#d2d2d7]/30">
            {filteredPayments.map(payment => {
              const status = statusConfig[payment.status]
              const StatusIcon = status.icon
              const totalPaid = Number(payment.depositPaid) + Number(payment.balancePaid)
              const totalAmount = Number(payment.totalAmount)
              const percentPaid = totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0
              
              return (
                <Link
                  key={payment.id}
                  href={`/payments/${payment.id}`}
                  className="block p-5 hover:bg-[#f5f5f7]/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {/* Order Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[12px] font-medium ${status.bg} ${status.text}`}>
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </span>
                        <span className="text-[14px] font-medium text-[#1d1d1f]">
                          Order #{payment.order.orderNumber}
                        </span>
                      </div>
                      <p className="text-[14px] text-[#86868b]">
                        {payment.order.customer.companyName}
                      </p>
                    </div>

                    {/* Progress */}
                    <div className="w-48">
                      <div className="flex items-center justify-between text-[12px] mb-1">
                        <span className="text-[#86868b]">
                          {formatCurrency(totalPaid, payment.currency)}
                        </span>
                        <span className="text-[#1d1d1f] font-medium">
                          {formatCurrency(totalAmount, payment.currency)}
                        </span>
                      </div>
                      <div className="h-2 bg-[#f5f5f7] rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            payment.status === 'PAID' ? 'bg-[#34c759]' :
                            payment.status === 'OVERDUE' ? 'bg-[#ff3b30]' :
                            'bg-[#0071e3]'
                          }`}
                          style={{ width: `${Math.min(percentPaid, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Due Dates */}
                    <div className="text-right text-[13px] w-32">
                      {payment.depositDueDate && Number(payment.depositPaid) < Number(payment.depositRequired || 0) && (
                        <p className={new Date(payment.depositDueDate) < new Date() ? 'text-[#ff3b30]' : 'text-[#86868b]'}>
                          Deposit: {new Date(payment.depositDueDate).toLocaleDateString()}
                        </p>
                      )}
                      {payment.balanceDueDate && Number(payment.balancePaid) < Number(payment.balanceRequired || 0) && (
                        <p className={new Date(payment.balanceDueDate) < new Date() ? 'text-[#ff3b30]' : 'text-[#86868b]'}>
                          Balance: {new Date(payment.balanceDueDate).toLocaleDateString()}
                        </p>
                      )}
                      {payment.status === 'PAID' && (
                        <p className="text-[#34c759]">Fully Paid</p>
                      )}
                    </div>

                    <ChevronRight className="w-5 h-5 text-[#86868b] flex-shrink-0" />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Payments"
        entityType="payments"
        data={filteredPayments.map(p => ({
          ...p,
          orderNumber: p.order.orderNumber,
          customer: p.order.customer,
          depositRequired: Number(p.depositRequired || 0),
          depositPaid: Number(p.depositPaid),
          balanceRequired: Number(p.balanceRequired || 0),
          balancePaid: Number(p.balancePaid),
          totalAmount: Number(p.totalAmount)
        }))}
        availableColumns={paymentExportColumns}
        showCustomerFilter={true}
        customers={customers}
        categories={categories}
      />
    </div>
    </FeatureGate>
  )
}
