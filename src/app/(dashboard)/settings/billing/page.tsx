'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { 
  ChevronLeft, CreditCard, Save, Loader2, CheckCircle, 
  Building2, Percent, Clock, DollarSign, Plus, Trash2, ChevronDown, ChevronUp
} from 'lucide-react'
import { useLocalization } from '@/hooks/useLocalization'

interface BankAccount {
  id: string
  bankName: string
  bankAddress: string
  bankCity: string
  bankCountry: string
  accountName: string
  accountNumber: string
  iban?: string  // Optional - not used in China
  bic?: string   // SWIFT code
  currency: string
  isDefault: boolean
}

interface PaymentTerm {
  id: string
  name: string
  days: number
  depositPercent: number
  description: string
}

interface LateFeeRule {
  id: string
  afterDays: number
  feeType: 'percentage' | 'fixed'
  feeAmount: number
  description: string
}

interface BillingSettings {
  // Bank Accounts (multiple)
  bankAccounts: BankAccount[]
  
  // Payment
  defaultCurrency: string
  defaultPaymentTermId: string  // Reference to a payment term
  
  // Late Fees
  lateFeeEnabled: boolean
  lateFeeRules: LateFeeRule[]
  
  // Payment Terms
  paymentTerms: PaymentTerm[]
  
  // Invoicing
  invoicePrefix: string
  nextInvoiceNumber: number
  invoiceNotes: string
}

const STORAGE_KEY = 'orderbridge_billing_settings'

const DEFAULT_PAYMENT_TERMS: PaymentTerm[] = [
  { id: 'term_1', name: 'Net 30', days: 30, depositPercent: 0, description: 'Payment due within 30 days' },
  { id: 'term_2', name: 'Net 60', days: 60, depositPercent: 0, description: 'Payment due within 60 days' },
  { id: 'term_3', name: '30/70 T/T', days: 30, depositPercent: 30, description: '30% deposit, 70% before shipment' },
  { id: 'term_4', name: '50/50 T/T', days: 0, depositPercent: 50, description: '50% deposit, 50% before shipment' },
]

const DEFAULT_LATE_FEE_RULES: LateFeeRule[] = [
  { id: 'fee_1', afterDays: 30, feeType: 'percentage', feeAmount: 2, description: '2% after 30 days' },
]

const DEFAULT_SETTINGS: BillingSettings = {
  bankAccounts: [],
  defaultCurrency: 'EUR',
  defaultPaymentTermId: 'term_1',
  lateFeeEnabled: false,
  lateFeeRules: DEFAULT_LATE_FEE_RULES,
  paymentTerms: DEFAULT_PAYMENT_TERMS,
  invoicePrefix: 'INV-',
  nextInvoiceNumber: 1001,
  invoiceNotes: ''
}


const countries = [
  'China', 'France', 'Germany', 'United Kingdom', 'United States', 
  'Hong Kong', 'Singapore', 'Japan', 'UAE', 'Switzerland'
]

