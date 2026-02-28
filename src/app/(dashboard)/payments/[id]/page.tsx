'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, DollarSign, AlertTriangle, CheckCircle, Clock,
  Plus, Loader2, TrendingUp, CreditCard, Building, Calendar
} from 'lucide-react'

interface PaymentRecord {
  id: string
  type: string
  amount: number
  currency: string
  reference: string | null
  method: string | null
  notes: string | null
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

const statusConfig = {
  PENDING: { bg: 'bg-[#ff9500]/10', text: 'text-[#ff9500]', icon: Clock, label: 'Pending' },
  PARTIAL: { bg: 'bg-[#0071e3]/10', text: 'text-[#0071e3]', icon: TrendingUp, label: 'Partial' },
  PAID: { bg: 'bg-[#34c759]/10', text: 'text-[#34c759]', icon: CheckCircle, label: 'Paid' },
  OVERDUE: { bg: 'bg-[#ff3b30]/10', text: 'text-[#ff3b30]', icon: AlertTriangle, label: 'Overdue' }
}

export default function PaymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)
  
  const [payment, setPayment] = useState<OrderPayment | null>(null)
  const [loading, setLoading] = useState(true)
  const [showRecordForm, setShowRecordForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Record form
  const [recordType, setRecordType] = useState<'DEPOSIT' | 'BALANCE' | 'OTHER'>('DEPOSIT')
  const [recordAmount, setRecordAmount] = useState('')
  const [recordReference, setRecordReference] = useState('')
  const [recordMethod, setRecordMethod] = useState('wire')
  const [recordNotes, setRecordNotes] = useState('')
  const [recordDate, setRecordDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    fetchPayment()
  }, [id])

  const fetchPayment = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/payments/${id}`)
      if (res.ok) {
        const data = await res.json()
        setPayment(data.payment)
      } else {
        setError('Payment not found')
      }
    } catch {
      setError('Failed to fetch payment')
    } finally {
      setLoading(false)
    }
  }

  const handleRecordPayment = async () => {
    if (!recordAmount || parseFloat(recordAmount) <= 0) {
      setError('Please enter a valid amount')
      return
    }

    setSaving(true)
    setError(null)
    
    try {
      const res = await fetch(`/api/payments/${id}/record`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: recordType,
          amount: parseFloat(recordAmount),
          reference: recordReference || null,
          method: recordMethod,
          notes: recordNotes || null,
          paidAt: new Date(recordDate).toISOString()
        })
      })

      if (res.ok) {
        setShowRecordForm(false)
        setRecordAmount('')
        setRecordReference('')
        setRecordNotes('')
        await fetchPayment()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to record payment')
      }
    } catch {
      setError('Failed to record payment')
    } finally {
      setSaving(false)
    }
  }

  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-[#0071e3] animate-spin" />
      </div>
    )
  }

  if (!payment) {
    return (
      <div className="text-center py-20">
        <AlertTriangle className="w-12 h-12 text-[#ff3b30] mx-auto mb-4" />
        <p className="text-[17px] font-semibold text-[#1d1d1f]">{error || 'Payment not found'}</p>
        <Link href="/payments" className="text-[#0071e3] text-[14px] mt-2 inline-block">
          ← Back to payments
        </Link>
      </div>
    )
  }

  const status = statusConfig[payment.status]
  const StatusIcon = status.icon
  const totalPaid = Number(payment.depositPaid) + Number(payment.balancePaid)
  const totalAmount = Number(payment.totalAmount)
  const percentPaid = totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0

  const depositRemaining = Number(payment.depositRequired || 0) - Number(payment.depositPaid)
  const balanceRemaining = Number(payment.balanceRequired || 0) - Number(payment.balancePaid)

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/payments"
          className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-[#f5f5f7] transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-[#1d1d1f]" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-[24px] font-semibold text-[#1d1d1f]">
              Order #{payment.order.orderNumber}
            </h1>
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[13px] font-medium ${status.bg} ${status.text}`}>
              <StatusIcon className="w-4 h-4" />
              {status.label}
            </span>
          </div>
          <p className="text-[14px] text-[#86868b] mt-1">
            {payment.order.customer.companyName}
          </p>
        </div>
        {payment.status !== 'PAID' && (
          <button
            onClick={() => setShowRecordForm(true)}
            className="h-10 px-4 flex items-center gap-2 bg-[#34c759] text-white text-[13px] font-medium rounded-xl hover:bg-[#2db350] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Record Payment
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-[#ff3b30]/10 border border-[#ff3b30]/20 rounded-xl text-[14px] text-[#ff3b30]">
          {error}
        </div>
      )}

      {/* Summary */}
      <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-6 mb-6">
        <h2 className="text-[15px] font-semibold text-[#1d1d1f] mb-4">Payment Summary</h2>
        
        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-[14px] mb-2">
            <span className="text-[#86868b]">
              {formatCurrency(totalPaid, payment.currency)} paid
            </span>
            <span className="text-[#1d1d1f] font-semibold">
              {formatCurrency(totalAmount, payment.currency)} total
            </span>
          </div>
          <div className="h-3 bg-[#f5f5f7] rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all ${
                payment.status === 'PAID' ? 'bg-[#34c759]' :
                payment.status === 'OVERDUE' ? 'bg-[#ff3b30]' :
                'bg-[#0071e3]'
              }`}
              style={{ width: `${Math.min(percentPaid, 100)}%` }}
            />
          </div>
          <p className="text-[13px] text-[#86868b] mt-2">
            {percentPaid.toFixed(0)}% complete
          </p>
        </div>

        {/* Breakdown */}
        <div className="grid grid-cols-2 gap-4">
          {/* Deposit */}
          <div className="p-4 bg-[#f5f5f7] rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] font-medium text-[#1d1d1f]">Deposit</span>
              {payment.depositDueDate && (
                <span className={`text-[12px] flex items-center gap-1 ${
                  new Date(payment.depositDueDate) < new Date() && depositRemaining > 0
                    ? 'text-[#ff3b30]' 
                    : 'text-[#86868b]'
                }`}>
                  <Calendar className="w-3 h-3" />
                  {new Date(payment.depositDueDate).toLocaleDateString()}
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-[20px] font-semibold text-[#1d1d1f]">
                {formatCurrency(Number(payment.depositPaid), payment.currency)}
              </span>
              <span className="text-[14px] text-[#86868b]">
                / {formatCurrency(Number(payment.depositRequired || 0), payment.currency)}
              </span>
            </div>
            {depositRemaining > 0 && (
              <p className="text-[12px] text-[#ff9500] mt-1">
                {formatCurrency(depositRemaining, payment.currency)} remaining
              </p>
            )}
          </div>

          {/* Balance */}
          <div className="p-4 bg-[#f5f5f7] rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] font-medium text-[#1d1d1f]">Balance</span>
              {payment.balanceDueDate && (
                <span className={`text-[12px] flex items-center gap-1 ${
                  new Date(payment.balanceDueDate) < new Date() && balanceRemaining > 0
                    ? 'text-[#ff3b30]' 
                    : 'text-[#86868b]'
                }`}>
                  <Calendar className="w-3 h-3" />
                  {new Date(payment.balanceDueDate).toLocaleDateString()}
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-[20px] font-semibold text-[#1d1d1f]">
                {formatCurrency(Number(payment.balancePaid), payment.currency)}
              </span>
              <span className="text-[14px] text-[#86868b]">
                / {formatCurrency(Number(payment.balanceRequired || 0), payment.currency)}
              </span>
            </div>
            {balanceRemaining > 0 && (
              <p className="text-[12px] text-[#ff9500] mt-1">
                {formatCurrency(balanceRemaining, payment.currency)} remaining
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-6">
        <h2 className="text-[15px] font-semibold text-[#1d1d1f] mb-4">Payment History</h2>
        
        {payment.payments.length === 0 ? (
          <div className="text-center py-8">
            <DollarSign className="w-10 h-10 text-[#86868b] mx-auto mb-3" />
            <p className="text-[14px] text-[#86868b]">No payments recorded yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {payment.payments.map(record => (
              <div key={record.id} className="flex items-center gap-4 p-4 bg-[#f5f5f7] rounded-xl">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  record.type === 'DEPOSIT' ? 'bg-[#0071e3]/10' :
                  record.type === 'BALANCE' ? 'bg-[#34c759]/10' :
                  'bg-[#86868b]/10'
                }`}>
                  {record.method === 'wire' ? (
                    <Building className={`w-5 h-5 ${
                      record.type === 'DEPOSIT' ? 'text-[#0071e3]' :
                      record.type === 'BALANCE' ? 'text-[#34c759]' :
                      'text-[#86868b]'
                    }`} />
                  ) : (
                    <CreditCard className={`w-5 h-5 ${
                      record.type === 'DEPOSIT' ? 'text-[#0071e3]' :
                      record.type === 'BALANCE' ? 'text-[#34c759]' :
                      'text-[#86868b]'
                    }`} />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-medium text-[#1d1d1f]">
                      {record.type === 'DEPOSIT' ? 'Deposit Payment' :
                       record.type === 'BALANCE' ? 'Balance Payment' :
                       'Other Payment'}
                    </span>
                    {record.reference && (
                      <span className="text-[12px] text-[#86868b]">
                        Ref: {record.reference}
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] text-[#86868b]">
                    {new Date(record.paidAt).toLocaleDateString()} • {record.method || 'Unknown method'}
                  </p>
                  {record.notes && (
                    <p className="text-[12px] text-[#86868b] mt-1">{record.notes}</p>
                  )}
                </div>
                <p className="text-[17px] font-semibold text-[#34c759]">
                  +{formatCurrency(Number(record.amount), record.currency)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      {showRecordForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 m-4">
            <h2 className="text-[17px] font-semibold text-[#1d1d1f] mb-6">Record Payment</h2>
            
            <div className="space-y-4">
              {/* Type */}
              <div>
                <label className="block text-[13px] font-medium text-[#86868b] mb-2">
                  Payment Type
                </label>
                <div className="flex gap-2">
                  {(['DEPOSIT', 'BALANCE', 'OTHER'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => setRecordType(type)}
                      className={`flex-1 h-10 text-[13px] font-medium rounded-xl transition-colors ${
                        recordType === type
                          ? 'bg-[#0071e3] text-white'
                          : 'bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed]'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-[13px] font-medium text-[#86868b] mb-2">
                  Amount ({payment.currency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={recordAmount}
                  onChange={(e) => setRecordAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full h-10 px-4 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                />
              </div>

              {/* Method */}
              <div>
                <label className="block text-[13px] font-medium text-[#86868b] mb-2">
                  Payment Method
                </label>
                <select
                  value={recordMethod}
                  onChange={(e) => setRecordMethod(e.target.value)}
                  className="w-full h-10 px-4 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                >
                  <option value="wire">Wire Transfer</option>
                  <option value="check">Check</option>
                  <option value="credit">Credit Card</option>
                  <option value="cash">Cash</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Reference */}
              <div>
                <label className="block text-[13px] font-medium text-[#86868b] mb-2">
                  Reference / Transaction ID
                </label>
                <input
                  type="text"
                  value={recordReference}
                  onChange={(e) => setRecordReference(e.target.value)}
                  placeholder="e.g., Bank reference number"
                  className="w-full h-10 px-4 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-[13px] font-medium text-[#86868b] mb-2">
                  Payment Date
                </label>
                <input
                  type="date"
                  value={recordDate}
                  onChange={(e) => setRecordDate(e.target.value)}
                  className="w-full h-10 px-4 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[13px] font-medium text-[#86868b] mb-2">
                  Notes (optional)
                </label>
                <textarea
                  value={recordNotes}
                  onChange={(e) => setRecordNotes(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3] resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowRecordForm(false)}
                className="flex-1 h-11 text-[14px] font-medium text-[#1d1d1f] bg-[#f5f5f7] rounded-xl hover:bg-[#e8e8ed] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordPayment}
                disabled={saving || !recordAmount}
                className="flex-1 h-11 flex items-center justify-center gap-2 text-[14px] font-medium text-white bg-[#34c759] rounded-xl hover:bg-[#2db350] transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Record Payment
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
