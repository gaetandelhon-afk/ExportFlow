'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useDistributor } from '@/contexts/DistributorContext'
import { 
  ChevronLeft, Plus, MapPin, Star, Trash2, Edit2, 
  Check, X
} from 'lucide-react'

export default function AddressesPage() {
  const { addresses, addAddress, updateAddress, deleteAddress, setDefaultAddress } = useDistributor()
  
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    label: '',
    company: '',
    contactName: '',
    street: '',
    city: '',
    postalCode: '',
    country: '',
    phone: '',
  })

  const resetForm = () => {
    setFormData({
      label: '',
      company: '',
      contactName: '',
      street: '',
      city: '',
      postalCode: '',
      country: '',
      phone: '',
    })
    setShowForm(false)
    setEditingId(null)
  }

  const handleEdit = (address: typeof addresses[0]) => {
    setFormData({
      label: address.label,
      company: address.company,
      contactName: address.contactName,
      street: address.street,
      city: address.city,
      postalCode: address.postalCode,
      country: address.country,
      phone: address.phone || '',
    })
    setEditingId(address.id)
    setShowForm(true)
  }

  const handleSubmit = () => {
    if (!formData.label || !formData.company || !formData.street || !formData.city || !formData.country) {
      return
    }

    if (editingId) {
      updateAddress(editingId, formData)
    } else {
      addAddress(formData)
    }
    resetForm()
  }

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this address?')) {
      deleteAddress(id)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link 
        href="/account"
        className="inline-flex items-center gap-1 text-[13px] mb-6"
        style={{ color: 'var(--color-brand-primary)' }}
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Account
      </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 
              className="text-[28px] font-semibold tracking-tight"
              style={{ color: 'var(--color-text-primary)' }}
            >
              My Addresses
            </h1>
            <p 
              className="text-[15px] mt-1"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {addresses?.length || 0} saved addresses
            </p>
          </div>
          
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="btn-primary"
            >
              <Plus className="w-4 h-4" />
              Add Address
            </button>
          )}
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <div className="card p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 
                className="text-[15px] font-semibold"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {editingId ? 'Edit Address' : 'New Address'}
              </h2>
              <button onClick={resetForm}>
                <X className="w-5 h-5" style={{ color: 'var(--color-text-secondary)' }} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  Label *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Main Warehouse"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  Company Name *
                </label>
                <input
                  type="text"
                  placeholder="Company name"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  Contact Name
                </label>
                <input
                  type="text"
                  placeholder="Contact person"
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  Phone
                </label>
                <input
                  type="text"
                  placeholder="+1 234 567 890"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="input-field"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  Street Address *
                </label>
                <input
                  type="text"
                  placeholder="Street address"
                  value={formData.street}
                  onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  City *
                </label>
                <input
                  type="text"
                  placeholder="City"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  Postal Code
                </label>
                <input
                  type="text"
                  placeholder="Postal code"
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                  className="input-field"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  Country *
                </label>
                <input
                  type="text"
                  placeholder="Country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={resetForm} className="btn-secondary">
                Cancel
              </button>
              <button onClick={handleSubmit} className="btn-primary">
                <Check className="w-4 h-4" />
                {editingId ? 'Save Changes' : 'Add Address'}
              </button>
            </div>
          </div>
        )}

        {/* Address List */}
        {(!addresses || addresses.length === 0) ? (
          <div className="card p-12 text-center">
            <MapPin className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-text-tertiary)' }} />
            <p className="text-[15px] mb-2" style={{ color: 'var(--color-text-primary)' }}>
              No addresses saved
            </p>
            <p className="text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
              Add your first shipping address
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {addresses.map((address) => (
              <div 
                key={address.id} 
                className="card p-5"
                style={{ 
                  border: address.isDefault ? '2px solid var(--color-brand-primary)' : undefined
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: address.isDefault ? 'var(--color-brand-primary)' : 'var(--color-bg-tertiary)' }}
                    >
                      <MapPin className="w-5 h-5" style={{ color: address.isDefault ? 'white' : 'var(--color-text-secondary)' }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p 
                          className="text-[15px] font-semibold"
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          {address.label}
                        </p>
                        {address.isDefault && (
                          <span 
                            className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: 'rgba(0, 113, 227, 0.1)', color: 'var(--color-brand-primary)' }}
                          >
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-[13px]" style={{ color: 'var(--color-text-primary)' }}>
                        {address.company}
                      </p>
                      <p className="text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
                        {address.contactName}
                      </p>
                      <p className="text-[13px] mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                        {address.street}
                      </p>
                      <p className="text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
                        {address.postalCode} {address.city}
                      </p>
                      <p className="text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
                        {address.country}
                      </p>
                      {address.phone && (
                        <p className="text-[13px] mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                          {address.phone}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {!address.isDefault && (
                      <button
                        onClick={() => setDefaultAddress(address.id)}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        title="Set as default"
                      >
                        <Star className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(address)}
                      className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
                    </button>
                    <button
                      onClick={() => handleDelete(address.id)}
                      className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" style={{ color: 'var(--color-error)' }} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  )
}