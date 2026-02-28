'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { 
  ChevronLeft, Loader2, Ship, Plus, Search,
  Package, Check, Plane, Train, Truck, Factory, MoreHorizontal, Trash2, X
} from 'lucide-react'
import { useLocalization } from '@/hooks/useLocalization'

interface Order {
  id: string
  orderNumber: string
  customerName: string
  totalAmount: number
  status: string
  itemCount: number
  createdAt: string
}

interface CustomField {
  id: string
  name: string
  value: string
}

type TransportMethod = 'SEA_FREIGHT' | 'AIR_FREIGHT' | 'RAIL_FREIGHT' | 'ROAD_FREIGHT' | 'EXPRESS_COURIER' | 'FACTORY_PICKUP' | 'OTHER'

const transportMethods: { 
  id: TransportMethod
  label: string
  icon: typeof Ship
  description: string
  color: string
}[] = [
  { id: 'SEA_FREIGHT', label: 'Sea Freight', icon: Ship, description: 'Container shipping by sea', color: '#0071e3' },
  { id: 'AIR_FREIGHT', label: 'Air Freight', icon: Plane, description: 'Air cargo shipping', color: '#5856d6' },
  { id: 'RAIL_FREIGHT', label: 'Rail Freight', icon: Train, description: 'Train cargo transport', color: '#ff9500' },
  { id: 'ROAD_FREIGHT', label: 'Road Freight', icon: Truck, description: 'Truck/road transport', color: '#34c759' },
  { id: 'EXPRESS_COURIER', label: 'Express Courier', icon: Package, description: 'DHL, FedEx, UPS, etc.', color: '#ff3b30' },
  { id: 'FACTORY_PICKUP', label: 'Factory Pickup', icon: Factory, description: 'Customer picks up at factory', color: '#86868b' },
  { id: 'OTHER', label: 'Other', icon: MoreHorizontal, description: 'Custom transport method', color: '#1d1d1f' },
]

