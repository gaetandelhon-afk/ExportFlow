'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Users, Search, ChevronRight, Loader2, 
  TrendingUp, TrendingDown, AlertTriangle, AlertCircle,
  Building2, BellOff, Bell
} from 'lucide-react'
import { formatNumber } from '@/lib/utils'

interface CustomerBalance {
  id: string
  companyName: string
  contactName: string | null
  email: string
  country: string | null
  balance: number
  currency: string
  lastActivityDate: string | null
  invoiceCount: number
  paymentCount: number
  hasOverdue: boolean
  overdueCount: number
  overdueAmount: number
  daysPastDue: number
  alertsMuted: boolean
}

export default function CustomerBalancesPage() {
  const [customers, setCustomers] = useState<CustomerBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [balanceFilter, setBalanceFilter] = useState<'all' | 'owing' | 'credit' | 'zero' | 'overdue'>('all')

  useEffect(() => {
    loadCustomerBalances()
  }, [])

  async function loadCustomerBalances() {
    try {
      const res = await fetch('/api/payments/balances')
      if (res.ok) {
        const data = await res.json()
        setCustomers(data.customers || [])
      }
    } catch (error) {
      console.error('Failed to load customer balances:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = 
      customer.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase())
    
    let matchesBalance = true
    if (balanceFilter === 'owing') matchesBalance = customer.balance > 0
    else if (balanceFilter === 'credit') matchesBalance = customer.balance < 0
    else if (balanceFilter === 'zero') matchesBalance = customer.balance === 0
    else if (balanceFilter === 'overdue') matchesBalance = customer.hasOverdue
    
    return matchesSearch && matchesBalance
  })

  const totalOwing = customers.filter(c => c.balance > 0).reduce((sum, c) => sum + c.balance, 0)
  const totalCredit = customers.filter(c => c.balance < 0).reduce((sum, c) => sum + Math.abs(c.balance), 0)
  const customersOwing = customers.filter(c => c.balance > 0).length
  const overdueCustomers = customers.filter(c => c.hasOverdue)
  const totalOverdue = overdueCustomers.reduce((sum, c) => sum + c.overdueAmount, 0)

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-[#1d1d1f]">Customer Balances</h1>
          <p className="text-[#86868b]">Track what each customer owes or has in credit</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[#ff3b30]/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-[#ff3b30]" />
            </div>
            <div>
              <div className="text-[13px] text-[#86868b]">Total Outstanding</div>
              <div className="text-xl font-semibold text-[#ff3b30]">
                €{formatNumber(totalOwing)}
              </div>
            </div>
          </div>
          <div className="text-[12px] text-[#86868b]">
            {customersOwing} customer{customersOwing !== 1 ? 's' : ''} with balance due
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[#34c759]/10 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-[#34c759]" />
            </div>
            <div>
              <div className="text-[13px] text-[#86868b]">Total Credit</div>
              <div className="text-xl font-semibold text-[#34c759]">
                €{formatNumber(totalCredit)}
              </div>
            </div>
          </div>
          <div className="text-[12px] text-[#86868b]">
            Customer overpayments / credits
          </div>
        </div>

        <div className={`bg-white rounded-2xl border p-5 ${overdueCustomers.length > 0 ? 'border-[#ff3b30]/50' : 'border-[#d2d2d7]/30'}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${overdueCustomers.length > 0 ? 'bg-[#ff3b30]/10' : 'bg-[#86868b]/10'}`}>
              <AlertTriangle className={`w-5 h-5 ${overdueCustomers.length > 0 ? 'text-[#ff3b30]' : 'text-[#86868b]'}`} />
            </div>
            <div>
              <div className="text-[13px] text-[#86868b]">Overdue</div>
              <div className={`text-xl font-semibold ${overdueCustomers.length > 0 ? 'text-[#ff3b30]' : 'text-[#86868b]'}`}>
                €{formatNumber(totalOverdue)}
              </div>
            </div>
          </div>
          <div className="text-[12px] text-[#86868b]">
            {overdueCustomers.length} customer{overdueCustomers.length !== 1 ? 's' : ''} past due date
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 bg-[#f5f5f7] border-0 rounded-xl text-[14px] text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
            />
          </div>

          {/* Balance Filter */}
          <div className="flex items-center gap-2">
            {[
              { value: 'all', label: 'All' },
              { value: 'overdue', label: 'Overdue', alert: overdueCustomers.length > 0 },
              { value: 'owing', label: 'Owing' },
              { value: 'credit', label: 'Credit' },
              { value: 'zero', label: 'Settled' },
            ].map(filter => (
              <button
                key={filter.value}
                onClick={() => setBalanceFilter(filter.value as typeof balanceFilter)}
                className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors flex items-center gap-1.5 ${
                  balanceFilter === filter.value
                    ? filter.value === 'overdue' && overdueCustomers.length > 0
                      ? 'bg-[#ff3b30] text-white'
                      : 'bg-[#0071e3] text-white'
                    : filter.value === 'overdue' && overdueCustomers.length > 0
                      ? 'bg-[#ff3b30]/10 text-[#ff3b30] hover:bg-[#ff3b30]/20'
                      : 'bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed]'
                }`}
              >
                {filter.value === 'overdue' && overdueCustomers.length > 0 && (
                  <AlertTriangle className="w-3.5 h-3.5" />
                )}
                {filter.label}
                {filter.value === 'overdue' && overdueCustomers.length > 0 && (
                  <span className={`text-[11px] ${balanceFilter === 'overdue' ? 'text-white/80' : ''}`}>
                    ({overdueCustomers.length})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Customer List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#86868b]" />
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-[#f5f5f7] flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-[#86868b]" />
          </div>
          <h3 className="text-lg font-medium text-[#1d1d1f] mb-2">No customers found</h3>
          <p className="text-[#86868b]">
            {searchQuery || balanceFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Customer balances will appear here when you add ledger entries'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 overflow-hidden">
          <div className="divide-y divide-[#d2d2d7]/30">
            {filteredCustomers.map(customer => (
              <Link
                key={customer.id}
                href={`/payments/balances/${customer.id}`}
                className={`flex items-center gap-4 p-4 hover:bg-[#f5f5f7] transition-colors ${customer.hasOverdue ? 'bg-[#ff3b30]/5' : ''}`}
              >
                <div className="relative">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${customer.hasOverdue ? 'bg-[#ff3b30]/10' : 'bg-[#f5f5f7]'}`}>
                    <Building2 className={`w-6 h-6 ${customer.hasOverdue ? 'text-[#ff3b30]' : 'text-[#86868b]'}`} />
                  </div>
                  {customer.hasOverdue && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#ff3b30] rounded-full flex items-center justify-center">
                      <AlertTriangle className="w-3 h-3 text-white" />
                    </div>
                  )}
                  {customer.alertsMuted && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#86868b] rounded-full flex items-center justify-center" title="Alerts muted">
                      <BellOff className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[#1d1d1f] truncate">
                      {customer.companyName}
                    </span>
                    {customer.hasOverdue && (
                      <span className="text-[11px] font-medium text-[#ff3b30] bg-[#ff3b30]/10 px-1.5 py-0.5 rounded">
                        {customer.daysPastDue}d overdue
                      </span>
                    )}
                  </div>
                  <div className="text-[13px] text-[#86868b] truncate">
                    {customer.contactName || customer.email}
                    {customer.country && ` • ${customer.country}`}
                  </div>
                </div>

                <div className="text-right">
                  <div className={`text-lg font-semibold ${
                    customer.balance > 0 
                      ? 'text-[#ff3b30]' 
                      : customer.balance < 0 
                        ? 'text-[#34c759]' 
                        : 'text-[#86868b]'
                  }`}>
                    {customer.balance > 0 ? '+' : ''}
                    {customer.currency === 'EUR' ? '€' : customer.currency === 'USD' ? '$' : '¥'}
                    {formatNumber(Math.abs(customer.balance))}
                  </div>
                  <div className="text-[12px] text-[#86868b]">
                    {customer.hasOverdue 
                      ? `${customer.overdueCount} invoice${customer.overdueCount > 1 ? 's' : ''} overdue`
                      : customer.balance > 0 ? 'owes' : customer.balance < 0 ? 'credit' : 'settled'}
                  </div>
                </div>

                <ChevronRight className="w-5 h-5 text-[#d2d2d7]" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
