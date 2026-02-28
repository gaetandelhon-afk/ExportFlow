'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ChevronLeft, Loader2, Factory, Search, 
  Package, Globe, FileText, CheckCircle
} from 'lucide-react'

interface Order {
  id: string
  orderNumber: string
  status: string
  customer: {
    companyName: string
  }
  lines: unknown[]
  totalAmount: string
  createdAt: string
}

const languageOptions = [
  { value: 'en', label: 'English', icon: '🇬🇧' },
  { value: 'zh', label: '中文 (Chinese)', icon: '🇨🇳' },
  { value: 'en-zh', label: 'Bilingual (EN/CN)', icon: '🌐' },
]

export default function NewFactoryPackingListPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [language, setLanguage] = useState('en')
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    loadOrders()
  }, [])

  async function loadOrders() {
    try {
      const res = await fetch('/api/orders')
      if (res.ok) {
        const data = await res.json()
        setOrders(data.orders || [])
      }
    } catch (err) {
      console.error('Failed to load orders:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredOrders = orders.filter(order => 
    order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.customer.companyName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  async function handleCreate() {
    if (!selectedOrder) return
    
    setCreating(true)
    setError('')

    try {
      const res = await fetch('/api/packing-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'FACTORY',
          orderId: selectedOrder.id,
          language,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        router.push(`/packing-lists/${data.packingList.id}`)
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to create packing list')
      }
    } catch (err) {
      console.error('Failed to create packing list:', err)
      setError('Failed to create packing list')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/packing-lists/factory"
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#f5f5f7] hover:bg-[#e8e8ed] transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-[#1d1d1f]" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-[#1d1d1f]">New Factory Packing List</h1>
          <p className="text-[#86868b]">Select an order to generate a factory packing list</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Order Selection */}
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-6">
          <h2 className="text-lg font-semibold text-[#1d1d1f] mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-[#ff9500]" />
            Select Order
          </h2>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 bg-[#f5f5f7] border-0 rounded-xl text-[14px] text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#ff9500]"
            />
          </div>

          {/* Orders List */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[#86868b]" />
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-8 text-[#86868b]">
                {searchQuery ? 'No orders match your search' : 'No orders available'}
              </div>
            ) : (
              filteredOrders.map(order => (
                  <button
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className={`w-full p-4 rounded-xl border text-left transition-all ${
                      selectedOrder?.id === order.id
                        ? 'border-[#ff9500] bg-[#ff9500]/5'
                        : 'border-[#d2d2d7]/30 hover:border-[#ff9500]/50 hover:bg-[#f5f5f7]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-[#1d1d1f]">{order.orderNumber}</div>
                        <div className="text-sm text-[#86868b]">{order.customer.companyName}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-[#86868b]">{order.lines.length} items</div>
                        {selectedOrder?.id === order.id && (
                          <CheckCircle className="w-5 h-5 text-[#ff9500] mt-1 ml-auto" />
                        )}
                      </div>
                    </div>
                  </button>
              ))
            )}
          </div>
        </div>

        {/* Settings */}
        <div className="space-y-6">
          {/* Language Selection */}
          <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-6">
            <h2 className="text-lg font-semibold text-[#1d1d1f] mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-[#0071e3]" />
              Document Language
            </h2>

            <div className="space-y-2">
              {languageOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => setLanguage(option.value)}
                  className={`w-full p-4 rounded-xl border text-left transition-all flex items-center gap-3 ${
                    language === option.value
                      ? 'border-[#0071e3] bg-[#0071e3]/5'
                      : 'border-[#d2d2d7]/30 hover:border-[#0071e3]/50'
                  }`}
                >
                  <span className="text-2xl">{option.icon}</span>
                  <span className="font-medium text-[#1d1d1f]">{option.label}</span>
                  {language === option.value && (
                    <CheckCircle className="w-5 h-5 text-[#0071e3] ml-auto" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Summary */}
          {selectedOrder && (
            <div className="bg-[#ff9500]/5 rounded-2xl border border-[#ff9500]/30 p-6">
              <h2 className="text-lg font-semibold text-[#1d1d1f] mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#ff9500]" />
                Summary
              </h2>

              <div className="space-y-2 text-[14px]">
                <div className="flex justify-between">
                  <span className="text-[#86868b]">Order:</span>
                  <span className="font-medium text-[#1d1d1f]">{selectedOrder.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#86868b]">Customer:</span>
                  <span className="font-medium text-[#1d1d1f]">{selectedOrder.customer.companyName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#86868b]">Items:</span>
                  <span className="font-medium text-[#1d1d1f]">{selectedOrder.lines.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#86868b]">Language:</span>
                  <span className="font-medium text-[#1d1d1f]">
                    {languageOptions.find(l => l.value === language)?.label}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-4 bg-[#ff3b30]/10 border border-[#ff3b30]/30 rounded-xl text-[#ff3b30] text-[14px]">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Link
              href="/packing-lists/factory"
              className="flex-1 px-4 py-3 border border-[#d2d2d7] rounded-xl text-[14px] font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] transition-colors text-center"
            >
              Cancel
            </Link>
            <button
              onClick={handleCreate}
              disabled={!selectedOrder || creating}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#ff9500] text-white rounded-xl text-[14px] font-medium hover:bg-[#e08600] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Factory className="w-4 h-4" />
                  Create Packing List
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
