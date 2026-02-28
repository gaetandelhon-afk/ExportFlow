'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { 
  ChevronLeft, Plus, Loader2, FileText, CreditCard,
  TrendingUp, TrendingDown, Settings, Trash2,
  MoreHorizontal, Edit2, AlertCircle, AlertTriangle,
  Mail, BellOff, Bell
} from 'lucide-react'
import { formatNumber } from '@/lib/utils'
import Portal from '@/components/Portal'

interface LedgerEntry {
  id: string
  type: 'OPENING_BALANCE' | 'INVOICE' | 'PAYMENT' | 'CREDIT_NOTE' | 'ADJUSTMENT'
  date: string
  description: string
  reference: string | null
  amount: number
  currency: string
  runningBalance: number
  notes: string | null
  invoiceId: string | null
}

interface CustomerDetails {
  id: string
  companyName: string
  contactName: string | null
  email: string
  country: string | null
  currency: string
  alertsMuted?: boolean
  hasOverdue?: boolean
  overdueCount?: number
  overdueAmount?: number
  daysPastDue?: number
}

const entryTypeConfig = {
  OPENING_BALANCE: { 
    icon: Settings, 
    bg: 'bg-[#86868b]/10', 
    text: 'text-[#86868b]',
    label: 'Opening Balance'
  },
  INVOICE: { 
    icon: FileText, 
    bg: 'bg-[#ff3b30]/10', 
    text: 'text-[#ff3b30]',
    label: 'Invoice'
  },
  PAYMENT: { 
    icon: CreditCard, 
    bg: 'bg-[#34c759]/10', 
    text: 'text-[#34c759]',
    label: 'Payment'
  },
  CREDIT_NOTE: { 
    icon: TrendingDown, 
    bg: 'bg-[#0071e3]/10', 
    text: 'text-[#0071e3]',
    label: 'Credit Note'
  },
  ADJUSTMENT: { 
    icon: Settings, 
    bg: 'bg-[#ff9500]/10', 
    text: 'text-[#ff9500]',
    label: 'Adjustment'
  },
}