export default function BillingSettingsPage() {
  const { settings: locSettings, isLoaded: locLoaded } = useLocalization()
  const [settings, setSettings] = useState<BillingSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null)

  // Get currencies from localization settings
  const currencies = useMemo(() => {
    if (!locSettings?.currencies) return []
    return locSettings.currencies.map(c => ({
      code: c.code,
      symbol: c.symbol,
      name: c.name
    }))
  }, [locSettings])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) })
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
    setLoading(false)
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      console.error('Failed to save:', error)
    } finally {
      setSaving(false)
    }
  }

  // Bank Account functions
  const addBankAccount = () => {
    const newAccount: BankAccount = {
      id: `bank_${Date.now()}`,
      bankName: '',
      bankAddress: '',
      bankCity: '',
      bankCountry: 'China',
      accountName: '',
      accountNumber: '',
      iban: '',
      bic: '',
      currency: 'CNY',
      isDefault: settings.bankAccounts.length === 0
    }
    setSettings(prev => ({ ...prev, bankAccounts: [...prev.bankAccounts, newAccount] }))
    setExpandedAccount(newAccount.id)
  }

  const updateBankAccount = (id: string, field: keyof BankAccount, value: string | boolean) => {
    setSettings(prev => ({
      ...prev,
      bankAccounts: prev.bankAccounts.map(acc => {
        if (acc.id === id) {
          // If setting as default, unset others
          if (field === 'isDefault' && value === true) {
            return { ...acc, isDefault: true }
          }
          return { ...acc, [field]: value }
        }
        // Unset other defaults when a new default is set
        if (field === 'isDefault' && value === true) {
          return { ...acc, isDefault: false }
        }
        return acc
      })
    }))
  }

  const removeBankAccount = (id: string) => {
    if (!confirm('Delete this bank account?')) return
    setSettings(prev => ({
      ...prev,
      bankAccounts: prev.bankAccounts.filter(acc => acc.id !== id)
    }))
  }

  // Payment Terms functions
  const addPaymentTerm = () => {
    const newTerm: PaymentTerm = {
      id: `term_${Date.now()}`,
      name: 'New Term',
      days: 30,
      depositPercent: 0,
      description: ''
    }
    setSettings(prev => ({ ...prev, paymentTerms: [...prev.paymentTerms, newTerm] }))
  }

  const updatePaymentTerm = (id: string, field: keyof PaymentTerm, value: string | number) => {
    setSettings(prev => ({
      ...prev,
      paymentTerms: prev.paymentTerms.map(t => t.id === id ? { ...t, [field]: value } : t)
    }))
  }

  const removePaymentTerm = (id: string) => {
    setSettings(prev => ({
      ...prev,
      paymentTerms: prev.paymentTerms.filter(t => t.id !== id)
    }))
  }

  // Late Fee functions
  const addLateFeeRule = () => {
    const newRule: LateFeeRule = {
      id: `fee_${Date.now()}`,
      afterDays: 30,
      feeType: 'percentage',
      feeAmount: 2,
      description: ''
    }
    setSettings(prev => ({
      ...prev,
      lateFeeRules: [...prev.lateFeeRules, newRule]
    }))
  }

  const updateLateFeeRule = (id: string, field: keyof LateFeeRule, value: string | number) => {
    setSettings(prev => ({
      ...prev,
      lateFeeRules: prev.lateFeeRules.map(r => r.id === id ? { ...r, [field]: value } : r)
    }))
  }

  const removeLateFeeRule = (id: string) => {
    setSettings(prev => ({
      ...prev,
      lateFeeRules: prev.lateFeeRules.filter(r => r.id !== id)
    }))
  }

  if (loading || !locLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0071e3]"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Link href="/settings" className="text-[#0071e3] hover:text-[#0077ed] flex items-center gap-1 text-[13px] mb-4">
        <ChevronLeft className="w-4 h-4" />
        Back to Settings
      </Link>
      
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#ff2d55]/10 rounded-xl flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-[#ff2d55]" />
          </div>
          <div>
            <h1 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">Billing & Payments</h1>
            <p className="text-[15px] text-[#86868b] mt-1">
              Bank accounts, payment terms, and invoicing
            </p>
          </div>
        </div>
        
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#0071e3] text-white rounded-xl text-[14px] font-medium hover:bg-[#0077ED] transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      <div className="space-y-6">
        {/* Bank Accounts */}
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Building2 className="w-5 h-5 text-[#0071e3]" />
              <h2 className="text-[17px] font-semibold text-[#1d1d1f]">Bank Accounts</h2>
            </div>
            <button
              onClick={addBankAccount}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#0071e3] text-white rounded-lg text-[13px] font-medium hover:bg-[#0077ED] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Account
            </button>
          </div>
          
          {settings.bankAccounts.length === 0 ? (
            <div className="text-center py-8 bg-[#f5f5f7] rounded-xl">
              <Building2 className="w-10 h-10 text-[#86868b] mx-auto mb-3" />
              <p className="text-[14px] text-[#86868b]">No bank accounts configured</p>
              <p className="text-[12px] text-[#86868b]">Add your first bank account for invoicing</p>
            </div>
          ) : (
            <div className="space-y-3">
              {settings.bankAccounts.map((account, index) => (
                <div key={account.id} className="border border-[#d2d2d7]/30 rounded-xl overflow-hidden">
                  {/* Account Header */}
                  <div 
                    className={`flex items-center justify-between p-4 cursor-pointer hover:bg-[#f5f5f7]/50 transition-colors ${
                      account.isDefault ? 'bg-[#0071e3]/5' : ''
                    }`}
                    onClick={() => setExpandedAccount(expandedAccount === account.id ? null : account.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#0071e3]/10 rounded-lg flex items-center justify-center">
                        <span className="text-[14px] font-bold text-[#0071e3]">{index + 1}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-[14px] font-medium text-[#1d1d1f]">
                            {account.bankName || 'New Bank Account'}
                          </p>
                          {account.isDefault && (
                            <span className="px-2 py-0.5 bg-[#34c759]/10 text-[#34c759] text-[11px] font-medium rounded-full">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] text-[#86868b]">
                          {account.currency} • {account.accountNumber ? `****${account.accountNumber.slice(-4)}` : 'No account number'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); removeBankAccount(account.id) }}
                        className="p-2 text-[#ff3b30] hover:bg-[#ff3b30]/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {expandedAccount === account.id ? (
                        <ChevronUp className="w-5 h-5 text-[#86868b]" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-[#86868b]" />
                      )}
                    </div>
                  </div>
                  
                  {/* Account Details */}
                  {expandedAccount === account.id && (
                    <div className="p-4 pt-0 border-t border-[#d2d2d7]/30 bg-[#f5f5f7]/30">
                      <div className="grid grid-cols-2 gap-4 pt-4">
                        {/* Bank Info */}
                        <div className="col-span-2">
                          <p className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wider mb-3">Bank Information</p>
                        </div>
                        <div>
                          <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Bank Name *</label>
                          <input
                            type="text"
                            value={account.bankName}
                            onChange={(e) => updateBankAccount(account.id, 'bankName', e.target.value)}
                            placeholder="Bank of China"
                            className="w-full h-10 px-3 bg-white border border-[#d2d2d7]/50 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                          />
                        </div>
                        <div>
                          <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Bank Country</label>
                          <select
                            value={account.bankCountry}
                            onChange={(e) => updateBankAccount(account.id, 'bankCountry', e.target.value)}
                            className="w-full h-10 px-3 bg-white border border-[#d2d2d7]/50 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                          >
                            {countries.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Bank Address</label>
                          <input
                            type="text"
                            value={account.bankAddress}
                            onChange={(e) => updateBankAccount(account.id, 'bankAddress', e.target.value)}
                            placeholder="123 Finance Street, Pudong District"
                            className="w-full h-10 px-3 bg-white border border-[#d2d2d7]/50 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                          />
                        </div>
                        <div>
                          <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">City</label>
                          <input
                            type="text"
                            value={account.bankCity}
                            onChange={(e) => updateBankAccount(account.id, 'bankCity', e.target.value)}
                            placeholder="Shanghai"
                            className="w-full h-10 px-3 bg-white border border-[#d2d2d7]/50 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                          />
                        </div>
                        <div>
                          <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">SWIFT / BIC Code</label>
                          <input
                            type="text"
                            value={account.bic || ''}
                            onChange={(e) => updateBankAccount(account.id, 'bic', e.target.value)}
                            placeholder="BKCHCNBJ"
                            className="w-full h-10 px-3 bg-white border border-[#d2d2d7]/50 rounded-lg text-[14px] font-mono focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                          />
                        </div>

                        {/* Account Info */}
                        <div className="col-span-2 mt-4">
                          <p className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wider mb-3">Account Information</p>
                        </div>
                        <div>
                          <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Account Name *</label>
                          <input
                            type="text"
                            value={account.accountName}
                            onChange={(e) => updateBankAccount(account.id, 'accountName', e.target.value)}
                            placeholder="Your Company Name"
                            className="w-full h-10 px-3 bg-white border border-[#d2d2d7]/50 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                          />
                        </div>
                        <div>
                          <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Currency *</label>
                          <select
                            value={account.currency}
                            onChange={(e) => updateBankAccount(account.id, 'currency', e.target.value)}
                            className="w-full h-10 px-3 bg-white border border-[#d2d2d7]/50 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                          >
                            {currencies.map(c => (
                              <option key={c.code} value={c.code}>{c.symbol} {c.name} ({c.code})</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Account Number *</label>
                          <input
                            type="text"
                            value={account.accountNumber}
                            onChange={(e) => updateBankAccount(account.id, 'accountNumber', e.target.value)}
                            placeholder="6228480000000000000"
                            className="w-full h-10 px-3 bg-white border border-[#d2d2d7]/50 rounded-lg text-[14px] font-mono focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                          />
                        </div>
                        <div>
                          <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">IBAN (if applicable)</label>
                          <input
                            type="text"
                            value={account.iban || ''}
                            onChange={(e) => updateBankAccount(account.id, 'iban', e.target.value)}
                            placeholder="FR76 3000 1007 9412..."
                            className="w-full h-10 px-3 bg-white border border-[#d2d2d7]/50 rounded-lg text-[14px] font-mono focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                          />
                          <p className="text-[11px] text-[#86868b] mt-1">Not required for Chinese banks</p>
                        </div>
                        
                        {/* Default Toggle */}
                        <div className="col-span-2 mt-2">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={account.isDefault}
                              onChange={(e) => updateBankAccount(account.id, 'isDefault', e.target.checked)}
                              className="w-5 h-5 rounded border-[#d2d2d7] text-[#0071e3] focus:ring-[#0071e3]"
                            />
                            <span className="text-[14px] text-[#1d1d1f]">Set as default bank account for invoices</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payment Terms */}
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-[#ff9500]" />
              <h2 className="text-[17px] font-semibold text-[#1d1d1f]">Payment Terms</h2>
            </div>
            <button
              onClick={addPaymentTerm}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#0071e3] text-white rounded-lg text-[13px] font-medium hover:bg-[#0077ED] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Term
            </button>
          </div>
          
          <div className="space-y-3">
            {settings.paymentTerms.map(term => (
              <div key={term.id} className="p-4 bg-[#f5f5f7] rounded-xl">
                {/* First row: Name, Days, Deposit %, Delete */}
                <div className="flex gap-3 mb-3">
                  <div className="w-40">
                    <label className="block text-[11px] font-medium text-[#86868b] mb-1">Name</label>
                    <input
                      type="text"
                      value={term.name}
                      onChange={(e) => updatePaymentTerm(term.id, 'name', e.target.value)}
                      placeholder="Term name"
                      className="w-full h-9 px-3 bg-white border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                    />
                  </div>
                  <div className="w-24">
                    <label className="block text-[11px] font-medium text-[#86868b] mb-1">Days</label>
                    <input
                      type="number"
                      value={term.days}
                      onChange={(e) => updatePaymentTerm(term.id, 'days', parseInt(e.target.value) || 0)}
                      min={0}
                      className="w-full h-9 px-3 bg-white border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                    />
                  </div>
                  <div className="w-24">
                    <label className="block text-[11px] font-medium text-[#86868b] mb-1">Deposit %</label>
                    <input
                      type="number"
                      value={term.depositPercent}
                      onChange={(e) => updatePaymentTerm(term.id, 'depositPercent', parseInt(e.target.value) || 0)}
                      min={0}
                      max={100}
                      className="w-full h-9 px-3 bg-white border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                    />
                  </div>
                  <div className="flex items-end ml-auto">
                    <button
                      onClick={() => removePaymentTerm(term.id)}
                      className="p-2 text-[#ff3b30] hover:bg-[#ff3b30]/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {/* Second row: Description (full width) */}
                <div>
                  <label className="block text-[11px] font-medium text-[#86868b] mb-1">Description</label>
                  <input
                    type="text"
                    value={term.description}
                    onChange={(e) => updatePaymentTerm(term.id, 'description', e.target.value)}
                    placeholder="e.g., 30% deposit upon order confirmation, 70% balance before shipment"
                    className="w-full h-9 px-3 bg-white border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Settings */}
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-6">
          <div className="flex items-center gap-3 mb-6">
            <DollarSign className="w-5 h-5 text-[#34c759]" />
            <h2 className="text-[17px] font-semibold text-[#1d1d1f]">Default Payment Settings</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Default Currency</label>
              <select
                value={settings.defaultCurrency}
                onChange={(e) => setSettings(prev => ({ ...prev, defaultCurrency: e.target.value }))}
                className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              >
                {currencies.map(c => (
                  <option key={c.code} value={c.code}>{c.symbol} {c.name} ({c.code})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Default Payment Terms</label>
              <select
                value={settings.defaultPaymentTermId}
                onChange={(e) => setSettings(prev => ({ ...prev, defaultPaymentTermId: e.target.value }))}
                className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              >
                {settings.paymentTerms.map(term => (
                  <option key={term.id} value={term.id}>
                    {term.name} - {term.description}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Late Fees */}
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Percent className="w-5 h-5 text-[#ff3b30]" />
              <h2 className="text-[17px] font-semibold text-[#1d1d1f]">Late Fees</h2>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.lateFeeEnabled}
                onChange={(e) => setSettings(prev => ({ ...prev, lateFeeEnabled: e.target.checked }))}
                className="w-5 h-5 rounded border-[#d2d2d7] text-[#0071e3] focus:ring-[#0071e3]"
              />
              <span className="text-[14px] text-[#1d1d1f]">Enable late fees</span>
            </label>
          </div>
          
          {settings.lateFeeEnabled && (
            <>
              <div className="space-y-3 mb-4">
                {settings.lateFeeRules.map(rule => (
                  <div key={rule.id} className="p-4 bg-[#f5f5f7] rounded-xl">
                    <div className="grid grid-cols-12 gap-3">
                      <div className="col-span-3">
                        <label className="block text-[11px] font-medium text-[#86868b] mb-1">After (days overdue)</label>
                        <input
                          type="number"
                          value={rule.afterDays}
                          onChange={(e) => updateLateFeeRule(rule.id, 'afterDays', parseInt(e.target.value) || 0)}
                          min={1}
                          className="w-full h-9 px-3 bg-white border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[11px] font-medium text-[#86868b] mb-1">Fee Type</label>
                        <select
                          value={rule.feeType}
                          onChange={(e) => updateLateFeeRule(rule.id, 'feeType', e.target.value)}
                          className="w-full h-9 px-3 bg-white border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                        >
                          <option value="percentage">%</option>
                          <option value="fixed">Fixed</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[11px] font-medium text-[#86868b] mb-1">
                          {rule.feeType === 'percentage' ? 'Percentage' : 'Amount'}
                        </label>
                        <input
                          type="number"
                          value={rule.feeAmount}
                          onChange={(e) => updateLateFeeRule(rule.id, 'feeAmount', parseFloat(e.target.value) || 0)}
                          min={0}
                          step={rule.feeType === 'percentage' ? 0.5 : 1}
                          className="w-full h-9 px-3 bg-white border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                        />
                      </div>
                      <div className="col-span-4">
                        <label className="block text-[11px] font-medium text-[#86868b] mb-1">Description</label>
                        <input
                          type="text"
                          value={rule.description}
                          onChange={(e) => updateLateFeeRule(rule.id, 'description', e.target.value)}
                          placeholder="e.g., 2% per month"
                          className="w-full h-9 px-3 bg-white border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                        />
                      </div>
                      <div className="col-span-1 flex items-end justify-center">
                        <button
                          onClick={() => removeLateFeeRule(rule.id)}
                          className="p-2 text-[#ff3b30] hover:bg-[#ff3b30]/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <button
                onClick={addLateFeeRule}
                className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-[#d2d2d7] rounded-xl text-[13px] font-medium text-[#86868b] hover:border-[#0071e3] hover:text-[#0071e3] transition-colors w-full justify-center"
              >
                <Plus className="w-4 h-4" />
                Add Late Fee Rule
              </button>
              
              <div className="bg-[#ff9500]/10 rounded-lg p-3 mt-4">
                <p className="text-[12px] text-[#ff9500]">
                  <strong>Example:</strong> Add a rule for 2% after 30 days, and another rule for 5% after 60 days to create tiered late fees.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Invoice Settings */}
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-6">
          <div className="flex items-center gap-3 mb-6">
            <CreditCard className="w-5 h-5 text-[#5856d6]" />
            <h2 className="text-[17px] font-semibold text-[#1d1d1f]">Invoice Settings</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Invoice Prefix</label>
              <input
                type="text"
                value={settings.invoicePrefix}
                onChange={(e) => setSettings(prev => ({ ...prev, invoicePrefix: e.target.value }))}
                placeholder="INV-"
                className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Next Invoice Number</label>
              <input
                type="number"
                value={settings.nextInvoiceNumber}
                onChange={(e) => setSettings(prev => ({ ...prev, nextInvoiceNumber: parseInt(e.target.value) || 1 }))}
                min={1}
                className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Default Invoice Notes</label>
            <textarea
              value={settings.invoiceNotes}
              onChange={(e) => setSettings(prev => ({ ...prev, invoiceNotes: e.target.value }))}
              placeholder="Thank you for your business. Payment is due within the specified terms."
              rows={3}
              className="w-full px-3 py-2 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3] resize-none"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