export default function NewShipmentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedOrderId = searchParams.get('order')
  const { currencySymbol, isLoaded } = useLocalization()
  const [loading, setLoading] = useState(false)
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [error, setError] = useState('')
  
  const [transportMethod, setTransportMethod] = useState<TransportMethod>('SEA_FREIGHT')
  
  const [name, setName] = useState('')
  const [carrierName, setCarrierName] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [originLocation, setOriginLocation] = useState('')
  const [destinationLocation, setDestinationLocation] = useState('')
  const [estimatedLoadingDate, setEstimatedLoadingDate] = useState('')
  const [estimatedArrivalDate, setEstimatedArrivalDate] = useState('')
  const [notes, setNotes] = useState('')
  
  const [containerNumber, setContainerNumber] = useState('')
  const [blNumber, setBlNumber] = useState('')
  const [vessel, setVessel] = useState('')
  const [factoryLoadingDate, setFactoryLoadingDate] = useState('')
  const [etdDate, setEtdDate] = useState('')
  const [etaDate, setEtaDate] = useState('')
  
  const [awbNumber, setAwbNumber] = useState('')
  const [flightNumber, setFlightNumber] = useState('')
  
  const [wagonNumber, setWagonNumber] = useState('')
  const [trainNumber, setTrainNumber] = useState('')
  
  const [truckPlate, setTruckPlate] = useState('')
  const [cmrNumber, setCmrNumber] = useState('')
  const [driverName, setDriverName] = useState('')
  
  const [contactPerson, setContactPerson] = useState('')
  
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  
  const [availableOrders, setAvailableOrders] = useState<Order[]>([])
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchAvailableOrders()
  }, [])

  useEffect(() => {
    if (preselectedOrderId && availableOrders.length > 0) {
      const orderExists = availableOrders.find(o => o.id === preselectedOrderId)
      if (orderExists && !selectedOrderIds.includes(preselectedOrderId)) {
        setSelectedOrderIds([preselectedOrderId])
      }
    }
  }, [preselectedOrderId, availableOrders])

  const fetchAvailableOrders = async () => {
    try {
      const res = await fetch('/api/orders/available-for-shipment')
      if (res.ok) {
        const data = await res.json()
        setAvailableOrders(data.orders || [])
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error)
    } finally {
      setOrdersLoading(false)
    }
  }

  const toggleOrder = (orderId: string) => {
    setSelectedOrderIds(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    )
  }

  const filteredOrders = availableOrders.filter(order => {
    if (!searchQuery) return true
    return (
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })

  const selectedOrders = availableOrders.filter(o => selectedOrderIds.includes(o.id))
  const totalValue = selectedOrders.reduce((sum, o) => sum + o.totalAmount, 0)

  const addCustomField = () => {
    setCustomFields([...customFields, { id: crypto.randomUUID(), name: '', value: '' }])
  }

  const updateCustomField = (id: string, field: 'name' | 'value', newValue: string) => {
    setCustomFields(customFields.map(cf => 
      cf.id === id ? { ...cf, [field]: newValue } : cf
    ))
  }

  const removeCustomField = (id: string) => {
    setCustomFields(customFields.filter(cf => cf.id !== id))
  }

  const buildTransportDetails = () => {
    const baseDetails: Record<string, string> = {}
    
    switch (transportMethod) {
      case 'SEA_FREIGHT':
        if (containerNumber) baseDetails.containerNumber = containerNumber
        if (blNumber) baseDetails.blNumber = blNumber
        if (vessel) baseDetails.vessel = vessel
        if (factoryLoadingDate) baseDetails.factoryLoadingDate = factoryLoadingDate
        if (etdDate) baseDetails.etd = etdDate
        if (etaDate) baseDetails.eta = etaDate
        break
      case 'AIR_FREIGHT':
        if (awbNumber) baseDetails.awbNumber = awbNumber
        if (flightNumber) baseDetails.flightNumber = flightNumber
        break
      case 'RAIL_FREIGHT':
        if (wagonNumber) baseDetails.wagonNumber = wagonNumber
        if (trainNumber) baseDetails.trainNumber = trainNumber
        break
      case 'ROAD_FREIGHT':
        if (truckPlate) baseDetails.truckPlate = truckPlate
        if (cmrNumber) baseDetails.cmrNumber = cmrNumber
        if (driverName) baseDetails.driverName = driverName
        break
      case 'FACTORY_PICKUP':
        if (contactPerson) baseDetails.contactPerson = contactPerson
        break
    }
    
    customFields.forEach(cf => {
      if (cf.name && cf.value) {
        baseDetails[cf.name] = cf.value
      }
    })
    
    return baseDetails
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (selectedOrderIds.length === 0) {
      setError('Please select at least one order')
      return
    }

    setLoading(true)
    setError('')

    try {
      // For Sea Freight, use ETD as loading date and ETA as arrival date
      const loadingDate = transportMethod === 'SEA_FREIGHT' 
        ? (etdDate || null) 
        : (estimatedLoadingDate || null)
      const arrivalDate = transportMethod === 'SEA_FREIGHT' 
        ? (etaDate || null) 
        : (estimatedArrivalDate || null)

      const res = await fetch('/api/shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name || null,
          orderIds: selectedOrderIds,
          transportMethod,
          carrierName: carrierName || null,
          trackingNumber: trackingNumber || null,
          originLocation: originLocation || null,
          destinationLocation: destinationLocation || null,
          transportDetails: buildTransportDetails(),
          containerNumber: transportMethod === 'SEA_FREIGHT' ? containerNumber || null : null,
          blNumber: transportMethod === 'SEA_FREIGHT' ? blNumber || null : null,
          vessel: transportMethod === 'SEA_FREIGHT' ? vessel || null : null,
          portOfLoading: transportMethod === 'SEA_FREIGHT' ? originLocation || null : null,
          portOfDischarge: transportMethod === 'SEA_FREIGHT' ? destinationLocation || null : null,
          estimatedLoadingDate: loadingDate,
          estimatedArrivalDate: arrivalDate,
          notes: notes || null
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create shipment')
      }

      const data = await res.json()
      router.push(`/shipments/${data.shipment.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create shipment')
    } finally {
      setLoading(false)
    }
  }

  const selectedMethod = transportMethods.find(m => m.id === transportMethod)!
  const MethodIcon = selectedMethod.icon

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0071e3]" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Link href="/shipments" className="text-[#0071e3] hover:text-[#0077ed] flex items-center gap-1 text-[13px] mb-4">
        <ChevronLeft className="w-4 h-4" />
        Back to Shipments
      </Link>

      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${selectedMethod.color}15` }}>
          <MethodIcon className="w-6 h-6" style={{ color: selectedMethod.color }} />
        </div>
        <div>
          <h1 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">Create Shipment</h1>
          <p className="text-[15px] text-[#86868b]">Group orders for combined shipping</p>
        </div>
      </div>

      {error && (
        <div className="bg-[#ff3b30]/10 text-[#ff3b30] text-[14px] px-4 py-3 rounded-xl mb-6">
          {error}
        </div>
      )}

      {/* Transport Method Selection */}
      <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-4 mb-6">
        <h2 className="text-[15px] font-semibold text-[#1d1d1f] mb-4">Transport Method</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {transportMethods.map((method) => {
            const Icon = method.icon
            const isSelected = transportMethod === method.id
            return (
              <button
                key={method.id}
                type="button"
                onClick={() => setTransportMethod(method.id)}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  isSelected 
                    ? 'border-[#0071e3] bg-[#0071e3]/5' 
                    : 'border-[#d2d2d7]/30 hover:border-[#d2d2d7] hover:bg-[#f5f5f7]'
                }`}
              >
                <Icon 
                  className="w-6 h-6 mb-2" 
                  style={{ color: isSelected ? method.color : '#86868b' }} 
                />
                <p className={`text-[13px] font-medium ${isSelected ? 'text-[#1d1d1f]' : 'text-[#86868b]'}`}>
                  {method.label}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-3 gap-6">
          {/* Left Column - Orders Selection */}
          <div className="col-span-2 space-y-6">
            {/* Order Selection */}
            <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 overflow-hidden">
              <div className="p-4 border-b border-[#d2d2d7]/30">
                <h2 className="text-[15px] font-semibold text-[#1d1d1f]">Select Orders</h2>
                <p className="text-[13px] text-[#86868b] mt-0.5">
                  Choose orders to include in this shipment
                </p>
              </div>
              
              <div className="p-4 border-b border-[#d2d2d7]/30">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" />
                  <input
                    type="text"
                    placeholder="Search orders..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-10 pl-10 pr-4 bg-[#f5f5f7] border-0 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  />
                </div>
              </div>

              <div className="max-h-[400px] overflow-y-auto">
                {ordersLoading ? (
                  <div className="p-8 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-[#0071e3] mx-auto" />
                  </div>
                ) : filteredOrders.length === 0 ? (
                  <div className="p-8 text-center">
                    <Package className="w-10 h-10 text-[#86868b] mx-auto mb-2" />
                    <p className="text-[14px] text-[#86868b]">No orders available for shipment</p>
                    <p className="text-[12px] text-[#86868b] mt-1">
                      Orders must be in CONFIRMED, PREPARING, or READY status
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#d2d2d7]/30">
                    {filteredOrders.map((order) => {
                      const isSelected = selectedOrderIds.includes(order.id)
                      return (
                        <button
                          key={order.id}
                          type="button"
                          onClick={() => toggleOrder(order.id)}
                          className={`w-full flex items-center gap-4 p-4 text-left hover:bg-[#f5f5f7] transition-colors ${
                            isSelected ? 'bg-[#0071e3]/5' : ''
                          }`}
                        >
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                            isSelected 
                              ? 'bg-[#0071e3] border-[#0071e3]' 
                              : 'border-[#d2d2d7]'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[14px] font-medium text-[#0071e3]">
                                {order.orderNumber}
                              </span>
                              <span className="text-[12px] px-2 py-0.5 bg-[#f5f5f7] rounded text-[#86868b]">
                                {order.status}
                              </span>
                            </div>
                            <p className="text-[13px] text-[#1d1d1f] truncate">{order.customerName}</p>
                          </div>
                          
                          <div className="text-right">
                            <p className="text-[14px] font-medium text-[#1d1d1f]">
                              {currencySymbol}{order.totalAmount.toLocaleString()}
                            </p>
                            <p className="text-[12px] text-[#86868b]">{order.itemCount} items</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Shipment Details */}
          <div className="space-y-6">
            {/* Selected Orders Summary */}
            <div className="rounded-2xl p-4 border" style={{ 
              backgroundColor: `${selectedMethod.color}08`,
              borderColor: `${selectedMethod.color}30`
            }}>
              <p className="text-[13px] font-medium mb-2" style={{ color: selectedMethod.color }}>
                Selected Orders
              </p>
              <p className="text-[24px] font-semibold text-[#1d1d1f]">
                {selectedOrderIds.length}
              </p>
              <p className="text-[13px] text-[#86868b]">
                Total: {currencySymbol}{totalValue.toLocaleString()}
              </p>
            </div>

            {/* Common Shipment Info */}
            <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-4 space-y-4">
              <h3 className="text-[15px] font-semibold text-[#1d1d1f]">Shipment Details</h3>
              
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
                  Shipment Name (optional)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={`e.g., ${selectedMethod.label} March 2026`}
                  className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
                  Carrier / Company
                </label>
                <input
                  type="text"
                  value={carrierName}
                  onChange={(e) => setCarrierName(e.target.value)}
                  placeholder={
                    transportMethod === 'SEA_FREIGHT' ? 'e.g., Maersk, MSC, CMA CGM' :
                    transportMethod === 'AIR_FREIGHT' ? 'e.g., Emirates SkyCargo, Lufthansa Cargo' :
                    transportMethod === 'RAIL_FREIGHT' ? 'e.g., DB Schenker, SNCF Fret' :
                    transportMethod === 'ROAD_FREIGHT' ? 'e.g., DHL Freight, Dachser' :
                    transportMethod === 'EXPRESS_COURIER' ? 'e.g., DHL Express, FedEx, UPS' :
                    'Company name'
                  }
                  className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
                  Tracking Number
                </label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Universal tracking number"
                  className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                />
              </div>

              {/* Method-specific fields */}
              {transportMethod === 'SEA_FREIGHT' && (
                <>
                  <div>
                    <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
                      Container Number
                    </label>
                    <input
                      type="text"
                      value={containerNumber}
                      onChange={(e) => setContainerNumber(e.target.value)}
                      placeholder="ABCD1234567"
                      className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
                      Bill of Lading (B/L)
                    </label>
                    <input
                      type="text"
                      value={blNumber}
                      onChange={(e) => setBlNumber(e.target.value)}
                      placeholder="BL123456"
                      className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
                      Vessel Name
                    </label>
                    <input
                      type="text"
                      value={vessel}
                      onChange={(e) => setVessel(e.target.value)}
                      placeholder="MSC AURORA"
                      className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                    />
                  </div>
                  
                  {/* Sea Freight specific dates */}
                  <div className="pt-2 border-t border-[#d2d2d7]/30">
                    <p className="text-[12px] font-medium text-[#86868b] uppercase tracking-wide mb-3">Key Dates</p>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
                          Factory Loading Date
                        </label>
                        <input
                          type="date"
                          value={factoryLoadingDate}
                          onChange={(e) => setFactoryLoadingDate(e.target.value)}
                          className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                        />
                      </div>
                      <div>
                        <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
                          ETD (Sailing Date)
                        </label>
                        <input
                          type="date"
                          value={etdDate}
                          onChange={(e) => setEtdDate(e.target.value)}
                          className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                        />
                      </div>
                      <div>
                        <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
                          ETA (Arrival Date)
                        </label>
                        <input
                          type="date"
                          value={etaDate}
                          onChange={(e) => setEtaDate(e.target.value)}
                          className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {transportMethod === 'AIR_FREIGHT' && (
                <>
                  <div>
                    <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
                      Air Waybill (AWB)
                    </label>
                    <input
                      type="text"
                      value={awbNumber}
                      onChange={(e) => setAwbNumber(e.target.value)}
                      placeholder="123-12345678"
                      className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
                      Flight Number
                    </label>
                    <input
                      type="text"
                      value={flightNumber}
                      onChange={(e) => setFlightNumber(e.target.value)}
                      placeholder="LH8401"
                      className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                    />
                  </div>
                </>
              )}

              {transportMethod === 'RAIL_FREIGHT' && (
                <>
                  <div>
                    <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
                      Wagon Number
                    </label>
                    <input
                      type="text"
                      value={wagonNumber}
                      onChange={(e) => setWagonNumber(e.target.value)}
                      placeholder="Wagon ID"
                      className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
                      Train Number
                    </label>
                    <input
                      type="text"
                      value={trainNumber}
                      onChange={(e) => setTrainNumber(e.target.value)}
                      placeholder="Train ID"
                      className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                    />
                  </div>
                </>
              )}

              {transportMethod === 'ROAD_FREIGHT' && (
                <>
                  <div>
                    <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
                      Truck License Plate
                    </label>
                    <input
                      type="text"
                      value={truckPlate}
                      onChange={(e) => setTruckPlate(e.target.value)}
                      placeholder="AB-123-CD"
                      className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
                      CMR Number
                    </label>
                    <input
                      type="text"
                      value={cmrNumber}
                      onChange={(e) => setCmrNumber(e.target.value)}
                      placeholder="CMR document number"
                      className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
                      Driver Name
                    </label>
                    <input
                      type="text"
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      placeholder="Driver's name"
                      className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                    />
                  </div>
                </>
              )}

              {transportMethod === 'FACTORY_PICKUP' && (
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="Name of person picking up"
                    className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
                    {transportMethod === 'SEA_FREIGHT' ? 'Port of Loading' :
                     transportMethod === 'AIR_FREIGHT' ? 'Departure Airport' :
                     transportMethod === 'RAIL_FREIGHT' ? 'Loading Station' :
                     transportMethod === 'FACTORY_PICKUP' ? 'Pickup Location' :
                     'Origin'}
                  </label>
                  <input
                    type="text"
                    value={originLocation}
                    onChange={(e) => setOriginLocation(e.target.value)}
                    placeholder={
                      transportMethod === 'SEA_FREIGHT' ? 'Shanghai' :
                      transportMethod === 'AIR_FREIGHT' ? 'PVG' :
                      transportMethod === 'FACTORY_PICKUP' ? 'Factory address' :
                      'City / Location'
                    }
                    className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
                    {transportMethod === 'SEA_FREIGHT' ? 'Port of Discharge' :
                     transportMethod === 'AIR_FREIGHT' ? 'Arrival Airport' :
                     transportMethod === 'RAIL_FREIGHT' ? 'Arrival Station' :
                     transportMethod === 'FACTORY_PICKUP' ? 'Destination' :
                     'Destination'}
                  </label>
                  <input
                    type="text"
                    value={destinationLocation}
                    onChange={(e) => setDestinationLocation(e.target.value)}
                    placeholder={
                      transportMethod === 'SEA_FREIGHT' ? 'Rotterdam' :
                      transportMethod === 'AIR_FREIGHT' ? 'CDG' :
                      'City / Location'
                    }
                    className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  />
                </div>
              </div>

              {/* Generic dates - hide for SEA_FREIGHT which has specific dates */}
              {transportMethod !== 'SEA_FREIGHT' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
                      {transportMethod === 'FACTORY_PICKUP' ? 'Pickup Date' : 'Est. Departure'}
                    </label>
                    <input
                      type="date"
                      value={estimatedLoadingDate}
                      onChange={(e) => setEstimatedLoadingDate(e.target.value)}
                      className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                    />
                  </div>
                  {transportMethod !== 'FACTORY_PICKUP' && (
                    <div>
                      <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
                        Est. Arrival
                      </label>
                      <input
                        type="date"
                        value={estimatedArrivalDate}
                        onChange={(e) => setEstimatedArrivalDate(e.target.value)}
                        className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                      />
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes..."
                  rows={3}
                  className="w-full px-3 py-2 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3] resize-none"
                />
              </div>
            </div>

            {/* Custom Fields */}
            <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[15px] font-semibold text-[#1d1d1f]">Custom Fields</h3>
                <button
                  type="button"
                  onClick={addCustomField}
                  className="flex items-center gap-1 text-[13px] text-[#0071e3] hover:text-[#0077ed]"
                >
                  <Plus className="w-4 h-4" />
                  Add Field
                </button>
              </div>
              
              {customFields.length === 0 ? (
                <p className="text-[13px] text-[#86868b]">
                  Add custom fields for any additional information
                </p>
              ) : (
                <div className="space-y-3">
                  {customFields.map((field) => (
                    <div key={field.id} className="flex gap-2">
                      <input
                        type="text"
                        value={field.name}
                        onChange={(e) => updateCustomField(field.id, 'name', e.target.value)}
                        placeholder="Field name"
                        className="flex-1 h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                      />
                      <input
                        type="text"
                        value={field.value}
                        onChange={(e) => updateCustomField(field.id, 'value', e.target.value)}
                        placeholder="Value"
                        className="flex-1 h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                      />
                      <button
                        type="button"
                        onClick={() => removeCustomField(field.id)}
                        className="w-10 h-10 flex items-center justify-center text-[#ff3b30] hover:bg-[#ff3b30]/10 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || selectedOrderIds.length === 0}
              className="w-full h-12 flex items-center justify-center gap-2 text-white text-[14px] font-medium rounded-xl transition-colors disabled:bg-[#d2d2d7] disabled:cursor-not-allowed"
              style={{ 
                backgroundColor: selectedOrderIds.length > 0 ? selectedMethod.color : undefined,
              }}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <MethodIcon className="w-5 h-5" />
                  Create Shipment
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
