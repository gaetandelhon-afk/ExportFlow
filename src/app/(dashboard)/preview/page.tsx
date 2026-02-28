'use client'

import { useState, useEffect } from 'react'
import { usePreview } from '@/contexts/PreviewContext'
import { Search, User, ArrowRight, Eye, DollarSign } from 'lucide-react'

interface Customer {
  id: string
  companyName: string
  contactName: string | null
  email: string
  country: string | null
  currency: string | null
  priceType: string | null
  paymentTerms: string | null
  _count?: {
    orders: number
  }
}

export default function PreviewSelectPage() {
  const { startPreview, isPreviewMode, previewCustomer } = usePreview()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedPriceType, setSelectedPriceType] = useState<string>('all')
  
  useEffect(() => {
    loadCustomers()
  }, [])
  
  async function loadCustomers() {
    setLoading(true)
    try {
      const res = await fetch('/api/customers/list')
      const data = await res.json()
      setCustomers(data.customers || [])
    } catch (error) {
      console.error('Error loading customers:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const priceTypes = [...new Set(customers.map(c => c.priceType).filter(Boolean))]
  
  const filteredCustomers = customers.filter(c => {
    const matchesSearch = 
      c.companyName.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
    const matchesPriceType = selectedPriceType === 'all' || c.priceType === selectedPriceType
    return matchesSearch && matchesPriceType
  })
  
  function handleSelect(customer: Customer) {
    startPreview({
      id: customer.id,
      name: customer.companyName,
      email: customer.email,
      currency: customer.currency || undefined,
      priceType: customer.priceType || undefined,
      paymentTerms: customer.paymentTerms || undefined,
    })
  }
  
  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-[#ff9500]/10 rounded-lg">
            <Eye className="w-6 h-6 text-[#ff9500]" />
          </div>
          <h1 className="text-2xl font-semibold text-[#1d1d1f]">Customer Preview</h1>
        </div>
        <p className="text-[#86868b]">
          Select a customer to see the portal exactly as they do.
          You will see their prices, catalog, and user experience.
        </p>
      </div>
      
      {/* Info box if already in preview */}
      {isPreviewMode && previewCustomer && (
        <div className="mb-6 p-4 bg-[#ff9500]/10 border border-[#ff9500]/30 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-[#1d1d1f]">
                Active preview: {previewCustomer.name}
              </div>
              <div className="text-sm text-[#86868b]">
                You can select another customer or continue with this one
              </div>
            </div>
            <a
              href="/catalog"
              className="px-4 py-2 bg-[#ff9500] text-white rounded-lg hover:bg-[#e68600] transition font-medium"
            >
              Continue →
            </a>
          </div>
        </div>
      )}
      
      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#86868b]" />
          <input
            type="text"
            placeholder="Search for a customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-[#d2d2d7] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:border-transparent"
          />
        </div>
        
        {priceTypes.length > 0 && (
          <select
            value={selectedPriceType}
            onChange={(e) => setSelectedPriceType(e.target.value)}
            className="px-4 py-2.5 border border-[#d2d2d7] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
          >
            <option value="all">All price types</option>
            {priceTypes.map(type => (
              <option key={type} value={type!}>{type}</option>
            ))}
          </select>
        )}
      </div>
      
      {/* Customer list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-20 bg-[#f5f5f7] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="text-center py-12 text-[#86868b]">
          No customers found
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCustomers.map(customer => (
            <button
              key={customer.id}
              onClick={() => handleSelect(customer)}
              className="w-full flex items-center gap-4 p-4 bg-white border border-[#d2d2d7] rounded-xl hover:border-[#ff9500] hover:bg-[#ff9500]/5 transition group text-left"
            >
              <div className="w-12 h-12 bg-[#f5f5f7] rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-6 h-6 text-[#86868b]" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="font-medium text-[#1d1d1f] truncate">{customer.companyName}</div>
                <div className="text-sm text-[#86868b] truncate">{customer.email}</div>
              </div>
              
              <div className="flex items-center gap-4">
                {customer.priceType && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-[#0071e3]/10 text-[#0071e3] rounded text-sm">
                    <DollarSign className="w-3 h-3" />
                    {customer.priceType}
                  </div>
                )}
                
                {customer.currency && (
                  <div className="text-sm text-[#86868b] px-2 py-1 bg-[#f5f5f7] rounded">
                    {customer.currency}
                  </div>
                )}
                
                {customer.country && (
                  <div className="text-sm text-[#86868b]">
                    {customer.country}
                  </div>
                )}
                
                {customer._count && (
                  <div className="text-sm text-[#86868b]">
                    {customer._count.orders} orders
                  </div>
                )}
                
                <ArrowRight className="w-5 h-5 text-[#d2d2d7] group-hover:text-[#ff9500] transition" />
              </div>
            </button>
          ))}
        </div>
      )}
      
      {/* Info */}
      <div className="mt-8 p-4 bg-[#f5f5f7] rounded-xl">
        <h3 className="font-medium text-[#1d1d1f] mb-2">💡 About preview mode</h3>
        <ul className="text-sm text-[#86868b] space-y-1">
          <li>• You will see prices according to the customer&apos;s price type</li>
          <li>• The catalog will be filtered as for this customer</li>
          <li>• Orders placed in preview mode are NOT saved</li>
          <li>• An orange banner indicates you are in preview mode</li>
        </ul>
      </div>
    </div>
  )
}
