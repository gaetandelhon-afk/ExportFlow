'use client'

import { useState } from 'react'
import { Check, Plus, MapPin } from 'lucide-react'
import { Address, useDistributor } from '@/contexts/DistributorContext'

interface AddressSelectorProps {
  selectedId: string | null
  onSelect: (id: string) => void
  type: 'shipping' | 'billing'
}

export default function AddressSelector({ selectedId, onSelect, type }: AddressSelectorProps) {
  const { addresses, addAddress } = useDistributor()
  const [showAddForm, setShowAddForm] = useState(false)
  const [newAddress, setNewAddress] = useState<Omit<Address, 'id'>>({
    label: '',
    company: '',
    contactName: '',
    street: '',
    city: '',
    postalCode: '',
    country: '',
    phone: '',
    isDefault: false,
  })

  const handleAddAddress = () => {
    if (newAddress.label && newAddress.street && newAddress.city && newAddress.country) {
      addAddress(newAddress)
      setNewAddress({
        label: '',
        company: '',
        contactName: '',
        street: '',
        city: '',
        postalCode: '',
        country: '',
        phone: '',
        isDefault: false,
      })
      setShowAddForm(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 
          className="text-[14px] font-medium"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {type === 'shipping' ? 'Shipping Address' : 'Billing Address'}
        </h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="text-[12px] font-medium flex items-center gap-1"
          style={{ color: 'var(--color-brand-primary)' }}
        >
          <Plus className="w-3 h-3" />
          Add New
        </button>
      </div>

      {/* Address List */}
      <div className="space-y-2 mb-3">
        {addresses.map((address) => (
          <button
            key={address.id}
            onClick={() => onSelect(address.id)}
            className="w-full text-left p-3 rounded-xl transition-all"
            style={{ 
              backgroundColor: selectedId === address.id ? 'rgba(0, 113, 227, 0.05)' : 'var(--color-bg-secondary)',
              border: selectedId === address.id ? '2px solid var(--color-brand-primary)' : '1px solid rgba(210, 210, 215, 0.3)'
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-2">
                <MapPin 
                  className="w-4 h-4 mt-0.5 shrink-0"
                  style={{ color: selectedId === address.id ? 'var(--color-brand-primary)' : 'var(--color-text-secondary)' }}
                />
                <div>
                  <p 
                    className="text-[13px] font-medium"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {address.label}
                    {address.isDefault && (
                      <span 
                        className="ml-2 text-[10px] px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: 'rgba(0, 113, 227, 0.1)', color: 'var(--color-brand-primary)' }}
                      >
                        Default
                      </span>
                    )}
                  </p>
                  <p 
                    className="text-[12px] mt-0.5"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {address.company}
                  </p>
                  <p 
                    className="text-[12px]"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {address.street}, {address.city}
                  </p>
                  <p 
                    className="text-[12px]"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {address.postalCode} {address.country}
                  </p>
                </div>
              </div>
              {selectedId === address.id && (
                <Check 
                  className="w-5 h-5"
                  style={{ color: 'var(--color-brand-primary)' }}
                />
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Add Address Form */}
      {showAddForm && (
        <div 
          className="p-4 rounded-xl mb-3"
          style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
        >
          <p 
            className="text-[13px] font-medium mb-3"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Add New Address
          </p>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Label (e.g., Main Office)"
              value={newAddress.label}
              onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
              className="input-field text-[13px] h-9"
            />
            <input
              type="text"
              placeholder="Company Name"
              value={newAddress.company}
              onChange={(e) => setNewAddress({ ...newAddress, company: e.target.value })}
              className="input-field text-[13px] h-9"
            />
            <input
              type="text"
              placeholder="Contact Name"
              value={newAddress.contactName}
              onChange={(e) => setNewAddress({ ...newAddress, contactName: e.target.value })}
              className="input-field text-[13px] h-9"
            />
            <input
              type="text"
              placeholder="Phone"
              value={newAddress.phone || ''}
              onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
              className="input-field text-[13px] h-9"
            />
            <input
              type="text"
              placeholder="Street Address"
              value={newAddress.street}
              onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })}
              className="input-field text-[13px] h-9 col-span-2"
            />
            <input
              type="text"
              placeholder="City"
              value={newAddress.city}
              onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
              className="input-field text-[13px] h-9"
            />
            <input
              type="text"
              placeholder="Postal Code"
              value={newAddress.postalCode}
              onChange={(e) => setNewAddress({ ...newAddress, postalCode: e.target.value })}
              className="input-field text-[13px] h-9"
            />
            <input
              type="text"
              placeholder="Country"
              value={newAddress.country}
              onChange={(e) => setNewAddress({ ...newAddress, country: e.target.value })}
              className="input-field text-[13px] h-9 col-span-2"
            />
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleAddAddress}
              className="btn-primary text-[12px] h-9 px-4"
            >
              Save Address
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="btn-secondary text-[12px] h-9 px-4"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {addresses.length === 0 && !showAddForm && (
        <p 
          className="text-[13px] text-center py-4"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          No addresses saved. Add one above.
        </p>
      )}
    </div>
  )
}