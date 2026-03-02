'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  ChevronLeft, Ship, Loader2, Package, Edit3,
  FileText, Receipt, Mail, Download, Printer, Plus, Trash2,
  Anchor, AlertCircle, CheckCircle, Clock, Factory, 
  Plane, Train, Truck, MoreHorizontal
} from 'lucide-react'
import { useLocalization } from '@/hooks/useLocalization'
import { useAuthFetch } from '@/hooks/useAuthFetch'

interface Order {
  id: string
  orderNumber: string
  customerName: string
  totalAmount: number
  status: string
  itemCount?: number
  createdAt: string
}

interface PackingList {
  id: string
  packingListNumber: string
  type: 'EXPORT' | 'FACTORY'
  status: string
  createdAt: string
}

type TransportMethod = 'SEA_FREIGHT' | 'AIR_FREIGHT' | 'RAIL_FREIGHT' | 'ROAD_FREIGHT' | 'EXPRESS_COURIER' | 'FACTORY_PICKUP' | 'OTHER'

interface TransportDetails {
  containerNumber?: string
  blNumber?: string
  vessel?: string
  awbNumber?: string
  flightNumber?: string
  wagonNumber?: string
  trainNumber?: string
  truckPlate?: string
  cmrNumber?: string
  driverName?: string
  contactPerson?: string
}

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
  transportDetails: TransportDetails | null
  containerNumber: string | null
  blNumber: string | null
  vessel: string | null
  portOfLoading: string | null
  portOfDischarge: string | null
  estimatedLoadingDate: string | null
  actualLoadingDate: string | null
  estimatedArrivalDate: string | null
  actualArrivalDate: string | null
  notes: string | null
  orders: Order[]
  packingLists: PackingList[]
  createdAt: string
}

const statusConfig: Record<string, { bg: string; text: string; label: string; icon: typeof Clock }> = {
  DRAFT: { bg: 'bg-[#86868b]/10', text: 'text-[#86868b]', label: 'Draft', icon: Clock },
  PREPARING: { bg: 'bg-[#ff9500]/10', text: 'text-[#ff9500]', label: 'Preparing', icon: Package },
  LOADING: { bg: 'bg-[#5856d6]/10', text: 'text-[#5856d6]', label: 'Loading', icon: Anchor },
  SHIPPED: { bg: 'bg-[#0071e3]/10', text: 'text-[#0071e3]', label: 'Shipped', icon: Ship },
  DELIVERED: { bg: 'bg-[#34c759]/10', text: 'text-[#34c759]', label: 'Delivered', icon: CheckCircle },
}

const transportMethodConfig: Record<TransportMethod, { 
  label: string
  icon: typeof Ship
  color: string
  originLabel: string
  destinationLabel: string
}> = {
  SEA_FREIGHT: { label: 'Sea Freight', icon: Ship, color: '#0071e3', originLabel: 'Port of Loading', destinationLabel: 'Port of Discharge' },
  AIR_FREIGHT: { label: 'Air Freight', icon: Plane, color: '#5856d6', originLabel: 'Departure Airport', destinationLabel: 'Arrival Airport' },
  RAIL_FREIGHT: { label: 'Rail Freight', icon: Train, color: '#ff9500', originLabel: 'Loading Station', destinationLabel: 'Arrival Station' },
  ROAD_FREIGHT: { label: 'Road Freight', icon: Truck, color: '#34c759', originLabel: 'Origin City', destinationLabel: 'Destination City' },
  EXPRESS_COURIER: { label: 'Express Courier', icon: Package, color: '#ff3b30', originLabel: 'Origin', destinationLabel: 'Destination' },
  FACTORY_PICKUP: { label: 'Factory Pickup', icon: Factory, color: '#86868b', originLabel: 'Pickup Location', destinationLabel: 'Destination' },
  OTHER: { label: 'Other', icon: MoreHorizontal, color: '#1d1d1f', originLabel: 'Origin', destinationLabel: 'Destination' },
}

