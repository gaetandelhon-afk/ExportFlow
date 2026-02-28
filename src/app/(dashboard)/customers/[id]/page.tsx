'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { 
  ChevronLeft, Loader2, Save, Building2, Mail, Phone, Globe, 
  MapPin, FileText, CreditCard, Package, Plus, Trash2, X, Edit3
} from 'lucide-react'
import { useLocalization } from '@/hooks/useLocalization'

interface Address {
  id: string
  label: string
  type: 'shipping' | 'billing' | 'both'
  company: string
  street: string
  city: string
  postalCode: string
  country: string
  isDefault: boolean
}

interface CustomField {
  id: string
  label: string
  value: string
  type: 'text' | 'textarea' | 'number' | 'date' | 'email' | 'url'
}

interface ShippingAgent {
  id: string
  name: string
  contactPerson: string
  email: string
  phone: string
  address: string
  street: string
  city: string
  state: string
  postalCode: string
  country: string
  notes: string
  isDefault: boolean
}

interface Customer {
  id: string
  companyName: string
  contactName: string | null
  email: string
  phone: string | null
  country: string | null
  vatNumber: string | null
  priceType: string
  priceTierId: string | null
  currency: string
  paymentTerms: string | null
  shippingAddress: string | null
  billingAddress: string | null
  customFields: Record<string, unknown> | null
}

