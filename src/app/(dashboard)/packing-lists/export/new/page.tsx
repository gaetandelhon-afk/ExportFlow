'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ChevronLeft, Loader2, Ship, Search, 
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

interface Shipment {
  id: string
  shipmentNumber: string
  status: string
  customerName: string
  orderCount: number
  createdAt: string
}

type SourceType = 'order' | 'shipment'

const languageOptions = [
  { value: 'en', label: 'English', icon: '🇬🇧' },
  { value: 'zh', label: '中文 (Chinese)', icon: '🇨🇳' },
  { value: 'en-zh', label: 'Bilingual (EN/CN)', icon: '🌐' },
]

export default function NewExportPackingListPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [sourceType, setSourceType] = useState<SourceType>('order')
  const [orders, setOrders] = useState<Order[]>([])
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null)
  const [language, setLanguage] = useState('en')
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [ordersRes, shipmentsRes] = await Promise.all([
        fetch('/api/orders'),
        fetch('/api/shipments').catch(() => ({ ok: false, json: () => Promise.resolve({ shipments: [] }) }))
      ])
      
      if (ordersRes.ok) {
        const data = await ordersRes.json()
        setOrders(data.orders || [])
      }
      
      if (shipmentsRes.ok) {
        const data = await shipmentsRes.json()
        setShipments(data.shipments || [])
      }
    } catch (err) {
      console.error('Failed to load data:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredOrders = orders.filter(order => 
    order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.customer.companyName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredShipments = shipments.filter(shipment => 
    shipment.shipmentNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    shipment.customerName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  async function handleCreate() {
    if (sourceType === 'order' && !selectedOrder) return
    if (sourceType === 'shipment' && !selectedShipment) return
    
    setCreating(true)
    setError('')

    try {
      const res = await fetch('/api/packing-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'EXPORT',
          orderId: sourceType === 'order' ? selectedOrder?.id : null,
          shipmentId: sourceType === 'shipment' ? selectedShipment?.id : null,
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

  const isValid = (sourceType === 'order' && selectedOrder) || (sourceType === 'shipment' && selectedShipment)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/packing-lists/export"
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#f5f5f7] hover:bg-[#e8e8ed] transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-[#1d1d1f]" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-[#1d1d1f]">New Export Packing List</h1>
          <p className="text-[#86868b]">Select an order or shipment to generate an export packing list</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Source Selection */}
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-6">
          {/* Source Type Toggle */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => { setSourceType('order'); setSelectedShipment(null) }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[14px] font-medium transition-colors ${
                sourceType === 'order'
                  ? 'bg-[#34c759] text-white'
                  : 'bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed]'
              }`}
            >
              <Package className="w-4 h-4" />
              From Order
            </button>
            <button
              onClick={() => { setSourceType('shipment'); setSelectedOrder(null) }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[14px] font-medium transition-colors ${
                sourceType === 'shipment'
                  ? 'bg-[#34c759] text-white'
                  : 'bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed]'
              }`}
            >
              <Ship className="w-4 h-4" />
              From Shipment
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" />
            <input
              type="text"
              placeholder={sourceType === 'order' ? 'Search orders...' : 'Search shipments...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 bg-[#f5f5f7] border-0 rounded-xl text-[14px] text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#34c759]"
            />
          </div>

          {/* List */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[#86868b]" />
              </div>
            ) : sourceType === 'order' ? (
              filteredOrders.length === 0 ? (
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
                        ? 'border-[#34c759] bg-[#34c759]/5'
                        : 'border-[#d2d2d7]/30 hover:border-[#34c759]/50 hover:bg-[#f5f5f7]'
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
                          <CheckCircle className="w-5 h-5 text-[#34c759] mt-1 ml-auto" />
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )
            ) : (
              filteredShipments.length === 0 ? (
                <div className="text-center py-8 text-[#86868b]">
                  {searchQuery ? 'No shipments match your search' : 'No shipments available'}
                </div>
              ) : (
                filteredShipments.map(shipment => (
                  <button
                    key={shipment.id}
                    onClick={() => setSelectedShipment(shipment)}
                    className={`w-full p-4 rounded-xl border text-left transition-all ${
                      selectedShipment?.id === shipment.id
                        ? 'border-[#34c759] bg-[#34c759]/5'
                        : 'border-[#d2d2d7]/30 hover:border-[#34c759]/50 hover:bg-[#f5f5f7]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-[#1d1d1f]">{shipment.shipmentNumber}</div>
                        <div className="text-sm text-[#86868b]">{shipment.customerName}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-[#86868b]">{shipment.orderCount} orders</div>
                        {selectedShipment?.id === shipment.id && (
                          <CheckCircle className="w-5 h-5 text-[#34c759] mt-1 ml-auto" />
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )
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
          {isValid && (
            <div className="bg-[#34c759]/5 rounded-2xl border border-[#34c759]/30 p-6">
              <h2 className="text-lg font-semibold text-[#1d1d1f] mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#34c759]" />
                Summary
              </h2>

              <div className="space-y-2 text-[14px]">
                {sourceType === 'order' && selectedOrder && (
                  <>
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
                  </>
                )}
                {sourceType === 'shipment' && selectedShipment && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-[#86868b]">Shipment:</span>
                      <span className="font-medium text-[#1d1d1f]">{selectedShipment.shipmentNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#86868b]">Customer:</span>
                      <span className="font-medium text-[#1d1d1f]">{selectedShipment.customerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#86868b]">Orders:</span>
                      <span className="font-medium text-[#1d1d1f]">{selectedShipment.orderCount}</span>
                    </div>
                  </>
                )}
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
              href="/packing-lists/export"
              className="flex-1 px-4 py-3 border border-[#d2d2d7] rounded-xl text-[14px] font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] transition-colors text-center"
            >
              Cancel
            </Link>
            <button
              onClick={handleCreate}
              disabled={!isValid || creating}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#34c759] text-white rounded-xl text-[14px] font-medium hover:bg-[#30b553] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Ship className="w-4 h-4" />
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
