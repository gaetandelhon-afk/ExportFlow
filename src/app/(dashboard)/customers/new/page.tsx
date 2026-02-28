'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Loader2, Plus, Trash2, MapPin, GripVertical, X } from 'lucide-react'

interface PriceTierOption {
  id: string
  code: string
  name: string
  isDefault?: boolean
}

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

export default function NewCustomerPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'info' | 'addresses' | 'pricing' | 'custom'>('info')

  const [form, setForm] = useState({
    companyName: '',
    legalName: '',
    contactName: '',
    email: '',
    phone: '',
    country: '',
    vatNumber: '',
    notes: '',
    // Pricing
    priceTierId: '',
    customDiscount: 0,
    paymentTerms: 'NET30',
    currency: 'EUR',
  })

  const [availablePriceTiers, setAvailablePriceTiers] = useState<PriceTierOption[]>([])

  useEffect(() => {
    async function loadPriceTiers() {
      try {
        const res = await fetch('/api/settings/price-tiers')
        if (res.ok) {
          const data = await res.json()
          if (data.tiers && data.tiers.length > 0) {
            setAvailablePriceTiers(data.tiers)
            const defaultTier = data.tiers.find((t: PriceTierOption) => t.isDefault)
            if (defaultTier) {
              setForm(prev => ({ ...prev, priceTierId: defaultTier.id }))
            }
          }
        }
      } catch (e) {
        console.error('Error loading price tiers:', e)
      }
    }
    loadPriceTiers()
  }, [])

  const [addresses, setAddresses] = useState<Address[]>([])
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [showAddAddress, setShowAddAddress] = useState(false)
  const [newAddress, setNewAddress] = useState<Omit<Address, 'id'>>({
    label: '',
    type: 'both',
    company: '',
    street: '',
    city: '',
    postalCode: '',
    country: '',
    isDefault: false,
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const value = e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value
    setForm({ ...form, [e.target.name]: value })
  }

  const handleAddAddress = () => {
    if (!newAddress.street || !newAddress.city || !newAddress.country) return
    
    const address: Address = {
      ...newAddress,
      id: `addr-${Date.now()}`,
      label: newAddress.label || `Address ${addresses.length + 1}`,
    }
    
    if (addresses.length === 0 || newAddress.isDefault) {
      setAddresses(prev => prev.map(a => ({ ...a, isDefault: false })))
      address.isDefault = true
    }
    
    setAddresses([...addresses, address])
    setNewAddress({
      label: '',
      type: 'both',
      company: '',
      street: '',
      city: '',
      postalCode: '',
      country: '',
      isDefault: false,
    })
    setShowAddAddress(false)
  }

  const handleRemoveAddress = (id: string) => {
    setAddresses(addresses.filter(a => a.id !== id))
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          addresses,
          customFields: customFields.filter(f => f.label.trim() !== ''),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to create customer')
        return
      }

      router.push('/customers')
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'info', label: 'Company Info' },
    { id: 'addresses', label: 'Addresses' },
    { id: 'pricing', label: 'Pricing & Terms' },
    { id: 'custom', label: 'Custom Fields' },
  ] as const

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link href="/customers" className="text-[#0071e3] hover:text-[#0077ed] flex items-center gap-1 text-[13px] mb-4">
          <ChevronLeft className="w-4 h-4" />
          Back to Customers
        </Link>
        <h1 className="text-[28px] font-semibold text-[#1d1d1f]">Add Customer</h1>
        <p className="text-[15px] text-[#86868b] mt-1">Create a new customer account</p>
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
            {tab.id === 'custom' && customFields.length > 0 && (
              <span className="ml-1.5 text-[11px] bg-[#0071e3]/10 text-[#0071e3] px-1.5 py-0.5 rounded">
                {customFields.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        {/* Company Info Tab */}
        {activeTab === 'info' && (
          <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-6 space-y-5">
            <div>
              <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Company Name *</label>
              <input 
                type="text" 
                name="companyName" 
                value={form.companyName} 
                onChange={handleChange} 
                required 
                placeholder="Trading name"
                className="w-full h-11 px-4 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]" 
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Legal Name</label>
              <input 
                type="text" 
                name="legalName" 
                value={form.legalName} 
                onChange={handleChange} 
                placeholder="Legal entity name (for invoices)"
                className="w-full h-11 px-4 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]" 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Contact Name</label>
                <input 
                  type="text" 
                  name="contactName" 
                  value={form.contactName} 
                  onChange={handleChange} 
                  placeholder="Primary contact"
                  className="w-full h-11 px-4 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]" 
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Email</label>
                <input 
                  type="email" 
                  name="email" 
                  value={form.email} 
                  onChange={handleChange} 
                  placeholder="contact@company.com"
                  className="w-full h-11 px-4 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]" 
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
                  placeholder="+46 123 456 789"
                  className="w-full h-11 px-4 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]" 
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Country</label>
                <input 
                  type="text" 
                  name="country" 
                  value={form.country} 
                  onChange={handleChange} 
                  placeholder="Sweden"
                  className="w-full h-11 px-4 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]" 
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
                placeholder="SE123456789001"
                className="w-full h-11 px-4 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]" 
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Internal Notes</label>
              <textarea 
                name="notes" 
                value={form.notes} 
                onChange={handleChange} 
                rows={3}
                placeholder="Notes visible only to admin..."
                className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3] resize-none" 
              />
            </div>
          </div>
        )}

        {/* Addresses Tab */}
        {activeTab === 'addresses' && (
          <div className="space-y-4">
            {addresses.length > 0 ? (
              <div className="space-y-3">
                {addresses.map((address) => (
                  <div 
                    key={address.id}
                    className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-5"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-[#f5f5f7] rounded-xl flex items-center justify-center">
                          <MapPin className="w-5 h-5 text-[#86868b]" />
                        </div>
                        <div>
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
                            {address.street}, {address.postalCode} {address.city}, {address.country}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAddress(address.id)}
                        className="p-2 hover:bg-[#f5f5f7] rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-[#ff3b30]" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-8 text-center">
                <MapPin className="w-10 h-10 text-[#86868b] mx-auto mb-3" />
                <p className="text-[14px] text-[#86868b]">No addresses added yet</p>
              </div>
            )}

            {showAddAddress ? (
              <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-6 space-y-4">
                <h3 className="text-[15px] font-semibold text-[#1d1d1f]">New Address</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Label</label>
                    <input 
                      type="text" 
                      value={newAddress.label} 
                      onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
                      placeholder="e.g. Headquarters, Warehouse"
                      className="w-full h-11 px-4 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]" 
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Type</label>
                    <select 
                      value={newAddress.type} 
                      onChange={(e) => setNewAddress({ ...newAddress, type: e.target.value as Address['type'] })}
                      className="w-full h-11 px-4 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                    >
                      <option value="both">Shipping & Billing</option>
                      <option value="shipping">Shipping Only</option>
                      <option value="billing">Billing Only</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Company (if different)</label>
                  <input 
                    type="text" 
                    value={newAddress.company} 
                    onChange={(e) => setNewAddress({ ...newAddress, company: e.target.value })}
                    placeholder="Leave empty to use customer company name"
                    className="w-full h-11 px-4 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]" 
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Street Address *</label>
                  <input 
                    type="text" 
                    value={newAddress.street} 
                    onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })}
                    placeholder="123 Main Street"
                    className="w-full h-11 px-4 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]" 
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Postal Code</label>
                    <input 
                      type="text" 
                      value={newAddress.postalCode} 
                      onChange={(e) => setNewAddress({ ...newAddress, postalCode: e.target.value })}
                      placeholder="12345"
                      className="w-full h-11 px-4 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]" 
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">City *</label>
                    <input 
                      type="text" 
                      value={newAddress.city} 
                      onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                      placeholder="Stockholm"
                      className="w-full h-11 px-4 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]" 
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Country *</label>
                    <input 
                      type="text" 
                      value={newAddress.country} 
                      onChange={(e) => setNewAddress({ ...newAddress, country: e.target.value })}
                      placeholder="Sweden"
                      className="w-full h-11 px-4 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]" 
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={newAddress.isDefault}
                    onChange={(e) => setNewAddress({ ...newAddress, isDefault: e.target.checked })}
                    className="w-4 h-4 rounded border-[#d2d2d7] text-[#0071e3] focus:ring-[#0071e3]"
                  />
                  <span className="text-[13px] text-[#1d1d1f]">Set as default address</span>
                </label>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddAddress(false)}
                    className="flex-1 h-10 bg-[#f5f5f7] text-[#1d1d1f] text-[14px] font-medium rounded-xl hover:bg-[#e8e8ed] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddAddress}
                    disabled={!newAddress.street || !newAddress.city || !newAddress.country}
                    className="flex-1 h-10 bg-[#0071e3] text-white text-[14px] font-medium rounded-xl hover:bg-[#0077ed] transition-colors disabled:bg-[#d2d2d7]"
                  >
                    Add Address
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowAddAddress(true)}
                className="w-full h-12 flex items-center justify-center gap-2 bg-white border-2 border-dashed border-[#d2d2d7]/50 rounded-2xl text-[14px] font-medium text-[#0071e3] hover:border-[#0071e3] hover:bg-[#0071e3]/5 transition-all"
              >
                <Plus className="w-4 h-4" />
                Add Address
              </button>
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
                className="w-full h-11 px-4 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              >
                <option value="">Select a price tier</option>
                {availablePriceTiers.map(tier => (
                  <option key={tier.id} value={tier.id}>{tier.name}</option>
                ))}
              </select>
              <p className="text-[12px] text-[#86868b] mt-1.5">
                Price tiers can be configured in <Link href="/settings/pricing" className="text-[#0071e3] hover:underline">Settings → Pricing</Link>
              </p>
              {availablePriceTiers.length === 0 && (
                <div className="mt-3 p-3 bg-[#ff9500]/5 border border-[#ff9500]/20 rounded-lg">
                  <p className="text-[12px] text-[#ff9500]">
                    No price tiers found. <Link href="/settings/pricing" className="underline font-medium">Create price tiers in Settings → Pricing</Link>
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Additional Discount (%)</label>
              <input 
                type="number" 
                name="customDiscount" 
                value={form.customDiscount} 
                onChange={handleChange}
                min="0"
                max="100"
                step="0.5"
                className="w-full h-11 px-4 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]" 
              />
              <p className="text-[12px] text-[#86868b] mt-1.5">
                Applied on top of the price tier
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Payment Terms</label>
                <select 
                  name="paymentTerms" 
                  value={form.paymentTerms} 
                  onChange={handleChange}
                  className="w-full h-11 px-4 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                >
                  <option value="PREPAID">Prepaid</option>
                  <option value="NET15">Net 15</option>
                  <option value="NET30">Net 30</option>
                  <option value="NET45">Net 45</option>
                  <option value="NET60">Net 60</option>
                </select>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Invoice Currency</label>
                <select 
                  name="currency" 
                  value={form.currency} 
                  onChange={handleChange}
                  className="w-full h-11 px-4 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                >
                  <option value="EUR">EUR (€)</option>
                  <option value="USD">USD ($)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="SEK">SEK (kr)</option>
                  <option value="RMB">RMB (¥)</option>
                </select>
              </div>
            </div>

            <div className="p-4 bg-[#f5f5f7] rounded-xl">
              <p className="text-[13px] text-[#86868b]">
                <strong className="text-[#1d1d1f]">Tip:</strong> You can define custom price tiers in Settings → Pricing. 
                Each tier can have its own markup/discount percentage that applies to all products.
              </p>
            </div>
          </div>
        )}

        {/* Custom Fields Tab */}
        {activeTab === 'custom' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-[15px] font-semibold text-[#1d1d1f]">Custom Fields</h3>
                  <p className="text-[12px] text-[#86868b] mt-0.5">
                    Add any additional information you need for this customer
                  </p>
                </div>
              </div>
              
              {customFields.length > 0 ? (
                <div className="space-y-3 mb-4">
                  {customFields.map((field) => (
                    <div key={field.id} className="flex items-start gap-3 p-3 bg-[#f5f5f7] rounded-xl">
                      <GripVertical className="w-4 h-4 text-[#86868b] mt-3 flex-shrink-0 cursor-move" />
                      <div className="flex-1 space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={field.label}
                            onChange={(e) => updateCustomField(field.id, { label: e.target.value })}
                            placeholder="Field name (e.g., Preferred contact time)"
                            className="flex-1 h-9 px-3 bg-white rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                          />
                          <select
                            value={field.type}
                            onChange={(e) => updateCustomField(field.id, { type: e.target.value as CustomField['type'] })}
                            className="h-9 px-3 bg-white rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                          >
                            <option value="text">Text</option>
                            <option value="textarea">Long Text</option>
                            <option value="number">Number</option>
                            <option value="date">Date</option>
                            <option value="email">Email</option>
                            <option value="url">URL</option>
                          </select>
                        </div>
                        {field.type === 'textarea' ? (
                          <textarea
                            value={field.value}
                            onChange={(e) => updateCustomField(field.id, { value: e.target.value })}
                            placeholder="Value"
                            rows={2}
                            className="w-full px-3 py-2 bg-white rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0071e3] resize-none"
                          />
                        ) : (
                          <input
                            type={field.type}
                            value={field.value}
                            onChange={(e) => updateCustomField(field.id, { value: e.target.value })}
                            placeholder="Value"
                            className="w-full h-9 px-3 bg-white rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                          />
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCustomField(field.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#ff3b30]/10 text-[#ff3b30] transition-colors mt-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 mb-4">
                  <p className="text-[14px] text-[#86868b]">No custom fields added yet</p>
                  <p className="text-[12px] text-[#86868b] mt-1">
                    Add fields like "Account Manager", "Credit Limit", "Contract End Date", etc.
                  </p>
                </div>
              )}
              
              <button
                type="button"
                onClick={addCustomField}
                className="w-full h-10 flex items-center justify-center gap-2 border-2 border-dashed border-[#d2d2d7] hover:border-[#0071e3] rounded-xl text-[13px] text-[#86868b] hover:text-[#0071e3] transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Custom Field
              </button>
            </div>

            <div className="bg-[#f5f5f7] rounded-2xl p-5">
              <h4 className="text-[14px] font-semibold text-[#1d1d1f] mb-2">Field Ideas</h4>
              <div className="flex flex-wrap gap-2">
                {['Account Manager', 'Credit Limit', 'Contract End Date', 'Website', 'Industry', 'Company Size', 'Source', 'Notes'].map(suggestion => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => {
                      setCustomFields(prev => [...prev, {
                        id: `field-${Date.now()}`,
                        label: suggestion,
                        value: '',
                        type: suggestion === 'Credit Limit' ? 'number' : 
                              suggestion === 'Contract End Date' ? 'date' :
                              suggestion === 'Website' ? 'url' :
                              suggestion === 'Notes' ? 'textarea' : 'text',
                      }])
                    }}
                    className="px-3 py-1.5 bg-white rounded-lg text-[12px] text-[#1d1d1f] hover:bg-[#0071e3] hover:text-white transition-colors"
                  >
                    + {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-6 text-[13px] text-[#ff3b30] bg-[#ff3b30]/10 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <Link 
            href="/customers" 
            className="flex-1 h-11 flex items-center justify-center bg-white border border-[#d2d2d7]/50 text-[#1d1d1f] text-[14px] font-medium rounded-xl hover:bg-[#f5f5f7] transition-colors"
          >
            Cancel
          </Link>
          <button 
            type="submit" 
            disabled={loading || !form.companyName}
            className="flex-1 h-11 flex items-center justify-center bg-[#0071e3] text-white text-[14px] font-medium rounded-xl hover:bg-[#0077ed] transition-colors disabled:bg-[#d2d2d7]"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Customer'}
          </button>
        </div>
      </form>
    </div>
  )
}
