'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Ship, Plus, Search, Filter, Package, 
  Loader2, MoreHorizontal, FileText, 
  Receipt, Trash2, Edit3, Eye, Plane, Train, Truck, Factory,
  LayoutList, GanttChartSquare, Archive, CheckCircle
} from 'lucide-react'
import { useLocalization } from '@/hooks/useLocalization'
import { useTheme } from '@/contexts/ThemeContext'
import ShipmentGantt from '@/components/ShipmentGantt'

interface Order {
  id: string
  orderNumber: string
  customerName: string
  totalAmount: number
  status: string
  createdAt: string
}

type TransportMethod = 'SEA_FREIGHT' | 'AIR_FREIGHT' | 'RAIL_FREIGHT' | 'ROAD_FREIGHT' | 'EXPRESS_COURIER' | 'FACTORY_PICKUP' | 'OTHER'

interface Shipment {
  id: string
  shipmentNumber: string
  name: string | null
  status: 'DRAFT' | 'PREPARING' | 'LOADING' | 'SHIPPED' | 'DELIVERED'
  transportMethod: TransportMethod
  carrierName: string | null
  trackingNumber: string | null
  originLocation: string | null
  destinationLocation: string | null
  containerNumber: string | null
  blNumber: string | null
  estimatedLoadingDate: string | null
  estimatedArrivalDate: string | null
  orders: Order[]
  createdAt: string
}

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  DRAFT: { bg: 'bg-[#86868b]/10', text: 'text-[#86868b]', label: 'Draft' },
  PREPARING: { bg: 'bg-[#ff9500]/10', text: 'text-[#ff9500]', label: 'Preparing' },
  LOADING: { bg: 'bg-[#5856d6]/10', text: 'text-[#5856d6]', label: 'Loading' },
  SHIPPED: { bg: 'bg-[#0071e3]/10', text: 'text-[#0071e3]', label: 'Shipped' },
  DELIVERED: { bg: 'bg-[#34c759]/10', text: 'text-[#34c759]', label: 'Delivered' },
}

const transportMethodConfig: Record<TransportMethod, { 
  label: string
  shortLabel: string
  icon: typeof Ship
  color: string
}> = {
  SEA_FREIGHT: { label: 'Sea Freight', shortLabel: 'Sea', icon: Ship, color: '#0071e3' },
  AIR_FREIGHT: { label: 'Air Freight', shortLabel: 'Air', icon: Plane, color: '#5856d6' },
  RAIL_FREIGHT: { label: 'Rail Freight', shortLabel: 'Rail', icon: Train, color: '#ff9500' },
  ROAD_FREIGHT: { label: 'Road Freight', shortLabel: 'Road', icon: Truck, color: '#34c759' },
  EXPRESS_COURIER: { label: 'Express Courier', shortLabel: 'Express', icon: Package, color: '#ff3b30' },
  FACTORY_PICKUP: { label: 'Factory Pickup', shortLabel: 'Pickup', icon: Factory, color: '#86868b' },
  OTHER: { label: 'Other', shortLabel: 'Other', icon: MoreHorizontal, color: '#1d1d1f' },
}