export default function CustomerLedgerPage({ params }: { params: Promise<{ customerId: string }> }) {
  const resolvedParams = use(params)
  const [customer, setCustomer] = useState<CustomerDetails | null>(null)
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)

  // Form state
  const [entryType, setEntryType] = useState<'INVOICE' | 'PAYMENT' | 'CREDIT_NOTE' | 'OPENING_BALANCE' | 'ADJUSTMENT'>('PAYMENT')
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0])
  const [entryDescription, setEntryDescription] = useState('')
  const [entryReference, setEntryReference] = useState('')
  const [entryAmount, setEntryAmount] = useState('')
  const [entryNotes, setEntryNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [sendingReminder, setSendingReminder] = useState(false)
  const [togglingAlerts, setTogglingAlerts] = useState(false)

  useEffect(() => {
    loadData()
  }, [resolvedParams.customerId])

  async function loadData() {
    try {
      const res = await fetch(`/api/payments/balances/${resolvedParams.customerId}`)
      if (res.ok) {
        const data = await res.json()
        setCustomer(data.customer)
        setEntries(data.entries || [])
      }
    } catch (error) {
      console.error('Failed to load ledger:', error)
    } finally {
      setLoading(false)
    }
  }

  const currentBalance = entries.length > 0 ? entries[0].runningBalance : 0
  const totalInvoiced = entries
    .filter(e => e.type === 'INVOICE' || (e.type === 'OPENING_BALANCE' && e.amount > 0))
    .reduce((sum, e) => sum + Math.abs(e.amount), 0)
  const totalPaid = entries
    .filter(e => e.type === 'PAYMENT' || e.type === 'CREDIT_NOTE')
    .reduce((sum, e) => sum + Math.abs(e.amount), 0)

  async function handleSendReminder() {
    if (!customer) return
    
    setSendingReminder(true)
    try {
      const res = await fetch(`/api/payments/balances/${resolvedParams.customerId}/reminder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      
      if (res.ok) {
        const data = await res.json()
        alert(data.message || 'Reminder sent successfully')
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to send reminder')
      }
    } catch (error) {
      console.error('Failed to send reminder:', error)
      alert('Failed to send reminder')
    } finally {
      setSendingReminder(false)
    }
  }

  async function handleToggleAlerts() {
    if (!customer) return
    
    setTogglingAlerts(true)
    try {
      const res = await fetch(`/api/payments/balances/${resolvedParams.customerId}/alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ muted: !customer.alertsMuted }),
      })
      
      if (res.ok) {
        setCustomer({ ...customer, alertsMuted: !customer.alertsMuted })
      }
    } catch (error) {
      console.error('Failed to toggle alerts:', error)
    } finally {
      setTogglingAlerts(false)
    }
  }

  async function handleAddEntry() {
    if (!entryDescription || !entryAmount) return

    setSaving(true)
    try {
      // For invoices and opening balance (positive), amount increases what customer owes
      // For payments and credit notes, amount decreases what customer owes (stored as negative)
      let finalAmount = parseFloat(entryAmount)
      if (entryType === 'PAYMENT' || entryType === 'CREDIT_NOTE') {
        finalAmount = -Math.abs(finalAmount)
      } else if (entryType === 'ADJUSTMENT') {
        // Adjustments can be positive or negative as entered
      } else {
        finalAmount = Math.abs(finalAmount)
      }

      const res = await fetch(`/api/payments/balances/${resolvedParams.customerId}/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: entryType,
          date: entryDate,
          description: entryDescription,
          reference: entryReference || null,
          amount: finalAmount,
          notes: entryNotes || null,
        }),
      })

      if (res.ok) {
        setShowAddModal(false)
        resetForm()
        loadData()
      }
    } catch (error) {
      console.error('Failed to add entry:', error)
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteEntry(id: string) {
    if (!confirm('Delete this entry? This will recalculate the running balance.')) return

    try {
      const res = await fetch(`/api/payments/balances/${resolvedParams.customerId}/entries/${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        loadData()
      }
    } catch (error) {
      console.error('Failed to delete entry:', error)
    }
  }

  function resetForm() {
    setEntryType('PAYMENT')
    setEntryDate(new Date().toISOString().split('T')[0])
    setEntryDescription('')
    setEntryReference('')
    setEntryAmount('')
    setEntryNotes('')
  }

  const currencySymbol = customer?.currency === 'EUR' ? '€' : customer?.currency === 'USD' ? '$' : '¥'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#86868b]" />
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-[#ff3b30] mx-auto mb-4" />
          <h2 className="text-lg font-medium text-[#1d1d1f]">Customer not found</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/payments/balances"
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#f5f5f7] hover:bg-[#e8e8ed] transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-[#1d1d1f]" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-[#1d1d1f]">{customer.companyName}</h1>
            {customer.hasOverdue && (
              <span className="flex items-center gap-1 text-[12px] font-medium text-[#ff3b30] bg-[#ff3b30]/10 px-2 py-1 rounded-lg">
                <AlertTriangle className="w-3.5 h-3.5" />
                {customer.daysPastDue}d overdue
              </span>
            )}
            {customer.alertsMuted && (
              <span className="flex items-center gap-1 text-[12px] font-medium text-[#86868b] bg-[#86868b]/10 px-2 py-1 rounded-lg">
                <BellOff className="w-3.5 h-3.5" />
                Alerts muted
              </span>
            )}
          </div>
          <p className="text-[#86868b]">{customer.email} {customer.country && `• ${customer.country}`}</p>
        </div>
        
        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {customer.overdueCount && customer.overdueCount > 0 && (
            <button
              onClick={handleSendReminder}
              disabled={sendingReminder}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#ff9500] text-white rounded-xl text-[14px] font-medium hover:bg-[#e68600] transition-colors disabled:opacity-50"
            >
              <Mail className="w-4 h-4" />
              {sendingReminder ? 'Sending...' : 'Send Reminder'}
            </button>
          )}
          
          <button
            onClick={handleToggleAlerts}
            disabled={togglingAlerts}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-[14px] font-medium transition-colors ${
              customer.alertsMuted
                ? 'bg-[#34c759] text-white hover:bg-[#2db350]'
                : 'bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed]'
            }`}
            title={customer.alertsMuted ? 'Enable alerts' : 'Mute alerts'}
          >
            {customer.alertsMuted ? (
              <>
                <Bell className="w-4 h-4" />
                Enable Alerts
              </>
            ) : (
              <>
                <BellOff className="w-4 h-4" />
                Mute Alerts
              </>
            )}
          </button>
          
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#0071e3] text-white rounded-xl text-[14px] font-medium hover:bg-[#0077ed] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Entry
          </button>
        </div>
      </div>

      {/* Balance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-5">
          <div className="text-[13px] text-[#86868b] mb-1">Current Balance</div>
          <div className={`text-2xl font-semibold ${
            currentBalance > 0 ? 'text-[#ff3b30]' : currentBalance < 0 ? 'text-[#34c759]' : 'text-[#86868b]'
          }`}>
            {currentBalance > 0 ? '+' : ''}{currencySymbol}{formatNumber(Math.abs(currentBalance))}
          </div>
          <div className="text-[12px] text-[#86868b] mt-1">
            {currentBalance > 0 ? 'Customer owes you' : currentBalance < 0 ? 'Credit balance' : 'Fully settled'}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-5">
          <div className="text-[13px] text-[#86868b] mb-1">Total Invoiced</div>
          <div className="text-2xl font-semibold text-[#1d1d1f]">
            {currencySymbol}{formatNumber(totalInvoiced)}
          </div>
          <div className="text-[12px] text-[#86868b] mt-1">
            All time
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-5">
          <div className="text-[13px] text-[#86868b] mb-1">Total Paid</div>
          <div className="text-2xl font-semibold text-[#34c759]">
            {currencySymbol}{formatNumber(totalPaid)}
          </div>
          <div className="text-[12px] text-[#86868b] mt-1">
            All time
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 overflow-hidden">
        <div className="p-4 border-b border-[#d2d2d7]/30">
          <h2 className="text-lg font-semibold text-[#1d1d1f]">Transaction History</h2>
        </div>

        {entries.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-[#f5f5f7] flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-[#86868b]" />
            </div>
            <h3 className="text-lg font-medium text-[#1d1d1f] mb-2">No transactions yet</h3>
            <p className="text-[#86868b] mb-4">
              Start by adding an opening balance or recording a transaction
            </p>
            <button
              onClick={() => {
                setEntryType('OPENING_BALANCE')
                setShowAddModal(true)
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#0071e3] text-white rounded-xl text-[14px] font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Opening Balance
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#d2d2d7]/30 bg-[#f5f5f7]">
                  <th className="text-left p-4 text-[13px] font-medium text-[#86868b]">Date</th>
                  <th className="text-left p-4 text-[13px] font-medium text-[#86868b]">Type</th>
                  <th className="text-left p-4 text-[13px] font-medium text-[#86868b]">Description</th>
                  <th className="text-left p-4 text-[13px] font-medium text-[#86868b]">Reference</th>
                  <th className="text-right p-4 text-[13px] font-medium text-[#86868b]">Debit (+)</th>
                  <th className="text-right p-4 text-[13px] font-medium text-[#86868b]">Credit (-)</th>
                  <th className="text-right p-4 text-[13px] font-medium text-[#86868b]">Balance</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const config = entryTypeConfig[entry.type]
                  const Icon = config.icon
                  const isDebit = entry.amount > 0
                  
                  return (
                    <tr key={entry.id} className="border-b border-[#d2d2d7]/30 hover:bg-[#f5f5f7]/50">
                      <td className="p-4 text-[14px] text-[#1d1d1f]">
                        {new Date(entry.date).toLocaleDateString('en-GB', { 
                          day: '2-digit', 
                          month: 'short', 
                          year: 'numeric' 
                        })}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-lg ${config.bg} flex items-center justify-center`}>
                            <Icon className={`w-3.5 h-3.5 ${config.text}`} />
                          </div>
                          <span className="text-[13px] text-[#86868b]">{config.label}</span>
                        </div>
                      </td>
                      <td className="p-4 text-[14px] text-[#1d1d1f]">
                        {entry.description}
                        {entry.notes && (
                          <div className="text-[12px] text-[#86868b] mt-0.5">{entry.notes}</div>
                        )}
                      </td>
                      <td className="p-4 text-[14px] text-[#86868b]">
                        {entry.reference || '-'}
                      </td>
                      <td className="p-4 text-right text-[14px] font-medium text-[#ff3b30]">
                        {isDebit ? `${currencySymbol}${formatNumber(entry.amount)}` : ''}
                      </td>
                      <td className="p-4 text-right text-[14px] font-medium text-[#34c759]">
                        {!isDebit ? `${currencySymbol}${formatNumber(Math.abs(entry.amount))}` : ''}
                      </td>
                      <td className="p-4 text-right text-[14px] font-semibold text-[#1d1d1f]">
                        {entry.runningBalance >= 0 ? '' : '-'}
                        {currencySymbol}{formatNumber(Math.abs(entry.runningBalance))}
                      </td>
                      <td className="p-4">
                        <div className="relative">
                          <button
                            onClick={() => setActiveMenu(activeMenu === entry.id ? null : entry.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f5f5f7]"
                          >
                            <MoreHorizontal className="w-4 h-4 text-[#86868b]" />
                          </button>
                          {activeMenu === entry.id && (
                            <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl shadow-lg border border-[#d2d2d7]/30 py-1 z-10">
                              <button
                                onClick={() => {
                                  handleDeleteEntry(entry.id)
                                  setActiveMenu(null)
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-[#ff3b30] hover:bg-[#f5f5f7]"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Entry Modal */}
      {showAddModal && (
        <Portal>
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md">
              <div className="p-6 border-b border-[#d2d2d7]/30">
                <h2 className="text-xl font-semibold text-[#1d1d1f]">Add Ledger Entry</h2>
                <p className="text-[#86868b] text-sm">Record a transaction for {customer.companyName}</p>
              </div>

              <div className="p-6 space-y-4">
                {/* Entry Type */}
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] mb-2">
                    Entry Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'PAYMENT', label: 'Payment Received', icon: CreditCard },
                      { value: 'INVOICE', label: 'Invoice (Manual)', icon: FileText },
                      { value: 'OPENING_BALANCE', label: 'Opening Balance', icon: Settings },
                      { value: 'ADJUSTMENT', label: 'Adjustment', icon: Edit2 },
                    ].map(type => {
                      const Icon = type.icon
                      return (
                        <button
                          key={type.value}
                          onClick={() => setEntryType(type.value as typeof entryType)}
                          className={`flex items-center gap-2 p-3 rounded-xl border transition-colors ${
                            entryType === type.value
                              ? 'border-[#0071e3] bg-[#0071e3]/5'
                              : 'border-[#d2d2d7]/30 hover:bg-[#f5f5f7]'
                          }`}
                        >
                          <Icon className={`w-4 h-4 ${entryType === type.value ? 'text-[#0071e3]' : 'text-[#86868b]'}`} />
                          <span className="text-[13px] font-medium text-[#1d1d1f]">{type.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="w-full h-10 px-4 bg-[#f5f5f7] border-0 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] mb-2">
                    Description *
                  </label>
                  <input
                    type="text"
                    value={entryDescription}
                    onChange={(e) => setEntryDescription(e.target.value)}
                    placeholder={
                      entryType === 'PAYMENT' ? 'e.g., Bank transfer - Order #123' :
                      entryType === 'INVOICE' ? 'e.g., Invoice INV-2025-001' :
                      entryType === 'OPENING_BALANCE' ? 'Opening balance from previous system' :
                      'e.g., Correction for...'
                    }
                    className="w-full h-10 px-4 bg-[#f5f5f7] border-0 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  />
                </div>

                {/* Reference */}
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] mb-2">
                    Reference (optional)
                  </label>
                  <input
                    type="text"
                    value={entryReference}
                    onChange={(e) => setEntryReference(e.target.value)}
                    placeholder="e.g., Invoice number, bank reference..."
                    className="w-full h-10 px-4 bg-[#f5f5f7] border-0 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  />
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] mb-2">
                    Amount ({currencySymbol}) *
                    {entryType === 'ADJUSTMENT' && (
                      <span className="font-normal text-[#86868b] ml-1">
                        (use negative for credit)
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={entryAmount}
                    onChange={(e) => setEntryAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full h-10 px-4 bg-[#f5f5f7] border-0 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] mb-2">
                    Notes (optional)
                  </label>
                  <textarea
                    value={entryNotes}
                    onChange={(e) => setEntryNotes(e.target.value)}
                    placeholder="Additional notes..."
                    rows={2}
                    className="w-full px-4 py-2 bg-[#f5f5f7] border-0 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3] resize-none"
                  />
                </div>
              </div>

              <div className="p-6 border-t border-[#d2d2d7]/30 flex gap-3">
                <button
                  onClick={() => {
                    setShowAddModal(false)
                    resetForm()
                  }}
                  className="flex-1 px-4 py-2.5 border border-[#d2d2d7] rounded-xl text-[14px] font-medium text-[#1d1d1f] hover:bg-[#f5f5f7]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddEntry}
                  disabled={!entryDescription || !entryAmount || saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0071e3] text-white rounded-xl text-[14px] font-medium hover:bg-[#0077ed] disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Add Entry'
                  )}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  )
}