export default function ShipmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const { currencySymbol, isLoaded } = useLocalization()
  const authFetch = useAuthFetch()
  const [shipment, setShipment] = useState<Shipment | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    fetchShipment()
  }, [resolvedParams.id])

  const fetchShipment = async () => {
    try {
      const res = await fetch(`/api/shipments/${resolvedParams.id}`)
      if (res.ok) {
        const data = await res.json()
        setShipment(data.shipment)
      }
    } catch (error) {
      console.error('Failed to fetch shipment:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (newStatus: string) => {
    setActionLoading('status')
    try {
      const res = await authFetch(`/api/shipments/${resolvedParams.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      if (res.ok) {
        await fetchShipment()
      }
    } catch (error) {
      console.error('Failed to update status:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const generatePackingList = async (type: 'EXPORT' | 'FACTORY') => {
    setActionLoading(type)
    try {
      const res = await authFetch(`/api/shipments/${resolvedParams.id}/packing-list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      })
      if (res.ok) {
        const data = await res.json()
        await fetchShipment()
        // Redirect to the newly created packing list
        if (type === 'EXPORT') {
          router.push(`/packing-lists/export/${data.packingList.id}`)
        } else {
          router.push(`/packing-lists/factory`)
        }
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data.error || `Failed to generate ${type === 'EXPORT' ? 'Export' : 'Factory'} Packing List`)
      }
    } catch (error) {
      console.error('Failed to generate packing list:', error)
      alert('Failed to generate packing list. Please try again.')
    } finally {
      setActionLoading(null)
    }
  }

  const sendToFactory = async () => {
    setActionLoading('send')
    try {
      const res = await authFetch(`/api/shipments/${resolvedParams.id}/send-to-factory`, {
        method: 'POST'
      })
      if (res.ok) {
        alert('Packing list sent to factory!')
      }
    } catch (error) {
      console.error('Failed to send to factory:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this shipment? This action cannot be undone.')) {
      return
    }
    
    setActionLoading('delete')
    try {
      const res = await authFetch(`/api/shipments/${resolvedParams.id}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        router.push('/shipments')
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to delete shipment')
      }
    } catch (error) {
      console.error('Failed to delete shipment:', error)
      alert('Failed to delete shipment')
    } finally {
      setActionLoading(null)
    }
  }

  if (!isLoaded || loading) {
    return (
      <div className="max-w-5xl mx-auto flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#0071e3]" />
      </div>
    )
  }

  if (!shipment) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-12 text-center">
          <AlertCircle className="w-12 h-12 text-[#ff3b30] mx-auto mb-4" />
          <h2 className="text-[17px] font-semibold text-[#1d1d1f] mb-2">Shipment not found</h2>
          <Link href="/shipments" className="text-[14px] text-[#0071e3]">
            Back to Shipments
          </Link>
        </div>
      </div>
    )
  }

  const status = statusConfig[shipment.status] || statusConfig.DRAFT
  const StatusIcon = status.icon
  const totalValue = shipment.orders.reduce((sum, o) => sum + o.totalAmount, 0)
  
  const methodConfig = transportMethodConfig[shipment.transportMethod] || transportMethodConfig.SEA_FREIGHT
  const MethodIcon = methodConfig.icon

  const ordersByCustomer = shipment.orders.reduce((acc, order) => {
    if (!acc[order.customerName]) {
      acc[order.customerName] = []
    }
    acc[order.customerName].push(order)
    return acc
  }, {} as Record<string, Order[]>)

  const details = shipment.transportDetails || {}
  const originLocation = shipment.originLocation || shipment.portOfLoading
  const destinationLocation = shipment.destinationLocation || shipment.portOfDischarge

  return (
    <div className="max-w-5xl mx-auto">
      <Link href="/shipments" className="text-[#0071e3] hover:text-[#0077ed] flex items-center gap-1 text-[13px] mb-4">
        <ChevronLeft className="w-4 h-4" />
        Back to Shipments
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${methodConfig.color}15` }}>
            <MethodIcon className="w-7 h-7" style={{ color: methodConfig.color }} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">
                {shipment.shipmentNumber}
              </h1>
              <span className="text-[12px] font-medium px-3 py-1 rounded-full" style={{ 
                backgroundColor: `${methodConfig.color}15`,
                color: methodConfig.color 
              }}>
                {methodConfig.label}
              </span>
              <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-1 rounded-full ${status.bg} ${status.text}`}>
                <StatusIcon className="w-3.5 h-3.5" />
                {status.label}
              </span>
            </div>
            {shipment.name && (
              <p className="text-[15px] text-[#86868b] mt-0.5">{shipment.name}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/shipments/${shipment.id}/edit`}
            className="inline-flex items-center gap-2 px-4 h-10 bg-white border border-[#d2d2d7]/50 text-[#1d1d1f] rounded-xl text-[13px] font-medium hover:bg-[#f5f5f7] transition-colors"
          >
            <Edit3 className="w-4 h-4" />
            Edit
          </Link>
          
          <select
            value={shipment.status}
            onChange={(e) => updateStatus(e.target.value)}
            disabled={actionLoading === 'status'}
            className="h-10 px-4 text-white rounded-xl text-[13px] font-medium cursor-pointer focus:outline-none"
            style={{ backgroundColor: methodConfig.color }}
          >
            <option value="DRAFT">Draft</option>
            <option value="PREPARING">Preparing</option>
            <option value="LOADING">Loading</option>
            <option value="SHIPPED">Shipped</option>
            <option value="DELIVERED">Delivered</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="col-span-2 space-y-6">
          {/* Transport Details */}
          <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-6">
            <h2 className="text-[17px] font-semibold text-[#1d1d1f] mb-4">Transport Details</h2>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Common fields */}
              <div className="space-y-4">
                <div>
                  <p className="text-[12px] text-[#86868b] mb-1">Carrier / Company</p>
                  <p className="text-[15px] font-medium text-[#1d1d1f]">
                    {shipment.carrierName || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[12px] text-[#86868b] mb-1">Tracking Number</p>
                  <p className="text-[15px] font-medium text-[#1d1d1f]">
                    {shipment.trackingNumber || '—'}
                  </p>
                </div>
                
                {/* Method-specific fields */}
                {shipment.transportMethod === 'SEA_FREIGHT' && (
                  <>
                    <div>
                      <p className="text-[12px] text-[#86868b] mb-1">Container Number</p>
                      <p className="text-[15px] font-medium text-[#1d1d1f]">
                        {details.containerNumber || shipment.containerNumber || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[12px] text-[#86868b] mb-1">Bill of Lading</p>
                      <p className="text-[15px] font-medium text-[#1d1d1f]">
                        {details.blNumber || shipment.blNumber || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[12px] text-[#86868b] mb-1">Vessel</p>
                      <p className="text-[15px] font-medium text-[#1d1d1f]">
                        {details.vessel || shipment.vessel || '—'}
                      </p>
                    </div>
                  </>
                )}

                {shipment.transportMethod === 'AIR_FREIGHT' && (
                  <>
                    <div>
                      <p className="text-[12px] text-[#86868b] mb-1">Air Waybill (AWB)</p>
                      <p className="text-[15px] font-medium text-[#1d1d1f]">
                        {details.awbNumber || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[12px] text-[#86868b] mb-1">Flight Number</p>
                      <p className="text-[15px] font-medium text-[#1d1d1f]">
                        {details.flightNumber || '—'}
                      </p>
                    </div>
                  </>
                )}

                {shipment.transportMethod === 'RAIL_FREIGHT' && (
                  <>
                    <div>
                      <p className="text-[12px] text-[#86868b] mb-1">Wagon Number</p>
                      <p className="text-[15px] font-medium text-[#1d1d1f]">
                        {details.wagonNumber || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[12px] text-[#86868b] mb-1">Train Number</p>
                      <p className="text-[15px] font-medium text-[#1d1d1f]">
                        {details.trainNumber || '—'}
                      </p>
                    </div>
                  </>
                )}

                {shipment.transportMethod === 'ROAD_FREIGHT' && (
                  <>
                    <div>
                      <p className="text-[12px] text-[#86868b] mb-1">Truck License Plate</p>
                      <p className="text-[15px] font-medium text-[#1d1d1f]">
                        {details.truckPlate || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[12px] text-[#86868b] mb-1">CMR Number</p>
                      <p className="text-[15px] font-medium text-[#1d1d1f]">
                        {details.cmrNumber || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[12px] text-[#86868b] mb-1">Driver Name</p>
                      <p className="text-[15px] font-medium text-[#1d1d1f]">
                        {details.driverName || '—'}
                      </p>
                    </div>
                  </>
                )}

                {shipment.transportMethod === 'FACTORY_PICKUP' && (
                  <div>
                    <p className="text-[12px] text-[#86868b] mb-1">Contact Person</p>
                    <p className="text-[15px] font-medium text-[#1d1d1f]">
                      {details.contactPerson || '—'}
                    </p>
                  </div>
                )}
              </div>
              
              {/* Route and dates */}
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <p className="text-[12px] text-[#86868b] mb-1">{methodConfig.originLabel}</p>
                    <p className="text-[15px] font-medium text-[#1d1d1f]">
                      {originLocation || '—'}
                    </p>
                  </div>
                  <div className="flex-1">
                    <p className="text-[12px] text-[#86868b] mb-1">{methodConfig.destinationLabel}</p>
                    <p className="text-[15px] font-medium text-[#1d1d1f]">
                      {destinationLocation || '—'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <p className="text-[12px] text-[#86868b] mb-1">
                      {shipment.transportMethod === 'FACTORY_PICKUP' ? 'Pickup Date' : 'Est. Departure'}
                    </p>
                    <p className="text-[15px] font-medium text-[#1d1d1f]">
                      {shipment.estimatedLoadingDate
                        ? new Date(shipment.estimatedLoadingDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '—'}
                    </p>
                  </div>
                  {shipment.transportMethod !== 'FACTORY_PICKUP' && (
                    <div className="flex-1">
                      <p className="text-[12px] text-[#86868b] mb-1">Est. Arrival</p>
                      <p className="text-[15px] font-medium text-[#1d1d1f]">
                        {shipment.estimatedArrivalDate
                          ? new Date(shipment.estimatedArrivalDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                          : '—'}
                      </p>
                    </div>
                  )}
                </div>
                {shipment.actualLoadingDate && (
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <p className="text-[12px] text-[#86868b] mb-1">Actual Departure</p>
                      <p className="text-[15px] font-medium text-[#34c759]">
                        {new Date(shipment.actualLoadingDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    {shipment.actualArrivalDate && (
                      <div className="flex-1">
                        <p className="text-[12px] text-[#86868b] mb-1">Actual Arrival</p>
                        <p className="text-[15px] font-medium text-[#34c759]">
                          {new Date(shipment.actualArrivalDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Custom Fields */}
            {(() => {
              const standardFields = ['containerNumber', 'blNumber', 'vessel', 'awbNumber', 'flightNumber', 'wagonNumber', 'trainNumber', 'truckPlate', 'cmrNumber', 'driverName', 'contactPerson']
              const customFields = Object.entries(details).filter(([key]) => !standardFields.includes(key))
              if (customFields.length === 0) return null
              return (
                <div className="mt-4 pt-4 border-t border-[#d2d2d7]/30">
                  <p className="text-[12px] font-medium text-[#86868b] uppercase tracking-wide mb-3">Custom Fields</p>
                  <div className="grid grid-cols-2 gap-4">
                    {customFields.map(([key, value]) => (
                      <div key={key}>
                        <p className="text-[12px] text-[#86868b] mb-1">{key}</p>
                        <p className="text-[15px] font-medium text-[#1d1d1f]">{String(value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}

            {shipment.notes && (
              <div className="mt-4 pt-4 border-t border-[#d2d2d7]/30">
                <p className="text-[12px] text-[#86868b] mb-1">Notes</p>
                <p className="text-[14px] text-[#1d1d1f]">{shipment.notes}</p>
              </div>
            )}
          </div>

          {/* Orders in Shipment */}
          <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 overflow-hidden">
            <div className="p-4 border-b border-[#d2d2d7]/30 flex items-center justify-between">
              <h2 className="text-[17px] font-semibold text-[#1d1d1f]">
                Orders ({shipment.orders.length})
              </h2>
              <Link
                href={`/shipments/${shipment.id}/add-orders`}
                className="inline-flex items-center gap-1 text-[13px] text-[#0071e3] hover:text-[#0077ed]"
              >
                <Plus className="w-4 h-4" />
                Add Orders
              </Link>
            </div>
            
            <div className="divide-y divide-[#d2d2d7]/30">
              {Object.entries(ordersByCustomer).map(([customerName, orders]) => (
                <div key={customerName} className="p-4">
                  <p className="text-[12px] font-medium text-[#86868b] uppercase tracking-wide mb-2">
                    {customerName}
                  </p>
                  <div className="space-y-2">
                    {orders.map((order) => (
                      <Link
                        key={order.id}
                        href={`/orders/${order.id}`}
                        className="flex items-center justify-between p-3 bg-[#f5f5f7] rounded-xl hover:bg-[#e8e8ed] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-[14px] font-medium text-[#0071e3]">
                            {order.orderNumber}
                          </span>
                          <span className="text-[12px] px-2 py-0.5 bg-white rounded text-[#86868b]">
                            {order.status}
                          </span>
                        </div>
                        <span className="text-[14px] font-medium text-[#1d1d1f]">
                          {currencySymbol}{order.totalAmount.toLocaleString()}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Actions */}
        <div className="space-y-6">
          {/* Summary */}
          <div className="rounded-2xl p-4 border" style={{ 
            backgroundColor: `${methodConfig.color}08`,
            borderColor: `${methodConfig.color}30`
          }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[13px] font-medium" style={{ color: methodConfig.color }}>Total Value</p>
              <p className="text-[24px] font-semibold text-[#1d1d1f]">
                {currencySymbol}{totalValue.toLocaleString()}
              </p>
            </div>
            <div className="flex items-center justify-between text-[13px] text-[#86868b]">
              <span>{shipment.orders.length} orders</span>
              <span>{Object.keys(ordersByCustomer).length} customers</span>
            </div>
          </div>

          {/* Packing Lists */}
          <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-4">
            <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-4">Packing Lists</h3>
            
            <div className="space-y-3">
              {/* Export Packing List */}
              <div className="p-3 bg-[#34c759]/5 rounded-xl border border-[#34c759]/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-[#34c759]" />
                    <span className="text-[14px] font-medium text-[#1d1d1f]">Export Packing List</span>
                  </div>
                </div>
                <p className="text-[12px] text-[#86868b] mb-3">For customer and customs</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => generatePackingList('EXPORT')}
                    disabled={actionLoading === 'EXPORT'}
                    className="flex-1 flex items-center justify-center gap-1.5 h-8 bg-[#34c759] text-white text-[12px] font-medium rounded-lg hover:bg-[#30b553] disabled:opacity-50"
                  >
                    {actionLoading === 'EXPORT' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <FileText className="w-3.5 h-3.5" />
                        Generate
                      </>
                    )}
                  </button>
                  <button className="h-8 px-3 bg-white border border-[#34c759]/30 text-[#34c759] rounded-lg hover:bg-[#34c759]/5">
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Factory Packing List */}
              <div className="p-3 bg-[#ff9500]/5 rounded-xl border border-[#ff9500]/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Factory className="w-4 h-4 text-[#ff9500]" />
                    <span className="text-[14px] font-medium text-[#1d1d1f]">Factory Packing List</span>
                  </div>
                </div>
                <p className="text-[12px] text-[#86868b] mb-3">For factory preparation</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => generatePackingList('FACTORY')}
                    disabled={actionLoading === 'FACTORY'}
                    className="flex-1 flex items-center justify-center gap-1.5 h-8 bg-[#ff9500] text-white text-[12px] font-medium rounded-lg hover:bg-[#e08600] disabled:opacity-50"
                  >
                    {actionLoading === 'FACTORY' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <FileText className="w-3.5 h-3.5" />
                        Generate
                      </>
                    )}
                  </button>
                  <button
                    onClick={sendToFactory}
                    disabled={actionLoading === 'send'}
                    className="h-8 px-3 bg-white border border-[#ff9500]/30 text-[#ff9500] rounded-lg hover:bg-[#ff9500]/5 disabled:opacity-50"
                    title="Send to Factory"
                  >
                    {actionLoading === 'send' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Mail className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Combined Invoice */}
          <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-4">
            <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-4">Combined Invoice</h3>
            <p className="text-[12px] text-[#86868b] mb-3">
              Generate a single invoice for all orders in this shipment
            </p>
            <button 
              className="w-full flex items-center justify-center gap-2 h-10 text-white text-[13px] font-medium rounded-xl transition-colors"
              style={{ backgroundColor: methodConfig.color }}
            >
              <Receipt className="w-4 h-4" />
              Generate Combined Invoice
            </button>
            <p className="text-[11px] text-[#86868b] mt-2 text-center">
              Original invoices will be kept intact
            </p>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-4">
            <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-[14px] text-[#1d1d1f] hover:bg-[#f5f5f7] rounded-lg transition-colors">
                <Printer className="w-4 h-4 text-[#86868b]" />
                Print All Documents
              </button>
              <button className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-[14px] text-[#1d1d1f] hover:bg-[#f5f5f7] rounded-lg transition-colors">
                <Download className="w-4 h-4 text-[#86868b]" />
                Download All as ZIP
              </button>
              <hr className="my-2 border-[#d2d2d7]/30" />
              <button 
                onClick={handleDelete}
                disabled={actionLoading === 'delete'}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-[14px] text-[#ff3b30] hover:bg-[#ff3b30]/5 rounded-lg transition-colors disabled:opacity-50"
              >
                {actionLoading === 'delete' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Delete Shipment
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