export default function ShipmentsPage() {
  const { currencySymbol, isLoaded } = useLocalization()
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [availableOrders, setAvailableOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [methodFilter, setMethodFilter] = useState('')
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'gantt'>('gantt')
  const [archiving, setArchiving] = useState<string | null>(null)

  useEffect(() => {
    fetchShipments()
    fetchAvailableOrders()
  }, [])

  const fetchShipments = async () => {
    try {
      const res = await fetch('/api/shipments')
      if (res.ok) {
        const data = await res.json()
        setShipments(data.shipments || [])
      }
    } catch (error) {
      console.error('Failed to fetch shipments:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableOrders = async () => {
    try {
      const res = await fetch('/api/orders?status=CONFIRMED,PREPARING,READY')
      if (res.ok) {
        const data = await res.json()
        setAvailableOrders(data.orders || [])
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error)
    }
  }

  const handleArchive = async (shipmentId: string) => {
    setArchiving(shipmentId)
    try {
      const res = await fetch(`/api/shipments/${shipmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archivedAt: new Date().toISOString() })
      })
      if (res.ok) {
        setShipments(prev => prev.filter(s => s.id !== shipmentId))
        setActiveMenu(null)
      }
    } catch (error) {
      console.error('Failed to archive shipment:', error)
    } finally {
      setArchiving(null)
    }
  }

  const filteredShipments = shipments.filter(shipment => {
    const matchesSearch = !searchQuery || 
      shipment.shipmentNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (shipment.name && shipment.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (shipment.containerNumber && shipment.containerNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (shipment.carrierName && shipment.carrierName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (shipment.trackingNumber && shipment.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesStatus = !statusFilter || shipment.status === statusFilter
    const matchesMethod = !methodFilter || shipment.transportMethod === methodFilter
    
    return matchesSearch && matchesStatus && matchesMethod
  })

  const getTotalAmount = (orders: Order[]) => {
    return orders.reduce((sum, order) => sum + order.totalAmount, 0)
  }

  const methodCounts = shipments.reduce((acc, s) => {
    const method = s.transportMethod || 'SEA_FREIGHT'
    acc[method] = (acc[method] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  if (!isLoaded || loading) {
    return (
      <div className="max-w-6xl mx-auto flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#0071e3]" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">Shipments</h1>
          <p className="text-[15px] text-[#86868b] mt-1">
            Manage all transport methods: sea, air, rail, road, and more
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center bg-[#f5f5f7] rounded-xl p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 h-8 rounded-lg text-[13px] font-medium transition-colors ${
                viewMode === 'list' 
                  ? 'bg-white text-[#1d1d1f] shadow-sm' 
                  : 'text-[#86868b] hover:text-[#1d1d1f]'
              }`}
            >
              <LayoutList className="w-4 h-4" />
              List
            </button>
            <button
              onClick={() => setViewMode('gantt')}
              className={`flex items-center gap-1.5 px-3 h-8 rounded-lg text-[13px] font-medium transition-colors ${
                viewMode === 'gantt' 
                  ? 'bg-white text-[#1d1d1f] shadow-sm' 
                  : 'text-[#86868b] hover:text-[#1d1d1f]'
              }`}
            >
              <GanttChartSquare className="w-4 h-4" />
              Timeline
            </button>
          </div>

          {/* Archives Link */}
          <Link
            href="/shipments/archives"
            className="inline-flex items-center gap-2 px-4 h-10 rounded-xl border border-[#d2d2d7]/50 text-[13px] font-medium text-[#86868b] hover:text-[#1d1d1f] hover:border-[#d2d2d7] transition-colors"
          >
            <Archive className="w-4 h-4" />
            Archives
          </Link>

          <Link
            href="/shipments/new"
            className="inline-flex items-center gap-2 bg-[#0071e3] hover:bg-[#0077ed] text-white text-[13px] font-medium px-4 h-10 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Shipment
          </Link>
        </div>
      </div>

      {/* Transport Method Quick Stats */}
      <div className="grid grid-cols-6 gap-3 mb-6">
        {Object.entries(transportMethodConfig).map(([method, config]) => {
          const Icon = config.icon
          const count = methodCounts[method] || 0
          const isActive = methodFilter === method
          return (
            <button
              key={method}
              onClick={() => setMethodFilter(isActive ? '' : method)}
              className={`p-3 rounded-xl border transition-all text-left ${
                isActive 
                  ? 'border-2' 
                  : isDark 
                    ? 'border-[#38383a] hover:border-[#48484a]' 
                    : 'border-[#d2d2d7]/30 hover:border-[#d2d2d7]'
              }`}
              style={{
                borderColor: isActive ? config.color : undefined,
                backgroundColor: isActive 
                  ? `${config.color}15` 
                  : isDark ? '#1c1c1e' : 'white'
              }}
            >
              <Icon className="w-5 h-5 mb-1" style={{ color: config.color }} />
              <p className={`text-[12px] font-medium ${isDark ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>{config.shortLabel}</p>
              <p className={`text-[18px] font-semibold ${isDark ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>{count}</p>
            </button>
          )
        })}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" />
            <input
              type="text"
              placeholder="Search shipments, tracking, carrier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 bg-[#f5f5f7] border-0 rounded-xl text-[14px] text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
            />
          </div>
          
          <div className="relative">
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 pl-4 pr-10 bg-[#f5f5f7] border-0 rounded-xl text-[14px] text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#0071e3] appearance-none cursor-pointer"
            >
              <option value="">All Status</option>
              <option value="DRAFT">Draft</option>
              <option value="PREPARING">Preparing</option>
              <option value="LOADING">Loading</option>
              <option value="SHIPPED">Shipped</option>
              <option value="DELIVERED">Delivered</option>
            </select>
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b] pointer-events-none" />
          </div>

          {methodFilter && (
            <button
              onClick={() => setMethodFilter('')}
              className="h-10 px-4 bg-[#f5f5f7] rounded-xl text-[14px] text-[#86868b] hover:bg-[#e8e8ed] transition-colors"
            >
              Clear filter
            </button>
          )}
        </div>
      </div>

      {/* Gantt View */}
      {viewMode === 'gantt' && (
        <div className="mb-6">
          <ShipmentGantt shipments={filteredShipments} />
        </div>
      )}

      {/* Shipments List */}
      {viewMode === 'list' && filteredShipments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-12 text-center">
          <div className="w-16 h-16 bg-[#f5f5f7] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Ship className="w-8 h-8 text-[#86868b]" />
          </div>
          <h3 className="text-[17px] font-semibold text-[#1d1d1f] mb-2">No shipments yet</h3>
          <p className="text-[14px] text-[#86868b] mb-6">
            Create your first shipment to group orders for combined shipping.
          </p>
          <Link
            href="/shipments/new"
            className="inline-flex items-center gap-2 bg-[#0071e3] hover:bg-[#0077ed] text-white text-[13px] font-medium px-5 h-10 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Shipment
          </Link>
        </div>
      ) : viewMode === 'list' && (
        <div className="space-y-4">
          {filteredShipments.map((shipment) => {
            const status = statusColors[shipment.status] || statusColors.DRAFT
            const totalAmount = getTotalAmount(shipment.orders)
            const methodConfig = transportMethodConfig[shipment.transportMethod] || transportMethodConfig.SEA_FREIGHT
            const MethodIcon = methodConfig.icon
            
            return (
              <div 
                key={shipment.id}
                className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-6 hover:border-[#0071e3]/30 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${methodConfig.color}15` }}>
                      <MethodIcon className="w-6 h-6" style={{ color: methodConfig.color }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Link 
                          href={`/shipments/${shipment.id}`}
                          className="text-[17px] font-semibold text-[#1d1d1f] hover:text-[#0071e3]"
                        >
                          {shipment.shipmentNumber}
                        </Link>
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ 
                          backgroundColor: `${methodConfig.color}15`,
                          color: methodConfig.color 
                        }}>
                          {methodConfig.shortLabel}
                        </span>
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${status.bg} ${status.text}`}>
                          {status.label}
                        </span>
                      </div>
                      {shipment.name && (
                        <p className="text-[14px] text-[#86868b]">{shipment.name}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="relative">
                    <button
                      onClick={() => setActiveMenu(activeMenu === shipment.id ? null : shipment.id)}
                      className="p-2 hover:bg-[#f5f5f7] rounded-lg transition-colors"
                    >
                      <MoreHorizontal className="w-5 h-5 text-[#86868b]" />
                    </button>
                    
                    {activeMenu === shipment.id && (
                      <div className="absolute right-0 top-10 bg-white rounded-xl shadow-lg border border-[#d2d2d7]/30 py-1 w-48 z-10">
                        <Link
                          href={`/shipments/${shipment.id}`}
                          className="flex items-center gap-2 px-4 py-2 text-[14px] text-[#1d1d1f] hover:bg-[#f5f5f7]"
                        >
                          <Eye className="w-4 h-4" />
                          View Details
                        </Link>
                        <Link
                          href={`/shipments/${shipment.id}/edit`}
                          className="flex items-center gap-2 px-4 py-2 text-[14px] text-[#1d1d1f] hover:bg-[#f5f5f7]"
                        >
                          <Edit3 className="w-4 h-4" />
                          Edit Shipment
                        </Link>
                        <hr className="my-1 border-[#d2d2d7]/30" />
                        <button className="flex items-center gap-2 px-4 py-2 text-[14px] text-[#1d1d1f] hover:bg-[#f5f5f7] w-full">
                          <Package className="w-4 h-4" />
                          Export Packing List
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 text-[14px] text-[#1d1d1f] hover:bg-[#f5f5f7] w-full">
                          <FileText className="w-4 h-4" />
                          Factory Packing List
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 text-[14px] text-[#1d1d1f] hover:bg-[#f5f5f7] w-full">
                          <Receipt className="w-4 h-4" />
                          Combined Invoice
                        </button>
                        {shipment.status !== 'DELIVERED' && (
                          <>
                            <hr className="my-1 border-[#d2d2d7]/30" />
                            <button 
                              onClick={async () => {
                                try {
                                  await fetch(`/api/shipments/${shipment.id}`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ 
                                      status: 'DELIVERED',
                                      archivedAt: new Date().toISOString()
                                    })
                                  })
                                  setShipments(prev => prev.filter(s => s.id !== shipment.id))
                                  setActiveMenu(null)
                                } catch (error) {
                                  console.error('Failed to mark as delivered:', error)
                                }
                              }}
                              className="flex items-center gap-2 px-4 py-2 text-[14px] text-[#34c759] hover:bg-[#34c759]/5 w-full"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Mark as Delivered & Archive
                            </button>
                          </>
                        )}
                        <hr className="my-1 border-[#d2d2d7]/30" />
                        <button 
                          onClick={() => handleArchive(shipment.id)}
                          disabled={archiving === shipment.id}
                          className="flex items-center gap-2 px-4 py-2 text-[14px] text-[#86868b] hover:bg-[#f5f5f7] w-full disabled:opacity-50"
                        >
                          <Archive className="w-4 h-4" />
                          {archiving === shipment.id ? 'Archiving...' : 'Move to Archives'}
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 text-[14px] text-[#ff3b30] hover:bg-[#ff3b30]/5 w-full">
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Shipment Info - Dynamic based on transport method */}
                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-[12px] text-[#86868b] mb-0.5">Carrier</p>
                    <p className="text-[14px] font-medium text-[#1d1d1f]">
                      {shipment.carrierName || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[12px] text-[#86868b] mb-0.5">Tracking</p>
                    <p className="text-[14px] font-medium text-[#1d1d1f]">
                      {shipment.trackingNumber || shipment.containerNumber || shipment.blNumber || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[12px] text-[#86868b] mb-0.5">Route</p>
                    <p className="text-[14px] font-medium text-[#1d1d1f]">
                      {shipment.originLocation && shipment.destinationLocation
                        ? `${shipment.originLocation} → ${shipment.destinationLocation}`
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[12px] text-[#86868b] mb-0.5">Total Value</p>
                    <p className="text-[14px] font-semibold text-[#1d1d1f]">
                      {currencySymbol}{totalAmount.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Dates row */}
                <div className="flex items-center gap-4 text-[13px] text-[#86868b] mb-4">
                  {shipment.estimatedLoadingDate && (
                    <span>
                      Departure: {new Date(shipment.estimatedLoadingDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </span>
                  )}
                  {shipment.estimatedArrivalDate && (
                    <span>
                      Arrival: {new Date(shipment.estimatedArrivalDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </span>
                  )}
                </div>
                
                {/* Orders in shipment */}
                <div className="border-t border-[#d2d2d7]/30 pt-4">
                  <p className="text-[12px] font-medium text-[#86868b] uppercase tracking-wide mb-2">
                    Orders ({shipment.orders.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {shipment.orders.slice(0, 5).map((order) => (
                      <Link
                        key={order.id}
                        href={`/orders/${order.id}`}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#f5f5f7] hover:bg-[#e8e8ed] rounded-lg transition-colors"
                      >
                        <span className="text-[13px] font-medium text-[#0071e3]">{order.orderNumber}</span>
                        <span className="text-[12px] text-[#86868b]">{order.customerName}</span>
                      </Link>
                    ))}
                    {shipment.orders.length > 5 && (
                      <span className="inline-flex items-center px-3 py-1.5 bg-[#f5f5f7] rounded-lg text-[13px] text-[#86868b]">
                        +{shipment.orders.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