export default function CustomerDetailPage() {
  const router = useRouter()
  const { currencySymbol } = useLocalization()
  const params = useParams()
  const customerId = params.id as string

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'addresses' | 'agents' | 'pricing' | 'orders'>('info')

  // Form state
  const [form, setForm] = useState({
    companyName: '',
    legalName: '',
    contactName: '',
    email: '',
    phone: '',
    country: '',
    vatNumber: '',
    notes: '',
    priceTierId: '', // ID of the selected price tier
    priceTier: 'DISTRIBUTOR', // Legacy code-based tier
    customDiscount: 0,
    paymentTerms: 'Net 30',
    currency: 'EUR',
  })

  const [addresses, setAddresses] = useState<Address[]>([])
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [shippingAgents, setShippingAgents] = useState<ShippingAgent[]>([])
  const [orders, setOrders] = useState<Array<{ id: string; orderNumber: string; status: string; totalAmount: number; createdAt: string }>>([])
  const [enabledCurrencies, setEnabledCurrencies] = useState<Array<{ code: string; symbol: string; name: string }>>([])
  const [availablePriceTiers, setAvailablePriceTiers] = useState<Array<{ id: string; code: string; name: string; type?: string }>>([])
  const [availablePaymentTerms, setAvailablePaymentTerms] = useState<Array<{ id: string; name: string }>>([])
  const [showAddAddress, setShowAddAddress] = useState(false)
  const [newAddress, setNewAddress] = useState<Omit<Address, 'id'>>({
    label: '',
    type: 'shipping',
    company: '',
    street: '',
    city: '',
    postalCode: '',
    country: '',
    isDefault: false
  })

  useEffect(() => {
    fetchCustomer()
    fetchOrders()
    loadEnabledCurrencies()
    loadPriceTiers()
    loadPaymentTerms()
  }, [customerId])

  const loadPriceTiers = async () => {
    try {
      const res = await fetch('/api/settings/price-tiers')
      if (res.ok) {
        const data = await res.json()
        if (data.tiers && data.tiers.length > 0) {
          setAvailablePriceTiers(data.tiers.map((t: { id: string; code: string; name: string; type?: string }) => ({
            id: t.id,
            code: t.code,
            name: t.name,
            type: t.type
          })))
        } else {
          setAvailablePriceTiers([])
        }
      }
    } catch (e) {
      console.error('Error loading price tiers:', e)
      setAvailablePriceTiers([])
    }
  }

  const loadEnabledCurrencies = () => {
    try {
      const stored = localStorage.getItem('orderbridge_localization_settings')
      if (stored) {
        const settings = JSON.parse(stored)
        const currencies = settings.currencies?.filter((c: { enabled: boolean }) => c.enabled) || []
        if (currencies.length > 0) {
          setEnabledCurrencies(currencies)
          return
        }
      }
    } catch (e) {
      console.error('Error loading currencies:', e)
    }
    setEnabledCurrencies([
      { code: 'EUR', symbol: '€', name: 'Euro' },
      { code: 'USD', symbol: '$', name: 'US Dollar' },
    ])
  }

  const loadPaymentTerms = () => {
    try {
      const stored = localStorage.getItem('orderbridge_billing_settings')
      if (stored) {
        const settings = JSON.parse(stored)
        if (settings.paymentTerms && settings.paymentTerms.length > 0) {
          setAvailablePaymentTerms(settings.paymentTerms.map((t: { id: string; name: string }) => ({
            id: t.id,
            name: t.name
          })))
          return
        }
      }
    } catch (e) {
      console.error('Error loading payment terms:', e)
    }
    // Fallback defaults
    setAvailablePaymentTerms([
      { id: 'PREPAID', name: 'Prepaid' },
      { id: 'Net 30', name: 'Net 30' },
      { id: 'Net 60', name: 'Net 60' },
    ])
  }

  const fetchCustomer = async () => {
    try {
      const res = await fetch(`/api/customers/${customerId}`)
      if (!res.ok) {
        setError('Customer not found')
        return
      }
      const data = await res.json()
      const c = data.customer as Customer
      setCustomer(c)

      // Populate form
      const cf = c.customFields || {}
      setForm({
        companyName: c.companyName,
        legalName: (cf.legalName as string) || '',
        contactName: c.contactName || '',
        email: c.email,
        phone: c.phone || '',
        country: c.country || '',
        vatNumber: c.vatNumber || '',
        notes: (cf.notes as string) || '',
        priceTierId: c.priceTierId || '', // New tier ID
        priceTier: c.priceType, // Legacy support
        customDiscount: (cf.discount as number) || 0,
        paymentTerms: c.paymentTerms || 'Net 30',
        currency: c.currency,
      })

      // Load addresses from customFields
      if (cf.addresses && Array.isArray(cf.addresses)) {
        setAddresses(cf.addresses as Address[])
      }

      // Load custom fields (excluding reserved ones)
      const reserved = ['legalName', 'notes', 'discount', 'addresses']
      const fields: CustomField[] = []
      Object.entries(cf).forEach(([key, value]) => {
        if (!reserved.includes(key)) {
          fields.push({
            id: `field-${Date.now()}-${Math.random()}`,
            label: key,
            value: String(value),
            type: 'text',
          })
        }
      })
      setCustomFields(fields)

      // Load shipping agents from customFields or API
      if (cf.shippingAgents && Array.isArray(cf.shippingAgents)) {
        setShippingAgents(cf.shippingAgents as ShippingAgent[])
      }

    } catch {
      setError('Failed to load customer')
    } finally {
      setLoading(false)
    }
  }

  const fetchOrders = async () => {
    try {
      const res = await fetch(`/api/orders?customerId=${customerId}`)
      if (res.ok) {
        const data = await res.json()
        setOrders(data.orders || [])
      }
    } catch {
      // Silent fail for orders
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const value = e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value
    setForm({ ...form, [e.target.name]: value })
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')

    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          priceType: form.priceTier, // Legacy
          priceTierId: form.priceTierId || null, // New tier ID
          addresses,
          customFields: customFields.filter(f => f.label.trim() !== ''),
          shippingAgents: shippingAgents.filter(a => a.name.trim() !== ''),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to update')
        return
      }

      setIsEditing(false)
      fetchCustomer()
    } catch {
      setError('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this customer? This cannot be undone.')) return

    try {
      const res = await fetch(`/api/customers/${customerId}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/customers')
      }
    } catch {
      setError('Failed to delete customer')
    }
  }

  // Custom fields handlers
  const addCustomField = () => {
    setCustomFields(prev => [...prev, {
      id: `field-${Date.now()}`,
      label: '',
      value: '',
      type: 'text',
    }])
  }

  const updateCustomField = (id: string, updates: Partial<CustomField>) => {
    setCustomFields(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f))
  }

  const removeCustomField = (id: string) => {
    setCustomFields(prev => prev.filter(f => f.id !== id))
  }

  const tabs = [
    { id: 'info', label: 'Company Info' },
    { id: 'addresses', label: 'Addresses' },
    { id: 'agents', label: `Shipping Agents (${shippingAgents.length})` },
    { id: 'pricing', label: 'Pricing & Terms' },
    { id: 'orders', label: `Orders (${orders.length})` },
  ] as const

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[#0071e3] animate-spin" />
      </div>
    )
  }

  if (error && !customer) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Building2 className="w-12 h-12 text-[#86868b] mx-auto mb-4" />
          <p className="text-[15px] text-[#86868b]">{error}</p>
          <Link href="/customers" className="text-[#0071e3] text-[14px] mt-4 inline-block">
            Back to Customers
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link href="/customers" className="text-[#0071e3] hover:text-[#0077ed] flex items-center gap-1 text-[13px] mb-4">
          <ChevronLeft className="w-4 h-4" />
          Back to Customers
        </Link>
        
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-[#0071e3] to-[#00c7be] rounded-2xl flex items-center justify-center">
              <span className="text-[18px] font-semibold text-white">
                {form.companyName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-[28px] font-semibold text-[#1d1d1f]">{form.companyName}</h1>
              {form.legalName && form.legalName !== form.companyName && (
                <p className="text-[14px] text-[#86868b]">{form.legalName}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={() => {
                    setIsEditing(false)
                    fetchCustomer() // Reset form
                  }}
                  className="h-10 px-4 bg-white border border-[#d2d2d7]/50 text-[#1d1d1f] text-[13px] font-medium rounded-xl hover:bg-[#f5f5f7] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="h-10 px-4 bg-[#0071e3] text-white text-[13px] font-medium rounded-xl hover:bg-[#0077ed] transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Changes
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="h-10 px-4 bg-[#0071e3] text-white text-[13px] font-medium rounded-xl hover:bg-[#0077ed] transition-colors flex items-center gap-2"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="h-10 px-4 bg-white border border-[#ff3b30]/30 text-[#ff3b30] text-[13px] font-medium rounded-xl hover:bg-[#ff3b30]/10 transition-colors"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[#f5f5f7] rounded-xl mb-6 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 px-3 text-[14px] font-medium rounded-lg transition-all whitespace-nowrap ${
              activeTab === tab.id 
                ? 'bg-white text-[#1d1d1f] shadow-sm' 
                : 'text-[#86868b] hover:text-[#1d1d1f]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 text-[13px] text-[#ff3b30] bg-[#ff3b30]/10 px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {/* Company Info Tab */}
      {activeTab === 'info' && (
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Company Name</label>
              <input 
                type="text" 
                name="companyName" 
                value={form.companyName} 
                onChange={handleChange}
                disabled={!isEditing}
                className="w-full h-11 px-4 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3] disabled:opacity-70" 
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Legal Name</label>
              <input 
                type="text" 
                name="legalName" 
                value={form.legalName} 
                onChange={handleChange}
                disabled={!isEditing}
                className="w-full h-11 px-4 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3] disabled:opacity-70" 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Contact Name</label>
              <input 
                type="text" 
                name="contactName" 
                value={form.contactName} 
                onChange={handleChange}
                disabled={!isEditing}
                className="w-full h-11 px-4 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3] disabled:opacity-70" 
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Email</label>
              <input 
                type="email" 
                name="email" 
                value={form.email} 
                onChange={handleChange}
                disabled={!isEditing}
                className="w-full h-11 px-4 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3] disabled:opacity-70" 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Phone</label>
              <input 
                type="text" 
                name="phone" 
                value={form.phone} 
                onChange={handleChange}
                disabled={!isEditing}
                className="w-full h-11 px-4 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3] disabled:opacity-70" 
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Country</label>
              <input 
                type="text" 
                name="country" 
                value={form.country} 
                onChange={handleChange}
                disabled={!isEditing}
                className="w-full h-11 px-4 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3] disabled:opacity-70" 
              />
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">VAT Number</label>
            <input 
              type="text" 
              name="vatNumber" 
              value={form.vatNumber} 
              onChange={handleChange}
              disabled={!isEditing}
              className="w-full h-11 px-4 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3] disabled:opacity-70" 
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Notes</label>
            <textarea 
              name="notes" 
              value={form.notes} 
              onChange={handleChange}
              disabled={!isEditing}
              rows={3}
              className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3] disabled:opacity-70 resize-none" 
            />
          </div>

          {/* Custom Fields */}
          {(customFields.length > 0 || isEditing) && (
            <div className="pt-4 border-t border-[#d2d2d7]/30">
              <h3 className="text-[14px] font-semibold text-[#1d1d1f] mb-3">Custom Fields</h3>
              {customFields.length > 0 && (
                <div className="space-y-2 mb-3">
                  {customFields.map(field => (
                    <div key={field.id} className="flex items-center gap-3 p-3 bg-[#f5f5f7] rounded-xl">
                      {isEditing ? (
                        <>
                          <input
                            type="text"
                            value={field.label}
                            onChange={(e) => updateCustomField(field.id, { label: e.target.value })}
                            placeholder="Field name"
                            className="w-40 h-9 px-3 bg-white rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                          />
                          <input
                            type="text"
                            value={field.value}
                            onChange={(e) => updateCustomField(field.id, { value: e.target.value })}
                            placeholder="Value"
                            className="flex-1 h-9 px-3 bg-white rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                          />
                          <button
                            type="button"
                            onClick={() => removeCustomField(field.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#ff3b30]/10 text-[#ff3b30]"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="text-[13px] font-medium text-[#86868b] w-40">{field.label}:</span>
                          <span className="text-[13px] text-[#1d1d1f]">{field.value}</span>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {isEditing && (
                <button
                  type="button"
                  onClick={addCustomField}
                  className="w-full h-10 flex items-center justify-center gap-2 border-2 border-dashed border-[#d2d2d7] hover:border-[#0071e3] rounded-xl text-[13px] text-[#86868b] hover:text-[#0071e3] transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Custom Field
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Addresses Tab */}
      {activeTab === 'addresses' && (
        <div className="space-y-4">
          {/* Add Address Button */}
          <div className="flex justify-end">
            <button
              onClick={() => setShowAddAddress(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#0071e3] text-white rounded-xl text-[13px] font-medium hover:bg-[#0077ed] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Address
            </button>
          </div>

          {/* Add Address Form */}
          {showAddAddress && (
            <div className="bg-white rounded-2xl border border-[#0071e3] p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[15px] font-semibold text-[#1d1d1f]">New Address</h3>
                <button onClick={() => setShowAddAddress(false)} className="p-1 hover:bg-[#f5f5f7] rounded">
                  <X className="w-4 h-4 text-[#86868b]" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-medium text-[#86868b] mb-1">Label</label>
                  <input
                    type="text"
                    value={newAddress.label}
                    onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
                    placeholder="e.g., Main Office"
                    className="w-full h-10 px-3 bg-[#f5f5f7] rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#86868b] mb-1">Type</label>
                  <select
                    value={newAddress.type}
                    onChange={(e) => setNewAddress({ ...newAddress, type: e.target.value as 'shipping' | 'billing' | 'both' })}
                    className="w-full h-10 px-3 bg-[#f5f5f7] rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  >
                    <option value="shipping">Shipping</option>
                    <option value="billing">Billing</option>
                    <option value="both">Both</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#86868b] mb-1">Company</label>
                <input
                  type="text"
                  value={newAddress.company}
                  onChange={(e) => setNewAddress({ ...newAddress, company: e.target.value })}
                  className="w-full h-10 px-3 bg-[#f5f5f7] rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#86868b] mb-1">Street</label>
                <input
                  type="text"
                  value={newAddress.street}
                  onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })}
                  className="w-full h-10 px-3 bg-[#f5f5f7] rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[12px] font-medium text-[#86868b] mb-1">City</label>
                  <input
                    type="text"
                    value={newAddress.city}
                    onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                    className="w-full h-10 px-3 bg-[#f5f5f7] rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#86868b] mb-1">Postal Code</label>
                  <input
                    type="text"
                    value={newAddress.postalCode}
                    onChange={(e) => setNewAddress({ ...newAddress, postalCode: e.target.value })}
                    className="w-full h-10 px-3 bg-[#f5f5f7] rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#86868b] mb-1">Country</label>
                  <input
                    type="text"
                    value={newAddress.country}
                    onChange={(e) => setNewAddress({ ...newAddress, country: e.target.value })}
                    className="w-full h-10 px-3 bg-[#f5f5f7] rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={newAddress.isDefault}
                  onChange={(e) => setNewAddress({ ...newAddress, isDefault: e.target.checked })}
                  className="w-4 h-4 rounded border-[#d2d2d7] text-[#0071e3] focus:ring-[#0071e3]"
                />
                <label htmlFor="isDefault" className="text-[13px] text-[#1d1d1f]">Set as default address</label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowAddAddress(false)}
                  className="px-4 py-2 text-[13px] text-[#86868b] hover:text-[#1d1d1f]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!newAddress.label || !newAddress.street) return
                    const addr: Address = {
                      ...newAddress,
                      id: `addr_${Date.now()}`
                    }
                    if (addr.isDefault) {
                      setAddresses(prev => prev.map(a => ({ ...a, isDefault: false })))
                    }
                    setAddresses(prev => [...prev, addr])
                    setNewAddress({
                      label: '',
                      type: 'shipping',
                      company: '',
                      street: '',
                      city: '',
                      postalCode: '',
                      country: '',
                      isDefault: false
                    })
                    setShowAddAddress(false)
                  }}
                  disabled={!newAddress.label || !newAddress.street}
                  className="px-4 py-2 bg-[#0071e3] text-white rounded-lg text-[13px] font-medium hover:bg-[#0077ed] disabled:bg-[#d2d2d7]"
                >
                  Add Address
                </button>
              </div>
            </div>
          )}

          {addresses.length > 0 ? (
            addresses.map(address => (
              <div key={address.id} className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-[#f5f5f7] rounded-xl flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-[#86868b]" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[14px] font-medium text-[#1d1d1f]">{address.label}</p>
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${
                        address.type === 'shipping' ? 'bg-[#0071e3]/10 text-[#0071e3]' :
                        address.type === 'billing' ? 'bg-[#ff9500]/10 text-[#ff9500]' :
                        'bg-[#34c759]/10 text-[#34c759]'
                      }`}>
                        {address.type === 'both' ? 'Shipping & Billing' : address.type}
                      </span>
                      {address.isDefault && (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-[#1d1d1f] text-white">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-[13px] text-[#86868b] mt-1">
                      {address.company && <span>{address.company}<br /></span>}
                      {address.street}, {address.postalCode} {address.city}, {address.country}
                    </p>
                  </div>
                  <button
                    onClick={() => setAddresses(prev => prev.filter(a => a.id !== address.id))}
                    className="p-2 hover:bg-[#ff3b30]/10 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4 text-[#ff3b30]" />
                  </button>
                </div>
              </div>
            ))
          ) : !showAddAddress && (
            <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-8 text-center">
              <MapPin className="w-10 h-10 text-[#86868b] mx-auto mb-3" />
              <p className="text-[14px] text-[#86868b]">No addresses saved</p>
              <button
                onClick={() => setShowAddAddress(true)}
                className="mt-3 text-[13px] text-[#0071e3] font-medium"
              >
                Add your first address
              </button>
            </div>
          )}

          {customer?.shippingAddress && addresses.length === 0 && !showAddAddress && (
            <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-[#f5f5f7] rounded-xl flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-[#86868b]" />
                </div>
                <div>
                  <p className="text-[14px] font-medium text-[#1d1d1f]">Shipping Address (Legacy)</p>
                  <p className="text-[13px] text-[#86868b] mt-1 whitespace-pre-line">{customer.shippingAddress}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Shipping Agents Tab */}
      {activeTab === 'agents' && (
        <div className="space-y-4">
          {/* Add New Agent Button */}
          <div className="flex justify-end">
            <button
              onClick={() => {
                const newAgent: ShippingAgent = {
                  id: `agent_${Date.now()}`,
                  name: '',
                  contactPerson: '',
                  email: '',
                  phone: '',
                  address: '',
                  street: '',
                  city: '',
                  state: '',
                  postalCode: '',
                  country: '',
                  notes: '',
                  isDefault: shippingAgents.length === 0
                }
                setShippingAgents(prev => [...prev, newAgent])
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#0071e3] text-white rounded-xl text-[14px] font-medium hover:bg-[#0077ed] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Shipping Agent
            </button>
          </div>

          {shippingAgents.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-8 text-center">
              <Package className="w-12 h-12 text-[#86868b] mx-auto mb-3" />
              <h3 className="text-[17px] font-semibold text-[#1d1d1f] mb-1">No Shipping Agents</h3>
              <p className="text-[14px] text-[#86868b]">
                Add shipping agents that can receive shipments on behalf of this customer.
              </p>
            </div>
          ) : (
            shippingAgents.map((agent, index) => (
              <div key={agent.id} className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#0071e3]/10 rounded-full flex items-center justify-center">
                      <Globe className="w-5 h-5 text-[#0071e3]" />
                    </div>
                    <div>
                      <h4 className="text-[15px] font-semibold text-[#1d1d1f]">
                        {agent.name || `Shipping Agent ${index + 1}`}
                      </h4>
                      {agent.isDefault && (
                        <span className="text-[11px] px-2 py-0.5 bg-[#34c759]/10 text-[#34c759] rounded-full font-medium">
                          Default
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!agent.isDefault && (
                      <button
                        onClick={() => {
                          setShippingAgents(prev => prev.map(a => ({
                            ...a,
                            isDefault: a.id === agent.id
                          })))
                        }}
                        className="text-[13px] text-[#0071e3] hover:underline"
                      >
                        Set as Default
                      </button>
                    )}
                    <button
                      onClick={() => setShippingAgents(prev => prev.filter(a => a.id !== agent.id))}
                      className="p-2 text-[#ff3b30] hover:bg-[#ff3b30]/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Agent Name *</label>
                    <input
                      type="text"
                      value={agent.name}
                      onChange={(e) => setShippingAgents(prev => prev.map(a => 
                        a.id === agent.id ? { ...a, name: e.target.value } : a
                      ))}
                      className="w-full h-10 px-3 bg-[#f5f5f7] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                      placeholder="Company or agent name"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Contact Person</label>
                    <input
                      type="text"
                      value={agent.contactPerson}
                      onChange={(e) => setShippingAgents(prev => prev.map(a => 
                        a.id === agent.id ? { ...a, contactPerson: e.target.value } : a
                      ))}
                      className="w-full h-10 px-3 bg-[#f5f5f7] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                      placeholder="Contact person name"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Email</label>
                    <input
                      type="email"
                      value={agent.email}
                      onChange={(e) => setShippingAgents(prev => prev.map(a => 
                        a.id === agent.id ? { ...a, email: e.target.value } : a
                      ))}
                      className="w-full h-10 px-3 bg-[#f5f5f7] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Phone</label>
                    <input
                      type="tel"
                      value={agent.phone}
                      onChange={(e) => setShippingAgents(prev => prev.map(a => 
                        a.id === agent.id ? { ...a, phone: e.target.value } : a
                      ))}
                      className="w-full h-10 px-3 bg-[#f5f5f7] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                      placeholder="+1 234 567 8900"
                    />
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-[#d2d2d7]/20">
                  <h5 className="text-[13px] font-semibold text-[#1d1d1f] mb-3">Address</h5>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Street Address</label>
                      <input
                        type="text"
                        value={agent.street}
                        onChange={(e) => setShippingAgents(prev => prev.map(a => 
                          a.id === agent.id ? { ...a, street: e.target.value } : a
                        ))}
                        className="w-full h-10 px-3 bg-[#f5f5f7] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                        placeholder="123 Main Street"
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">City</label>
                      <input
                        type="text"
                        value={agent.city}
                        onChange={(e) => setShippingAgents(prev => prev.map(a => 
                          a.id === agent.id ? { ...a, city: e.target.value } : a
                        ))}
                        className="w-full h-10 px-3 bg-[#f5f5f7] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                        placeholder="City"
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">State/Province</label>
                      <input
                        type="text"
                        value={agent.state}
                        onChange={(e) => setShippingAgents(prev => prev.map(a => 
                          a.id === agent.id ? { ...a, state: e.target.value } : a
                        ))}
                        className="w-full h-10 px-3 bg-[#f5f5f7] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                        placeholder="State"
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Postal Code</label>
                      <input
                        type="text"
                        value={agent.postalCode}
                        onChange={(e) => setShippingAgents(prev => prev.map(a => 
                          a.id === agent.id ? { ...a, postalCode: e.target.value } : a
                        ))}
                        className="w-full h-10 px-3 bg-[#f5f5f7] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                        placeholder="12345"
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Country</label>
                      <input
                        type="text"
                        value={agent.country}
                        onChange={(e) => setShippingAgents(prev => prev.map(a => 
                          a.id === agent.id ? { ...a, country: e.target.value } : a
                        ))}
                        className="w-full h-10 px-3 bg-[#f5f5f7] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                        placeholder="Country"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Notes</label>
                  <textarea
                    value={agent.notes}
                    onChange={(e) => setShippingAgents(prev => prev.map(a => 
                      a.id === agent.id ? { ...a, notes: e.target.value } : a
                    ))}
                    rows={2}
                    className="w-full px-3 py-2 bg-[#f5f5f7] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3] resize-none"
                    placeholder="Additional notes about this shipping agent..."
                  />
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Pricing Tab */}
      {activeTab === 'pricing' && (
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-6 space-y-5">
          <div>
            <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Price Tier</label>
            <select 
              name="priceTierId" 
              value={form.priceTierId} 
              onChange={handleChange}
              disabled={!isEditing}
              className="w-full h-11 px-4 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3] disabled:opacity-70"
            >
              <option value="">Select a price tier</option>
              {availablePriceTiers.map(tier => (
                <option key={tier.id || tier.code} value={tier.id}>{tier.name}</option>
              ))}
            </select>
            <p className="text-[12px] text-[#86868b] mt-1">
              The client will see prices defined for this tier on all products.
            </p>
            {availablePriceTiers.length === 0 && (
              <div className="mt-3 p-3 bg-[#ff9500]/5 border border-[#ff9500]/20 rounded-lg">
                <p className="text-[12px] text-[#ff9500]">
                  💡 No price tiers found. <Link href="/settings/pricing" className="underline font-medium">Create price tiers in Settings → Pricing</Link>
                </p>
              </div>
            )}
          </div>
          
          <div className="p-4 bg-[#f5f5f7] rounded-xl">
            <h4 className="text-[13px] font-medium text-[#1d1d1f] mb-2">How pricing works</h4>
            <ul className="text-[12px] text-[#86868b] space-y-1">
              <li>• <strong>Price Tier</strong> determines which price level the client sees (e.g., Distributor, Wholesale)</li>
              <li>• <strong>Quantity discounts</strong> are defined per product in <Link href="/settings/pricing" className="text-[#0071e3] underline">Settings → Pricing</Link> and assigned to products</li>
              <li>• Both systems work together: client sees their tier price + any quantity discounts on products</li>
            </ul>
          </div>

          <div>
            <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Additional Discount (%)</label>
            <input 
              type="number" 
              name="customDiscount" 
              value={form.customDiscount} 
              onChange={handleChange}
              disabled={!isEditing}
              min="0"
              max="100"
              step="0.5"
              className="w-full h-11 px-4 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3] disabled:opacity-70" 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Payment Terms</label>
              <select 
                name="paymentTerms" 
                value={form.paymentTerms} 
                onChange={handleChange}
                disabled={!isEditing}
                className="w-full h-11 px-4 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3] disabled:opacity-70"
              >
                <option value="">Select payment terms</option>
                {availablePaymentTerms.map(term => (
                  <option key={term.id} value={term.id}>{term.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Currency</label>
              <select 
                name="currency" 
                value={form.currency} 
                onChange={handleChange}
                disabled={!isEditing}
                className="w-full h-11 px-4 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3] disabled:opacity-70"
              >
                {enabledCurrencies.map(currency => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code} ({currency.symbol})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 overflow-hidden">
          {orders.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#d2d2d7]/30 bg-[#f5f5f7]/50">
                  <th className="text-left text-[12px] font-medium text-[#86868b] uppercase tracking-wide px-6 py-3">Order</th>
                  <th className="text-left text-[12px] font-medium text-[#86868b] uppercase tracking-wide px-6 py-3">Status</th>
                  <th className="text-right text-[12px] font-medium text-[#86868b] uppercase tracking-wide px-6 py-3">Amount</th>
                  <th className="text-left text-[12px] font-medium text-[#86868b] uppercase tracking-wide px-6 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id} className="border-b border-[#d2d2d7]/30 last:border-0 hover:bg-[#f5f5f7]/50">
                    <td className="px-6 py-4">
                      <Link href={`/orders/${order.id}`} className="text-[14px] font-medium text-[#0071e3] hover:underline">
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[12px] font-medium px-2.5 py-1 rounded-md bg-[#f5f5f7] text-[#1d1d1f]">
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-[14px] font-medium text-[#1d1d1f]">
                        {currencySymbol}{Number(order.totalAmount).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[13px] text-[#86868b]">
                        {new Date(order.createdAt).toLocaleDateString('en-GB')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center">
              <Package className="w-10 h-10 text-[#86868b] mx-auto mb-3" />
              <p className="text-[14px] text-[#86868b]">No orders yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
